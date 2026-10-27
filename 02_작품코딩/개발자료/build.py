"""Rebuild app.js, preserving the original bubble drawing functions in renderers.js."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=root/'개발자료'
app=(source/'app-main.js').read_text(encoding='utf-8').replace('/* SHARED_RENDERERS */',(source/'renderers.js').read_text(encoding='utf-8'))
(root/'app.js').write_text(app,encoding='utf-8')
