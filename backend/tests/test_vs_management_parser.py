from app.services.vs_management_parser import parse_vs_management_product


def test_parse_vs_management_system_virtual() -> None:
    parsed = parse_vs_management_product(
        name="VS-V",
        description="Система управления и мониторинга V-Sense, виртуальная машина",
    )
    assert parsed == {"vs_item_type": "management_system"}


def test_parse_vs_management_system_hardware() -> None:
    parsed = parse_vs_management_product(
        name="VS-H",
        description="Система управления и мониторинга V-Sense, сервер",
    )
    assert parsed == {"vs_item_type": "management_system"}


def test_parse_vs_connection_certificate_single() -> None:
    parsed = parse_vs_management_product(
        name="VS-1",
        description="Сертификат на право подключения одного устройства в систему управления и мониторинга V-Sense",
    )
    assert parsed == {"vs_item_type": "connection_certificate"}


def test_parse_vs_connection_certificate_bulk() -> None:
    parsed = parse_vs_management_product(
        name="VS-10",
        description="Сертификат на право подключения десяти устройств в систему управления и мониторинга V-Sense",
    )
    assert parsed == {"vs_item_type": "connection_certificate"}
