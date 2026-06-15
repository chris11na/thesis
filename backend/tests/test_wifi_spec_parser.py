from app.services.wifi_accessory_parser import parse_wifi_accessory_product
from app.services.wifi_equipment_parser import parse_wifi_equipment_product


def test_parse_wifi_controller() -> None:
    parsed = parse_wifi_equipment_product(
        name="VNC-2000",
        description="Контроллер беспроводного доступа VNC-2000",
        product_category="VNC",
        section_title="Контроллеры беспроводного доступа",
    )
    assert parsed == {"wifi_device_type": "controller"}


def test_parse_wifi_access_point() -> None:
    parsed = parse_wifi_equipment_product(
        name="VAP300-2X2i",
        description="Точка беспроводного доступа для работы внутри помещений",
        product_category="VAP",
        section_title="Точки беспроводного доступа",
    )
    assert parsed == {"wifi_device_type": "access_point"}


def test_parse_wifi_connection_certificate() -> None:
    parsed = parse_wifi_equipment_product(
        name="VNC-L-16AP",
        description="Сертификат на подключение 16 точек беспроводного доступа",
        product_category="VNC",
        section_title="Контроллеры беспроводного доступа",
    )
    assert parsed == {"wifi_device_type": "connection_certificate"}


def test_parse_wifi_antenna_accessory() -> None:
    parsed = parse_wifi_accessory_product(
        name="VAP-2458-OMNI",
        description="Антенна для работы вне помещений, всенаправленная 4х4 MIMO",
    )
    assert parsed == {"wifi_accessory_kind": "antenna"}


def test_parse_wifi_enclosure_accessory() -> None:
    parsed = parse_wifi_accessory_product(
        name="VAP-BOX-255",
        description="Всепогодный корпус для точки доступа 205х255х112",
    )
    assert parsed == {"wifi_accessory_kind": "enclosure"}
