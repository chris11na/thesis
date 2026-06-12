"""
Pytest loads this file before test modules.

Tests used to share ./app.db with the running API; they create users (apitest-*,
orphan-*, reg-*) and those rows stayed in the dev database — the admin UI then
showed dozens of fake accounts.

Force an isolated SQLite file for the whole test session and migrate it.
"""
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_TEST_DB = (_ROOT / ".pytest_isolated.db").resolve()
os.environ["DATABASE_URL"] = "sqlite:///" + _TEST_DB.as_posix()
os.environ.setdefault("SEED_EQUIPMENT_CATALOG", "0")

from alembic import command
from alembic.config import Config

_alembic_ini = _ROOT / "alembic.ini"
if _alembic_ini.is_file():
    command.upgrade(Config(str(_alembic_ini)), "head")

if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
