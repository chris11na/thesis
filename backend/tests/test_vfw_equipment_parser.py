from app.services.vfw_equipment_parser import parse_vfw_equipment_product


def test_parse_vfw_firewall() -> None:
    parsed = parse_vfw_equipment_product(
        name="VFW4100-8T-2S",
        description="Межсетевой экран производительностью до 2,1Гбит/с",
    )
    assert parsed == {"vfw_item_type": "firewall"}


def test_parse_vfw_update_certificate() -> None:
    parsed = parse_vfw_equipment_product(
        name="VFW4100-USG",
        description="Сертификат на право получения обновления всех USG сигнатур на 1 год",
    )
    assert parsed == {"vfw_item_type": "certificate"}


def test_parse_vfw_ssl_certificate() -> None:
    parsed = parse_vfw_equipment_product(
        name="VFW-SSL-10",
        description="Сертификат на функциональность включения 10 сессий IPSEC/SSL VPN",
    )
    assert parsed == {"vfw_item_type": "certificate"}
