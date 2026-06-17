"""Split monolithic index.html into css/index.css, js/index.js, and slim index.html."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def dedent_block(block_lines: list[str]) -> str:
    out: list[str] = []
    for line in block_lines:
        if line.startswith("      ") and line.strip():
            out.append(line[6:])
        else:
            out.append(line)
    return "".join(out)


def main() -> None:
    lines = INDEX.read_text(encoding="utf-8").splitlines(keepends=True)

    style_start = next(i for i, line in enumerate(lines) if line.strip() == "<style>")
    style_end = next(i for i, line in enumerate(lines) if line.strip() == "</style>")
    body_start = next(i for i, line in enumerate(lines) if line.strip() == "<body>")
    api_script_idx = next(
        i for i, line in enumerate(lines) if "api-config.js" in line and "<script" in line
    )
    script_inline_start = next(
        i
        for i, line in enumerate(lines)
        if i > api_script_idx and line.strip() == "<script>"
    )
    script_end = next(
        i for i, line in enumerate(lines) if line.strip() == "</script>" and i > script_inline_start
    )

    css = dedent_block(lines[style_start + 1 : style_end])
    js = dedent_block(lines[script_inline_start + 1 : script_end])
    body = "".join(lines[body_start:api_script_idx])

    head = (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n'
        "  <head>\n"
        '    <meta charset="UTF-8" />\n'
        "    <title>Конфигуратор</title>\n"
        '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        '    <link rel="stylesheet" href="css/index.css" />\n'
        "  </head>\n"
    )
    footer = (
        '    <script src="api-config.js"></script>\n'
        '    <script src="js/index.js"></script>\n'
        "  </body>\n"
        "</html>\n"
    )

    (ROOT / "css").mkdir(exist_ok=True)
    (ROOT / "js").mkdir(exist_ok=True)
    (ROOT / "css" / "index.css").write_text(css, encoding="utf-8")
    (ROOT / "js" / "index.js").write_text(js, encoding="utf-8")
    INDEX.write_text(head + body + footer, encoding="utf-8")

    print(f"css: {css.count(chr(10)) + 1} lines")
    print(f"js: {js.count(chr(10)) + 1} lines")
    print(f"html: {(head + body + footer).count(chr(10)) + 1} lines")


if __name__ == "__main__":
    main()
