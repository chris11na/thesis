"""Split js/index.js into core.js, api.js, configurator.js, admin.js, and bootstrap index.js."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "js"
SOURCE = JS / "index.monolith.js"
OUTPUT_FILES = ("core.js", "api.js", "configurator.js", "admin.js", "index.js")

# 1-based inclusive line ranges per output file (must cover entire source once).
RANGES: dict[str, list[tuple[int, int]]] = {
    "core.js": [
        (1, 1086),
        (1534, 1587),
        (2446, 2463),
        (3625, 3629),
        (6361, 6406),
    ],
    "api.js": [
        (2406, 2445),
        (6177, 6360),
    ],
    "configurator.js": [
        (1087, 1533),
        (1588, 1601),
        (1602, 2405),
        (2542, 3129),
        (6407, 7551),
    ],
    "admin.js": [
        (2464, 2541),
        (3130, 3624),
        (3630, 6176),
    ],
    "index.js": [
        (7552, 7870),
    ],
}

HEADERS: dict[str, str] = {
    "core.js": "// Shared constants, DOM refs, i18n, catalog state, and UI helpers.\n",
    "api.js": "// Auth tokens, JWT helpers, and apiFetch.\n",
    "configurator.js": "// User catalog navigation, selection state, and configuration submit flow.\n",
    "admin.js": "// Admin panel: companies, users, catalog editor, submissions.\n",
    "index.js": "// Bootstrap: init(), event wiring, DOMContentLoaded.\n",
}


def extract_lines(lines: list[str], ranges: list[tuple[int, int]]) -> str:
    chunks: list[str] = []
    for start, end in ranges:
        chunks.append("".join(lines[start - 1 : end]))
    return "".join(chunks)


def verify_coverage(total: int) -> None:
    covered = [False] * total
    for ranges in RANGES.values():
        for start, end in ranges:
            for i in range(start, end + 1):
                if covered[i - 1]:
                    raise SystemExit(f"Line {i} assigned twice")
                covered[i - 1] = True
    missing = [i + 1 for i, ok in enumerate(covered) if not ok]
    if missing:
        raise SystemExit(f"Uncovered lines: {missing[:20]}{'...' if len(missing) > 20 else ''}")


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(
            f"Missing {SOURCE.name}. Keep the original monolith as js/index.monolith.js "
            "before running this script."
        )
    source_text = SOURCE.read_text(encoding="utf-8")
    lines = source_text.splitlines(keepends=True)
    verify_coverage(len(lines))

    for name in OUTPUT_FILES:
        ranges = RANGES[name]
        body = extract_lines(lines, ranges)
        header = HEADERS[name]
        (JS / name).write_text(header + body, encoding="utf-8")
        print(f"{name}: {body.count(chr(10)) + 1} lines")

    print("Split complete. Load order: core -> api -> configurator -> admin -> index")


if __name__ == "__main__":
    main()
