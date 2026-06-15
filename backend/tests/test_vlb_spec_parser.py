from app.services.vlb_equipment_parser import parse_vlb_equipment_product


def test_parse_vlb_traffic_server() -> None:
    parsed = parse_vlb_equipment_product(
        name="VLB08-010G-A",
        description="Сервер балансировки трафика приложений 10Гбит/с",
    )
    assert parsed == {"vlb_device_type": "traffic_server"}


def test_parse_vlb_virtual_server() -> None:
    parsed = parse_vlb_equipment_product(
        name="VLB10-005G-V",
        description="Виртуальный сервер балансировки трафика приложений 5Гбит/с",
    )
    assert parsed == {"vlb_device_type": "virtual_server"}


def test_parse_vlb_interface_module() -> None:
    parsed = parse_vlb_equipment_product(
        name="VLB-4P-10G-SFP",
        description="Интерфейсный модуль для сервер балансировки трафика приложений 4 порта 10Гбит/с",
    )
    assert parsed == {"vlb_device_type": "interface_module"}
