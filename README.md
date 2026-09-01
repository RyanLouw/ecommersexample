# VoltCart ecommerce and inventory starter

VoltCart is a Docker-ready computer-parts store with a React frontend and a **Python FastAPI backend**. The API owns product data, inventory, orders, and Stripe payments; the browser never talks directly to the database or receives a payment secret.

## Why FastAPI instead of Node.js?

The backend now uses **Python with FastAPI**. The React frontend still uses TypeScript, but no business, database, inventory, or payment code runs in backend JavaScript. FastAPI provides typed request validation through Pydantic, automatic API documentation at `/docs`, straightforward SQLite access, and official Stripe SDK support.

C# with ASP.NET Core would also be a strong backend. It offers excellent compile-time typing and Entity Framework migrations, but requires a larger rewrite and runtime for this small starter. FastAPI is the smaller transition from the current project while honoring the requirement to avoid backend JavaScript.

## Run everything in Docker

Docker builds the website and API into one image. SQLite is mounted in a named volume, so inventory and sales survive container replacement.

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8080` for the store or `http://localhost:8080/admin` for product management. Check the API with `http://localhost:8080/api/health`.

By default `SEED_DATABASE=false`, so a new production database is **blank**. To intentionally load the four demo products:

```bash
SEED_DATABASE=true docker compose up --build
```

The seed is idempotent, so running it again will not duplicate demo products. Do not enable it in production. To remove all local Docker data and start with an entirely new database, run `docker compose down -v` (this permanently deletes local store data).

## Migrations

Every application start runs `server/migrate.py` before serving requests. It applies the ordered SQL files in `server/migrations` once and records each filename in `schema_migrations`. Existing sales and inventory are retained when a future migration is added.

For local development without Docker:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m server.migrate
uvicorn server.main:app --reload --port 3001  # terminal 1
npm install && npm run dev                    # terminal 2
```

Use `python -m server.seed` only when you deliberately want demo data. Add future schema changes as `server/migrations/002_description.sql`, `003_description.sql`, and so on; never edit an already-applied production migration. FastAPI also provides interactive API documentation at `http://localhost:3001/docs`.

## Proposed database design

| Table | Purpose |
| --- | --- |
| `products` | SKU, catalog details, price in integer cents, current stock, reorder threshold, and active state |
| `inventory_movements` | Auditable stock ledger for purchases, sales, returns, damage, and manual adjustments |
| `customers` / `addresses` | Customer identity plus billing and shipping addresses |
| `orders` | Immutable sale totals and fulfillment status |
| `order_items` | Snapshot of the purchased SKU, name, quantity, and price so old receipts never change |
| `payments` | Stripe session/payment IDs and payment status; no card numbers are stored |
| `webhook_events` | Stripe event IDs for safe, idempotent webhook processing |
| `schema_migrations` | Which database migrations have been applied |

SQLite is appropriate for a small shop running one application instance. For multiple servers, high order volume, or detailed warehouse concurrency, keep this schema but migrate to managed PostgreSQL before launch.

## Product and inventory flow

Visit `/admin` to add a product with its name, category, price, stock, image, and description. Admin calls are currently intentionally simple for development. **Add authentication and an administrator role before exposing this application publicly.**

Stock is not accepted from the customer browser. At checkout the API reloads products and prices from the database and verifies availability. After Stripe confirms payment through its signed webhook, the API creates the order and payment, reduces `stock_quantity`, and writes a negative `inventory_movements` record in one database transaction.

A next iteration should add admin screens for receiving purchase stock, adjustments, low-stock alerts, refunds, shipping, and order history. Those actions should always create inventory ledger entries rather than silently changing stock.

## Payment flow

1. The cart sends only product IDs and quantities to `POST /api/checkout`.
2. The API obtains trusted prices and stock from SQLite and creates a Stripe-hosted Checkout Session.
3. Stripe collects card and address details; VoltCart never stores card numbers.
4. Stripe calls `POST /api/webhooks/stripe` with a signed `checkout.session.completed` event.
5. The API verifies the signature, ignores duplicate event IDs, then creates the paid order, payment, order items, and inventory movements transactionally.
6. Fulfillment begins only after the signed webhook records the order as paid—not merely because the shopper returned to the success URL.

For testing, put an `sk_test_...` key and webhook `whsec_...` secret in `.env`. Use Stripe CLI forwarding to `localhost:8080/api/webhooks/stripe`. Stripe test card `4242 4242 4242 4242`, any future expiry, and any three-digit CVC moves no real money.

Before going live, use live Stripe keys through your deployment platform's secret manager, configure the public HTTPS webhook, add authentication, backups, taxes, shipping calculation, refund handling, email receipts, and monitoring.
