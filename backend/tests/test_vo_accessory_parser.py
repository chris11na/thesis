from app.services.vo_accessory_parser import parse_vo_accessory_description


def test_parse_vo_cable_description() -> None:
    parsed = parse_vo_accessory_description(
        "Кабель 100 Gigabit Ethernet QSFP28 5 метров"
    )
    assert parsed == {"vo_item_type": "cable"}


def test_parse_vo_active_cable_description() -> None:
    parsed = parse_vo_accessory_description(
        "Кабель активный 40 Gigabit Ethernet QSFP+ 1 метр"
    )
    assert parsed == {"vo_item_type": "cable"}


def test_parse_vo_module_description() -> None:
    parsed = parse_vo_accessory_description(
        "Модуль 100Gb CWDM 2км SMF QSFP28 LC"
    )
    assert parsed == {"vo_item_type": "module"}


def test_parse_vo_adapter_has_no_item_type() -> None:
    parsed = parse_vo_accessory_description("Адаптер для изменения QSFP+ на SFP+")
    assert parsed == {}
