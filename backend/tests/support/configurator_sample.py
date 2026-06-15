"""Minimal configurator products for automated tests (not seeded in production)."""

from sqlalchemy.orm import Session

from app.models.license import License
from app.models.module import Module
from app.models.product import Product


CONTROLLER_PRODUCT_ID = 501
SWITCH_PRODUCT_ID = 502


def ensure_configurator_sample_products(db: Session) -> None:
    """Insert fixed-id sample products used by API tests when demo seed is disabled."""
    if db.query(Product).filter(Product.id == CONTROLLER_PRODUCT_ID).first() is None:
        db.add(
            Product(
                id=CONTROLLER_PRODUCT_ID,
                name="Test WLAN Controller",
                description="Access point management; licensing by AP count.",
                technical_specs="16 AP built in; additional capacity via license packs.",
                product_kind="equipment",
                product_category="VNC",
                built_in_license_units=16,
                module_speeds_json=None,
                max_module_slots=None,
            )
        )
        db.add(
            Product(
                id=SWITCH_PRODUCT_ID,
                name="Test L2/L3 Switch",
                description="Optical transceivers only at speeds supported by this chassis.",
                technical_specs="Up to 8 SFP/SFP+ slots; 1 and 10 Gbps only.",
                product_kind="equipment",
                product_category="VA",
                built_in_license_units=None,
                module_speeds_json="[1, 10]",
                max_module_slots=8,
            )
        )
        db.flush()

        for lid, lname, units in [
            (521, "AP licenses, pack x16", 16),
            (522, "AP licenses, pack x32", 32),
            (523, "AP licenses, pack x128", 128),
        ]:
            if db.query(License).filter(License.id == lid).first() is None:
                db.add(
                    License(
                        id=lid,
                        name=lname,
                        product_id=CONTROLLER_PRODUCT_ID,
                        units_per_pack=units,
                    )
                )

        for mid, mname, speed, ff, mx in [
            (511, "1G SFP transceiver", 1, "SFP", 8),
            (512, "10G SFP+ transceiver", 10, "SFP+", 8),
            (513, "25G SFP28 transceiver (incompatible)", 25, "SFP28", 8),
        ]:
            if db.query(Module).filter(Module.id == mid).first() is None:
                db.add(
                    Module(
                        id=mid,
                        name=mname,
                        product_id=SWITCH_PRODUCT_ID,
                        speed_gbps=speed,
                        form_factor=ff,
                        max_quantity=mx,
                    )
                )

    db.flush()
