"""
Rule engine — entry point for configuration logic driven by data, not product labels.

Device class (controller, switch, …) and option shape (license vs module) must not
hardcode behavior; see DOMAIN_RULES.md for the target Rule(FILTER|QUANTITY|CALCULATION|COMPATIBILITY)
model and how this codebase maps it onto Product fields + Module/License rows.

Admin sets links and constraint fields; validation lives in the exported functions below.
"""

from app.services.compatibility_service import (
    is_configuration_compatible,
    is_configuration_compatible_typed,
)
from app.services.config_validation import (
    suggest_license_packs,
    validate_structured_lines,
)
from app.services.product_rules_runtime import (
    effective_built_in_license_units,
    effective_max_module_slots,
    effective_speed_allowlist,
)
from app.services.speed_allowlist import parse_speed_allowlist_json

__all__ = [
    "effective_built_in_license_units",
    "effective_max_module_slots",
    "effective_speed_allowlist",
    "is_configuration_compatible",
    "is_configuration_compatible_typed",
    "parse_speed_allowlist_json",
    "suggest_license_packs",
    "validate_structured_lines",
]
