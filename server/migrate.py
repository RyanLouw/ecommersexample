import os
from pathlib import Path

from server.database import transaction
from server.seed import seed_database


def migrate() -> None:
    migration_dir = Path(__file__).parent / "migrations"
    with transaction() as database:
        database.execute("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        applied = {row[0] for row in database.execute("SELECT name FROM schema_migrations")}
        for path in sorted(migration_dir.glob("*.sql")):
            if path.name in applied:
                continue
            database.executescript(path.read_text())
            database.execute("INSERT INTO schema_migrations (name) VALUES (?)", (path.name,))
            print(f"Applied migration {path.name}")

    if os.getenv("SEED_DATABASE", "false").lower() == "true":
        seed_database()
    else:
        print("Seed skipped (set SEED_DATABASE=true to add demo products)")


if __name__ == "__main__":
    migrate()
