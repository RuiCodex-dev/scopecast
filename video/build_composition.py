"""Builds video/hyperframes/index.html (the HyperFrames composition) from the scene table,
the narration word timings and the recorded captures.

usage: python video/build_composition.py
"""
import html
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
HF = HERE / "hyperframes"
MEDIA = HF / "media"

# id, start, duration, kind, extra
SCENES = [
    ("s1", 0.0, 7.0, "office", {}),
    ("s2", 7.0, 13.6, "bakery", {}),
    ("s3", 20.6, 6.0, "title", {}),
    ("s4", 26.6, 10.6, "cap", {"src": "cap_paste", "ms": 1.0, "rate": 1.0, "num": "01", "title": "Paste the list", "body": "Each line becomes a task. Bullets and numbering are cleaned up."}),
    ("s5", 37.2, 12.8, "cap", {"src": "cap_ranges", "ms": 1.0, "rate": 1.0, "num": "02", "title": "Range every task", "body": "Likely hours plus how familiar the work is: Known, Some unknowns, New territory."}),
    ("s6", 50.0, 16.6, "cap", {"src": "cap_dial", "ms": 0.6, "rate": 0.7, "num": "03", "title": "Choose how sure", "stat": "8,000 of 10,000", "statnote": "simulated runs finish within 142 hours: €12,050 at 80%", "zoom": (8.6, 14.2, "78% 34%", 1.42)}),
    ("s7", 66.6, 13.6, "cap", {"src": "cap_budget", "ms": 0.6, "rate": 0.7, "num": "04", "title": "Fit the budget", "stat": "€9,500", "statnote": "budget: two tasks move to phase 2, phase 1 quotes €9,400 at 80%", "zoom": (3.4, 9.6, "82% 88%", 1.45)}),
    ("s8", 80.2, 12.4, "cap", {"src": "cap_quote", "ms": 1.0, "rate": 1.0, "num": "05", "title": "Send the quote", "body": "Scope, fixed price, delivery, phase 2 and how it was estimated. One A4 page."}),
    ("s9", 92.6, 14.0, "process", {}),
    ("s10", 106.6, 6.4, "end", {}),
]
TOTAL = round(SCENES[-1][1] + SCENES[-1][2], 2)
VO_OFFSET = 0.5


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def captions() -> str:
    """Phrase-level captions from the TTS word boundaries."""
    out = []
    texts = {sc["id"]: sc["text"] for sc in json.loads((HERE / "narration.json").read_text(encoding="utf-8"))["scenes"]}
    for sid, start, dur, _, _ in SCENES:
        if sid == "s10":
            continue  # the end card already shows the line
        words = json.loads((MEDIA / f"vo_{sid}.json").read_text(encoding="utf-8"))
        # Restore punctuation: map each spoken word onto the next matching token of the script.
        tokens = texts[sid].split()
        key = lambda x: "".join(ch for ch in x.lower() if ch.isalnum())  # noqa: E731
        ti = 0
        for w in words:
            for j in range(ti, min(ti + 4, len(tokens))):
                if key(tokens[j]).startswith(key(w["w"])) or key(w["w"]).startswith(key(tokens[j])):
                    w["w"] = tokens[j]
                    ti = j + 1
                    break
        groups, cur = [], []
        for i, w in enumerate(words):
            cur.append(w)
            nxt = words[i + 1] if i + 1 < len(words) else None
            gap = (nxt["t"] - (w["t"] + w["d"])) if nxt else 1
            punct = w["w"][-1] in ".,:;?!"
            if len(cur) >= 9 or (punct and len(cur) >= 2) or gap > 0.28 or nxt is None:
                groups.append(cur)
                cur = []
        for g in groups:
            t0 = start + VO_OFFSET + g[0]["t"]
            t1 = start + VO_OFFSET + g[-1]["t"] + g[-1]["d"] + 0.18
            text = " ".join(x["w"] for x in g)
            out.append((t0, t1, text))
    # Never overlap: each caption ends where the next begins.
    rows = []
    for i, (t0, t1, text) in enumerate(out):
        if i + 1 < len(out):
            t1 = min(t1, out[i + 1][0])
        rows.append(
            f'      <div id="cap-{i + 1}" class="cap clip" data-start="{t0:.2f}" data-duration="{max(0.3, t1 - t0):.2f}" data-track-index="20"><span>{esc(text)}</span></div>'
        )
    return "\n".join(rows)


MARK = (
    '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#1F1C17"/>'
    '<path d="M7 24 C 13 24, 13.5 8.5, 25 8" stroke="#F3EEE4" stroke-width="2" fill="none" stroke-linecap="round"/>'
    '<line x1="19" y1="6" x2="19" y2="26" stroke="#B8502E" stroke-width="1.6" stroke-dasharray="1.5 2.2"/>'
    '<circle cx="19" cy="10.6" r="2.4" fill="#B8502E"/></svg>'
)


def scene_html(sid: str, start: float, dur: float, kind: str, x: dict) -> str:
    a = f'id="{sid}" class="scene clip" data-start="{start}" data-duration="{dur}" data-track-index="1"'
    if kind == "office":
        return f"""    <section {a}>
      <div class="plate"><img id="{sid}-img" src="img/plate-office.jpg" alt="" /></div>
      <div class="shade-left"></div>
      <div class="kicker" id="{sid}-k">Every freelancer knows this moment.</div>
      <h1 class="big-q" id="{sid}-q"><span>How much</span> <span>will it</span> <span>cost?</span></h1>
    </section>"""
    if kind == "bakery":
        rows = [("Visual design", "14 h"), ("Product catalogue", "12 h"), ("Order basket", "18 h"), ("Online payment", "14 h"), ("Order dashboard", "20 h"), ("Loyalty card", "16 h")]
        r = "\n".join(f'          <div class="sheet-row" id="{sid}-r{i}"><span>{esc(n)}</span><span>{h}</span></div>' for i, (n, h) in enumerate(rows))
        return f"""    <section {a}>
      <div class="plate"><img id="{sid}-img" src="img/plate-bakery.jpg" alt="" /></div>
      <div class="shade-right"></div>
      <div class="sheet-card" id="{sid}-card">
        <div class="sheet-title">Quote, the usual way</div>
{r}
          <div class="sheet-row sum" id="{sid}-plus"><span>Buffer</span><span>+ 20%</span></div>
          <div class="sheet-row hope" id="{sid}-hope"><span>Total</span><span>one number, and hope</span></div>
      </div>
    </section>"""
    if kind == "title":
        return f"""    <section {a}>
      <div class="paper"></div>
      <svg class="title-curve" viewBox="0 0 1920 1080" aria-hidden="true"><path id="{sid}-curve" d="M180 900 C 820 900, 900 230, 1740 210" fill="none" stroke="#CFC6B4" stroke-width="3"/></svg>
      <div class="title-lockup" id="{sid}-lock">{MARK}<span>Scopecast</span></div>
      <p class="title-tag" id="{sid}-tag">Quote fixed-price work with a confidence level <em>you</em> choose.</p>
    </section>"""
    if kind == "cap":
        side = (
            f'<div class="stat" id="{sid}-stat">{esc(x["stat"])}</div><p class="side-body" id="{sid}-body">{esc(x["statnote"])}</p>'
            if "stat" in x
            else f'<p class="side-body" id="{sid}-body">{esc(x["body"])}</p>'
        )
        return f"""    <section {a}>
      <div class="paper"></div>
      <div class="side">
        <div class="side-num" id="{sid}-num">{x["num"]}</div>
        <h2 class="side-title" id="{sid}-title">{esc(x["title"])}</h2>
        {side}
      </div>
      <div class="browser" id="{sid}-browser">
        <div class="chrome"><i></i><i></i><i></i><span>localhost:5173 · Scopecast</span></div>
        <div class="viewport"></div>
      </div>
    </section>"""
    if kind == "process":
        cards = [
            ("scope.md", "The unique kernel", "Quote at a confidence level you choose. When the budget is short, defer scope, never hours."),
            ("prd.md", "28 acceptance criteria", "Seven steps in the core journey, every empty and error state named before any code."),
            ("spec.md", "One useful unknown", "Is 10,000 runs enough? Test: the 80th percentile moves less than 1% across seeds."),
        ]
        c = "\n".join(
            f'        <div class="doc" id="{sid}-c{i}"><div class="doc-file">devpost/{f}</div><div class="doc-h">{esc(h)}</div><p>{esc(b)}</p></div>'
            for i, (f, h, b) in enumerate(cards)
        )
        return f"""    <section {a}>
      <div class="paper"></div>
      <div class="proc-head" id="{sid}-head"><span class="side-num">06</span><h2 class="side-title">Planned before it was built</h2><p class="side-body">With the Devpost Learn Skill Pack, in a coding agent.</p></div>
      <div class="docs">
{c}
      </div>
      <div class="proof" id="{sid}-proof"><span>5 verified slices</span><span>28 unit tests</span><span>16 browser checks</span><span>0 servers, 0 API keys</span></div>
    </section>"""
    if kind == "end":
        return f"""    <section {a}>
      <div class="plate"><img id="{sid}-img" src="img/plate-desk.jpg" alt="" /></div>
      <div class="end-card" id="{sid}-card">
        <div class="title-lockup small">{MARK}<span>Scopecast</span></div>
        <p class="end-tag">Quote a price you can stand behind.</p>
        <p class="end-meta">Made by Rui Codex, October 2026</p>
      </div>
    </section>"""
    raise ValueError(kind)


def timeline_js() -> str:
    js = []
    for sid, start, dur, kind, x in SCENES:
        s = start
        if kind in ("office", "bakery", "end"):
            js.append(f'tl.fromTo("#{sid}-img", {{scale: 1.0}}, {{scale: 1.07, duration: {dur}, ease: "none"}}, {s});')
        if kind == "office":
            js.append(f'tl.from("#{sid}-k", {{opacity: 0, y: 16, duration: 0.8, ease: "power2.out"}}, {s + 0.4});')
            js.append(f'tl.from("#{sid}-q span", {{opacity: 0, y: 30, duration: 0.7, stagger: 0.42, ease: "power3.out"}}, {s + 3.1});')
        if kind == "bakery":
            js.append(f'tl.from("#{sid}-card", {{opacity: 0, x: 40, duration: 0.8, ease: "power3.out"}}, {s + 0.5});')
            js.append(f'tl.from("#{sid}-card .sheet-row", {{opacity: 0, y: 10, duration: 0.4, stagger: 0.35, ease: "power2.out"}}, {s + 2.6});')
            js.append(f'tl.fromTo("#{sid}-hope", {{backgroundColor: "rgba(184,80,46,0)"}}, {{backgroundColor: "rgba(184,80,46,0.14)", duration: 0.6}}, {s + 6.4});')
        if kind == "title":
            js.append(f'tl.fromTo("#{sid}-curve", {{strokeDasharray: 2200, strokeDashoffset: 2200}}, {{strokeDashoffset: 0, duration: 2.4, ease: "power2.inOut"}}, {s});')
            js.append(f'tl.from("#{sid}-lock", {{opacity: 0, y: 24, duration: 0.9, ease: "power3.out"}}, {s + 0.3});')
            js.append(f'tl.from("#{sid}-tag", {{opacity: 0, y: 18, duration: 0.8, ease: "power2.out"}}, {s + 1.1});')
        if kind == "cap":
            js.append(f'tl.from("#{sid}-browser", {{opacity: 0, y: 30, duration: 0.7, ease: "power3.out"}}, {s + 0.1});')
            js.append(f'tl.from(["#{sid}-num", "#{sid}-title"], {{opacity: 0, x: -20, duration: 0.6, stagger: 0.12, ease: "power2.out"}}, {s + 0.3});')
            if "stat" in x:
                js.append(f'tl.from("#{sid}-stat", {{opacity: 0, y: 14, duration: 0.6, ease: "power2.out"}}, {s + 1.2});')
            js.append(f'tl.from("#{sid}-body", {{opacity: 0, y: 10, duration: 0.6, ease: "power2.out"}}, {s + 1.6});')
            if "zoom" in x:
                z0, z1, origin, sc = x["zoom"]
                js.append(f'tl.set("#{sid}-zoom", {{transformOrigin: "{origin}"}}, {s});')
                js.append(f'tl.to("#{sid}-zoom", {{scale: {sc}, duration: 1.1, ease: "power2.inOut"}}, {s + z0});')
                js.append(f'tl.to("#{sid}-zoom", {{scale: 1, duration: 1.0, ease: "power2.inOut"}}, {s + z1});')
        if kind == "process":
            js.append(f'tl.from("#{sid}-head", {{opacity: 0, y: 16, duration: 0.7, ease: "power2.out"}}, {s + 0.2});')
            js.append(f'tl.from("#{sid} .doc", {{opacity: 0, y: 30, duration: 0.7, stagger: 0.9, ease: "power3.out"}}, {s + 1.2});')
            js.append(f'tl.from("#{sid}-proof span", {{opacity: 0, y: 10, duration: 0.5, stagger: 0.4, ease: "power2.out"}}, {s + 7.6});')
        if kind == "end":
            js.append(f'tl.from("#{sid}-card", {{opacity: 0, x: -30, duration: 1.0, ease: "power3.out"}}, {s + 0.3});')
        # Soft cross-fade in from the paper colour at every cut.
        js.append(f'tl.fromTo("#{sid}-fade", {{opacity: 1}}, {{opacity: 0, duration: 0.45, ease: "power1.out"}}, {s});')
    js.append(f'tl.fromTo("#outro-fade", {{opacity: 0}}, {{opacity: 1, duration: 0.8, ease: "power1.in"}}, {TOTAL - 0.8});')
    return "\n      ".join(js)


def main() -> None:
    scenes = "\n".join(scene_html(*s) for s in SCENES)
    fades = "\n".join(
        f'    <div id="{sid}-fade" class="fade clip" data-start="{start}" data-duration="0.5" data-track-index="30"></div>' for sid, start, *_ in SCENES
    )
    # Videos live outside the timed sections (a timed <video> must not sit inside a timed element).
    vids = "\n".join(
        f'    <div class="vp"><div class="zoom" id="{sid}-zoom"><video id="{sid}-vid" src="media/{x["src"]}.mp4" muted playsinline data-start="{start}" data-duration="{dur}" data-media-start="{x["ms"]}" data-playback-rate="{x["rate"]}" data-track-index="2"></video></div></div>'
        for sid, start, dur, kind, x in SCENES
        if kind == "cap"
    )
    vo = "\n".join(
        f'    <audio id="vo-{sid}" src="media/vo_{sid}.mp3" data-start="{start + VO_OFFSET:.2f}" data-duration="{dur - VO_OFFSET:.2f}" data-track-index="10" data-volume="1"></audio>'
        for sid, start, dur, *_ in SCENES
    )
    template = (HERE / "composition.template.html").read_text(encoding="utf-8")
    out = (
        template.replace("{{TOTAL}}", f"{TOTAL}")
        .replace("{{SCENES}}", scenes)
        .replace("{{FADES}}", fades)
        .replace("{{VIDEOS}}", vids)
        .replace("{{CAPTIONS}}", captions())
        .replace("{{VO}}", vo)
        .replace("{{TIMELINE}}", timeline_js())
    )
    (HF / "index.html").write_text(out, encoding="utf-8", newline="\n")
    print("wrote index.html, total", TOTAL, "s")


if __name__ == "__main__":
    main()
