"""
Pytest loads this file before test modules.

Tests use an isolated SQLite file. Production seed loads the real catalog (id 1000+);
pytest also inserts fixed-id sample products 501/502 for configuration API tests.
"""
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_TEST_DB = (_ROOT / ".pytest_isolated.db").resolve()
if _TEST_DB.is_file():
    _TEST_DB.unlink()

os.environ["DATABASE_URL"] = "sqlite:///" + _TEST_DB.as_posix()
os.environ.setdefault("SEED_EQUIPMENT_CATALOG", "0")

from alembic import command
from alembic.config import Config

_alembic_ini = _ROOT / "alembic.ini"
if _alembic_ini.is_file():
    command.upgrade(Config(str(_alembic_ini)), "head")

if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.db.seed import seed_initial_data
from app.db.session import SessionLocal
from tests.support.configurator_sample import ensure_configurator_sample_products

_db = SessionLocal()
try:
    seed_initial_data(_db)
    ensure_configurator_sample_products(_db)
    _db.commit()
finally:
    _db.close()

from app.main import app  # noqa: F401 — import after DB is seeded
