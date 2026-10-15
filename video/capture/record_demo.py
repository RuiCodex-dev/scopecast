"""Records real browser captures of Scopecast for the demo video.

usage: python video/capture/record_demo.py [base_url]
Needs the dev server running (npm run dev). Launches its own headless Chromium,
records one clip per scene (Playwright video), draws a visible cursor in the page,
and converts each clip to H.264 MP4 in video/hyperframes/media/.
"""
import shutil
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5188/"
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "captures" / "raw"
OUT = ROOT / "hyperframes" / "media"
W, H = 1600, 1000

FEATURES = [
    "Visual design and page layouts",
    "Product catalogue with categories and photos",
    "Order basket with pickup time slots",
    "Online payment with Bancontact and cards",
    "Order dashboard for the shop",
    "Order confirmations by email and SMS",
    "Opening hours and holiday closures",
    "Pages in Dutch, French and English",
    "Digital loyalty stamp card",
    "Hosting, backups and launch",
]

# A visible cursor (headless recordings have none) with a soft click ring.
CURSOR_JS = """
(() => {
  const install = () => {
    if (document.getElementById('demo-cursor')) return;
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.5 19z" fill="#1F1C17" stroke="#F8F5EF" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {position:'fixed', left:'0', top:'0', zIndex: 99999, pointerEvents:'none', transform:'translate(-4px,-2px)', transition:'left 0s, top 0s'});
    document.body.appendChild(c);
    const ring = document.createElement('div');
    Object.assign(ring.style, {position:'fixed', width:'34px', height:'34px', borderRadius:'50%', border:'2px solid #B8502E', zIndex: 99998, pointerEvents:'none', opacity:'0', transform:'translate(-17px,-17px) scale(0.4)', transition:'opacity 380ms ease, transform 380ms ease'});
    document.body.appendChild(ring);
    window.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    window.addEventListener('mousedown', e => {
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
      ring.style.transition = 'none'; ring.style.opacity = '0.9'; ring.style.transform = 'translate(-17px,-17px) scale(0.4)';
      requestAnimationFrame(() => { ring.style.transition = 'opacity 420ms ease, transform 420ms ease'; ring.style.opacity = '0'; ring.style.transform = 'translate(-17px,-17px) scale(1.2)'; });
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
"""


class Mouse:
    def __init__(self, page: Page):
        self.page = page
        self.x, self.y = W * 0.55, H * 0.6
        page.mouse.move(self.x, self.y)

    def to(self, x: float, y: float, steps: int = 28) -> None:
        self.page.mouse.move(x, y, steps=steps)
        self.x, self.y = x, y

    def to_el(self, locator, dx: float = 0.5, dy: float = 0.5, steps: int = 28) -> None:
        box = locator.bounding_box()
        assert box, "element not visible"
        self.to(box["x"] + box["width"] * dx, box["y"] + box["height"] * dy, steps)

    def click(self, locator, dx: float = 0.5, dy: float = 0.5) -> None:
        self.to_el(locator, dx, dy)
        self.page.wait_for_timeout(180)
        self.page.mouse.down()
        self.page.wait_for_timeout(70)
        self.page.mouse.up()


def new_page(browser, name: str, setup=None):
    ctx = browser.new_context(viewport={"width": W, "height": H}, record_video_dir=str(RAW / name), record_video_size={"width": W, "height": H})
    ctx.add_init_script(CURSOR_JS)
    page = ctx.new_page()
    return ctx, page


def finish(ctx, page, name: str) -> None:
    video = page.video
    page.wait_for_timeout(600)
    ctx.close()
    src = Path(video.path())
    dst = OUT / f"cap_{name}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-an", str(dst)],
        check=True,
    )
    print("wrote", dst)


def goto_with_state(page: Page, state_js: str | None) -> None:
    page.goto(BASE)
    page.evaluate("localStorage.clear()")
    if state_js:
        page.evaluate(state_js)
    page.reload()
    page.wait_for_timeout(900)


def main() -> None:
    shutil.rmtree(RAW, ignore_errors=True)
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # A: paste the client's list
        ctx, page = new_page(browser, "paste")
        goto_with_state(page, None)
        m = Mouse(page)
        page.wait_for_timeout(700)
        box = page.get_by_label("Feature list, one item per line")
        m.click(box, 0.3, 0.3)
        page.keyboard.type("\n".join(f"- {f}" for f in FEATURES), delay=9)
        page.wait_for_timeout(500)
        m.click(page.get_by_role("button", name="Make 10 tasks"))
        page.wait_for_timeout(1400)
        name = page.get_by_label("Project name")
        m.click(name, 0.9)
        page.keyboard.press("Control+A")
        page.keyboard.type("Online ordering", delay=45)
        m.click(page.get_by_label("Client name"), 0.2)
        page.keyboard.type("De Korenbloem bakery", delay=40)
        m.to(W * 0.7, H * 0.55)
        page.wait_for_timeout(1200)
        finish(ctx, page, "paste")

        # B: give tasks a range (state continues from A in a fresh context via the sample loader)
        ctx, page = new_page(browser, "ranges")
        goto_with_state(page, None)
        page.get_by_label("Feature list, one item per line").fill("\n".join(FEATURES))
        page.get_by_role("button", name="Make 10 tasks").click()
        page.get_by_label("Project name").fill("Online ordering")
        page.get_by_label("Client name").fill("De Korenbloem bakery")
        page.wait_for_timeout(800)
        m = Mouse(page)
        for task, hours, fam in [(FEATURES[0], "14", "known"), (FEATURES[1], "12", "known"), (FEATURES[2], "18", "some"), (FEATURES[3], "14", "new")]:
            likely = page.get_by_label(f'Likely hours for "{task}"')
            m.click(likely)
            page.keyboard.type(hours, delay=110)
            page.wait_for_timeout(350)
            sel = page.get_by_label(f'How familiar is "{task}"')
            m.to_el(sel)
            page.wait_for_timeout(200)
            sel.select_option(fam)
            page.wait_for_timeout(650)
        m.to_el(page.get_by_test_id("price"), 0.4, 0.5, steps=40)
        page.wait_for_timeout(1600)
        finish(ctx, page, "ranges")

        # C: the full sample, confidence dial
        ctx, page = new_page(browser, "dial")
        goto_with_state(page, None)
        page.get_by_role("button", name="try the sample project").click()
        page.wait_for_timeout(900)
        m = Mouse(page)
        slider = page.locator("#confidence")
        sb = slider.bounding_box()
        assert sb
        xs = lambda v: sb["x"] + 9 + (sb["width"] - 18) * (v - 50) / 45  # noqa: E731
        y = sb["y"] + sb["height"] / 2
        m.to(xs(80), y, steps=40)
        page.wait_for_timeout(400)
        page.mouse.down()
        for target in (50, 95, 80):
            m.to(xs(target), y, steps=60)
            page.wait_for_timeout(900)
        page.mouse.up()
        m.to_el(page.locator(".explain"), 0.6, 0.5, steps=40)
        page.wait_for_timeout(1600)
        finish(ctx, page, "dial")

        # D: client budget and phase 2
        ctx, page = new_page(browser, "budget")
        goto_with_state(page, None)
        page.get_by_role("button", name="try the sample project").click()
        page.wait_for_timeout(500)
        page.evaluate("window.scrollTo(0, 380)")
        page.wait_for_timeout(700)
        m = Mouse(page)
        budget = page.get_by_label("Client budget in euros")
        m.click(budget)
        page.keyboard.type("9500", delay=160)
        page.wait_for_timeout(2200)
        move = page.locator(".verdict .btn-accent")
        move.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        m.click(move)
        page.wait_for_timeout(1500)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        page.wait_for_timeout(2200)
        finish(ctx, page, "budget")

        # E: client quote
        ctx, page = new_page(browser, "quote")
        goto_with_state(page, None)
        page.get_by_role("button", name="try the sample project").click()
        page.get_by_label("Client budget in euros").fill("9500")
        page.wait_for_timeout(300)
        page.locator(".verdict .btn-accent").click()
        page.wait_for_timeout(500)
        m = Mouse(page)
        m.click(page.get_by_role("link", name="Client quote"))
        page.wait_for_timeout(1200)
        m.click(page.get_by_label("Prepared by"), 0.8)
        page.keyboard.type("Rui Codex", delay=70)
        page.wait_for_timeout(600)
        for top in (180, 420, 640):
            page.evaluate(f"window.scrollTo({{top: {top}, behavior: 'smooth'}})")
            page.wait_for_timeout(1300)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        page.wait_for_timeout(900)
        m.to_el(page.get_by_role("button", name="Print / Save as PDF"), steps=40)
        page.wait_for_timeout(1500)
        finish(ctx, page, "quote")

        browser.close()


if __name__ == "__main__":
    main()
