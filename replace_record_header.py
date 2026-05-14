from pathlib import Path
path = Path('web/game/wuthering_waves.html')
text = path.read_text(encoding='utf-8')
old = """\t\t\t\t\t\t<div class=\"record-actions\">\n\t\t\t\t\t\t\t<span id=\"record-count\" class=\"record-count\">0</span>\n\t\t\t\t\t\t\t<label class=\"search-box\">\n\t\t\t\t\t\t\t\t<input id=\"search-input\" type=\"search\" placeholder=\"검색하기\" aria-label=\"검색하기\" />\n\t\t\t\t\t\t\t</label>\n\t\t\t\t\t\t</div>\n"""
new = """\t\t\t\t\t\t<span id=\"record-count\" class=\"record-count\">0</span>\n\t\t\t\t\t\t<label class=\"search-box\">\n\t\t\t\t\t\t\t<input id=\"search-input\" type=\"search\" placeholder=\"검색하기\" aria-label=\"검색하기\" />\n\t\t\t\t\t\t</label>\n"""
if old not in text:
    print('OLD_NOT_FOUND')
else:
    path.write_text(text.replace(old, new), encoding='utf-8')
    print('REPLACED')
