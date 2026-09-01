from server.database import transaction

PRODUCTS = [
    ("GPU-4070S-12G", "RTX 4070 SUPER 12GB", "rtx-4070-super-12gb", "Graphics Cards", "High-performance graphics for gaming and creation.", 59999, 12, "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85"),
    ("CPU-R7-7800X3D", "Ryzen 7 7800X3D", "ryzen-7-7800x3d", "Processors", "Eight-core gaming processor with 3D V-Cache.", 35999, 18, "https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=900&q=85"),
    ("KEY-TKL-PRO", "Mechanical TKL Pro", "mechanical-tkl-pro", "Peripherals", "Compact mechanical keyboard for work and play.", 12999, 32, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85"),
    ("SSD-NVME-G4-2T", "NVMe Gen4 2TB SSD", "nvme-gen4-2tb", "Storage", "Fast Gen4 storage with a five-year warranty.", 14999, 25, "https://images.unsplash.com/photo-1628557118391-56cd62c9f2cb?auto=format&fit=crop&w=900&q=85"),
]


def seed_database() -> None:
    with transaction() as database:
        database.executemany("INSERT OR IGNORE INTO products (sku, name, slug, category, description, price_cents, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", PRODUCTS)
    print("Demo seed checked; existing SKUs were not duplicated")


if __name__ == "__main__":
    seed_database()
