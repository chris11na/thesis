from app.db.session import SessionLocal
from app.db.seed import seed_initial_data
from app.services.compatibility_service import is_configuration_compatible


def test_compatibility_service_flags_forbidden_seeded_product() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
        ok, reason = is_configuration_compatible(db, selected_item_ids=[103])
        assert ok is False
        assert reason is not None
    finally:
        db.close()


def test_compatibility_service_accepts_allowed_product() -> None:
    db = SessionLocal()
    try:
        seed_initial_data(db)
        ok, reason = is_configuration_compatible(db, selected_item_ids=[101])
        assert ok is True
        assert reason is None
    finally:
        db.close()
