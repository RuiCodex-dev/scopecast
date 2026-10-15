"""Writes video/out/Scopecast-demo.srt from the caption clips in video/hyperframes/index.html."""
import html
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
src = (HERE / "hyperframes" / "index.html").read_text(encoding="utf-8")
rows = re.findall(r'class="cap clip" data-start="([\d.]+)" data-duration="([\d.]+)"[^>]*><span>([^<]*)</span>', src)


def ts(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


out = []
for i, (s, d, text) in enumerate(rows, 1):
    s, d = float(s), float(d)
    out.append(f"{i}\n{ts(s)} --> {ts(s + d)}\n{html.unescape(text)}\n")
(HERE / "out").mkdir(exist_ok=True)
(HERE / "out" / "Scopecast-demo.srt").write_text("\n".join(out), encoding="utf-8")
print(len(rows), "captions")
