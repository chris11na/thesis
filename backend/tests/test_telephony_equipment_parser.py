from app.services.telephony_equipment_parser import parse_telephony_equipment_product


def test_parse_telephony_communication_manager() -> None:
    parsed = parse_telephony_equipment_product(
        name="VCM-500-H",
        description="Вектор Communication Manager аппаратная АТС до 500 пользователей",
        type_code="VCM",
    )
    assert parsed == {"telephony_item_type": "communication_manager"}


def test_parse_telephony_expansion_module() -> None:
    parsed = parse_telephony_equipment_product(
        name="VCM-8FXS",
        description="Модуль расширения 8 портов FXS для VCM-500-H/VCM-1000-H",
        type_code="VCM",
    )
    assert parsed == {"telephony_item_type": "expansion_module"}


def test_parse_telephony_certificate() -> None:
    parsed = parse_telephony_equipment_product(
        name="VCM-APL1",
        description="Сертификат на право получения стандартной технической поддержки",
        type_code="VCM",
    )
    assert parsed == {"telephony_item_type": "certificate"}


def test_parse_telephony_ip_phone() -> None:
    parsed = parse_telephony_equipment_product(
        name="VP-120",
        description="IP-телефон Vector Phone 120. 2 порта 10/100Мбит/с RJ-45",
        type_code="VP",
    )
    assert parsed == {"telephony_item_type": "ip_phone"}
