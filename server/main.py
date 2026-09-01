import json
import os
import re
import time
from pathlib import Path

import stripe
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl

from server.database import connect, transaction
from server.migrate import migrate

migrate()
app = FastAPI(title="VoltCart API", version="1.0.0")


class ProductInput(BaseModel):
    sku: str | None = None
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=100)
    description: str = ""
    price: float = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    image: HttpUrl
    active: bool = True


class CartItem(BaseModel):
    id: int
    quantity: int = Field(ge=1, le=100)


class CheckoutInput(BaseModel):
    items: list[CartItem] = Field(min_length=1)


def product_json(row):
    product = dict(row)
    product.update(price=product["price_cents"] / 100, stock=product["stock_quantity"], image=product["image_url"], active=bool(product["active"]))
    return product


@app.get("/api/health")
def health():
    return {"status": "ok", "backend": "FastAPI"}


@app.get("/api/products")
def products():
    with connect() as database:
        return [product_json(row) for row in database.execute("SELECT * FROM products WHERE active = 1 ORDER BY id DESC")]


@app.get("/api/admin/products")
def admin_products():
    with connect() as database:
        return [product_json(row) for row in database.execute("SELECT * FROM products ORDER BY id DESC")]


@app.post("/api/admin/products", status_code=201)
def add_product(product: ProductInput):
    sku = product.sku or f"SKU-{int(time.time() * 1000)}"
    slug = re.sub(r"[^a-z0-9]+", "-", product.name.lower()).strip("-") + f"-{int(time.time())}"
    try:
        with transaction() as database:
            cursor = database.execute("INSERT INTO products (sku, slug, name, category, description, price_cents, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (sku, slug, product.name, product.category, product.description, round(product.price * 100), product.stock, str(product.image)))
        return {"id": cursor.lastrowid}
    except Exception as error:
        raise HTTPException(409, "SKU or product slug already exists") from error


@app.put("/api/admin/products/{product_id}")
def update_product(product_id: int, product: ProductInput):
    with transaction() as database:
        cursor = database.execute("UPDATE products SET name=?, category=?, description=?, price_cents=?, stock_quantity=?, image_url=?, active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (product.name, product.category, product.description, round(product.price * 100), product.stock, str(product.image), product.active, product_id))
    if not cursor.rowcount:
        raise HTTPException(404, "Product not found")
    return {"ok": True}


@app.delete("/api/admin/products/{product_id}")
def delete_product(product_id: int):
    with transaction() as database:
        cursor = database.execute("UPDATE products SET active = 0 WHERE id = ?", (product_id,))
    if not cursor.rowcount:
        raise HTTPException(404, "Product not found")
    return {"ok": True}


@app.get("/api/admin/orders")
def orders():
    with connect() as database:
        return [dict(row) for row in database.execute("SELECT * FROM orders ORDER BY id DESC")]


@app.post("/api/checkout")
def checkout(cart: CheckoutInput):
    secret = os.getenv("STRIPE_SECRET_KEY")
    if not secret:
        raise HTTPException(503, "Add STRIPE_SECRET_KEY to enable Stripe Checkout")
    stripe.api_key = secret
    with connect() as database:
        selected = []
        for item in cart.items:
            product = database.execute("SELECT * FROM products WHERE id=? AND active=1", (item.id,)).fetchone()
            if not product:
                raise HTTPException(400, "A product is unavailable")
            if item.quantity > product["stock_quantity"]:
                raise HTTPException(409, f"Not enough stock for {product['name']}")
            selected.append((product, item.quantity))
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"quantity": quantity, "price_data": {"currency": "usd", "unit_amount": product["price_cents"], "product_data": {"name": product["name"], "images": [product["image_url"]]}}} for product, quantity in selected],
        metadata={"items": json.dumps([{"id": product["id"], "quantity": quantity} for product, quantity in selected])},
        success_url=f"{os.getenv('STORE_URL', 'http://localhost:5173')}?checkout=success",
        cancel_url=f"{os.getenv('STORE_URL', 'http://localhost:5173')}?checkout=cancelled",
    )
    return {"url": session.url}


@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    try:
        event = stripe.Webhook.construct_event(await request.body(), request.headers.get("stripe-signature"), os.environ["STRIPE_WEBHOOK_SECRET"])
    except (ValueError, stripe.error.SignatureVerificationError, KeyError) as error:
        raise HTTPException(400, "Invalid webhook signature") from error
    with connect() as database:
        if database.execute("SELECT 1 FROM webhook_events WHERE event_id=?", (event["id"],)).fetchone():
            return {"received": True}
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        items = json.loads(session["metadata"]["items"])
        with transaction() as database:
            order_number = f"VC-{int(time.time() * 1000)}"
            customer_details = session.get("customer_details") or {}
            cursor = database.execute("INSERT INTO orders (order_number, email, subtotal_cents, total_cents, status) VALUES (?, ?, ?, ?, 'paid')", (order_number, customer_details.get("email", "unknown"), session.get("amount_subtotal", 0), session.get("amount_total", 0)))
            order_id = cursor.lastrowid
            for item in items:
                product = database.execute("SELECT * FROM products WHERE id=?", (item["id"],)).fetchone()
                updated = database.execute("UPDATE products SET stock_quantity=stock_quantity-? WHERE id=? AND stock_quantity>=?", (item["quantity"], item["id"], item["quantity"]))
                if not product or updated.rowcount != 1:
                    raise HTTPException(409, "Insufficient inventory")
                database.execute("INSERT INTO order_items (order_id, product_id, sku, product_name, quantity, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?, ?, ?)", (order_id, product["id"], product["sku"], product["name"], item["quantity"], product["price_cents"], product["price_cents"] * item["quantity"]))
                database.execute("INSERT INTO inventory_movements (product_id, order_id, quantity_change, reason) VALUES (?, ?, ?, 'sale')", (product["id"], order_id, -item["quantity"]))
            database.execute("INSERT INTO payments (order_id, provider_session_id, provider_payment_id, amount_cents, currency, status) VALUES (?, ?, ?, ?, ?, 'paid')", (order_id, session["id"], str(session.get("payment_intent", "")), session.get("amount_total", 0), session.get("currency", "usd")))
            database.execute("INSERT INTO webhook_events (provider, event_id, event_type) VALUES ('stripe', ?, ?)", (event["id"], event["type"]))
    return {"received": True}


frontend = Path("dist")
if frontend.exists():
    app.mount("/assets", StaticFiles(directory=frontend / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend_route(path: str):
        candidate = frontend / path
        return FileResponse(candidate if candidate.is_file() else frontend / "index.html")
