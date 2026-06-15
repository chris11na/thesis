from app.services.switch_spec_parser import parse_switch_description


def test_access_switch_24t_4x() -> None:
    desc = (
        "Управляемый коммутатор уровня 2. "
        "24 порта 100/1000BaseT RJ45, 4 порта 1/10GE SFP+"
    )
    assert parse_switch_description(desc) == {
        "switch_layer": "2",
        "rj45_ports": "24",
        "copper_speed": "100/1000",
        "poe_plus": "нет",
        "optic_ports": "4",
        "optic_speed": "1/10g",
        "combo_ports": "0",
    }


def test_poe_switch_24p_4x() -> None:
    desc = (
        "Управляемый POE коммутатор уровня 2. "
        "24 порта 10/100/1000Base-T с поддержкой POE+, 4 порта 1/10G SFP+"
    )
    parsed = parse_switch_description(desc)
    assert parsed["switch_layer"] == "2"
    assert parsed["rj45_ports"] == "24"
    assert parsed["copper_speed"] == "10/100/1000"
    assert parsed["poe_plus"] == "да"
    assert parsed["optic_ports"] == "4"
    assert parsed["optic_speed"] == "1/10g"
    assert parsed["combo_ports"] == "0"


def test_combo_and_layer3() -> None:
    desc = (
        "Управляемый PoE+ коммутатор уровня 3. "
        "20 портов 10/100/1000Base-T RJ45 с поддержкой POE+, "
        "4 Combo-порта GE и 4 порта 1/10G SFP+"
    )
    parsed = parse_switch_description(desc)
    assert parsed["switch_layer"] == "3"
    assert parsed["rj45_ports"] == "20"
    assert parsed["combo_ports"] == "4"
    assert parsed["poe_plus"] == "да"


def test_small_1g_sfp_uplinks() -> None:
    desc = (
        "Управляемый коммутатор уровня 2. "
        "8 портов 10/100/1000BaseT RJ45, 2 порта 1GE SFP"
    )
    parsed = parse_switch_description(desc)
    assert parsed["rj45_ports"] == "8"
    assert parsed["optic_ports"] == "2"
    assert parsed["optic_speed"] == "1g"
