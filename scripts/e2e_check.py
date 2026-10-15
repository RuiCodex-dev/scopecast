"""End-to-end check of the core journey against a running dev server.

Usage: python scripts/e2e_check.py [base_url] [screenshot_dir]
Launches its own headless Chromium, walks paste -> hours -> confidence -> budget ->
phase 2 -> quote -> reload, asserts the numbers and saves screenshots.
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5188/"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "design/screenshots")
OUT.mkdir(parents=True, exist_ok=True)


def euros(text: str) -> int:
    return int(re.sub(r"[^0-9]", "", text))


def main() -> None:
    failures = []

    def check(cond, msg):
        print(("PASS " if cond else "FAIL ") + msg)
        if not cond:
            failures.append(msg)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 960}, device_scale_factor=2)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE)
        page.evaluate("localStorage.clear()")
        page.reload()
        page.screenshot(path=str(OUT / "01-empty.png"))

        # Slice 1: paste and forecast
        page.get_by_label("Feature list, one item per line").fill("- Booking page\n2) Reminder emails\n* Admin calendar\n- booking page")
        check(page.get_by_role("button", name="Make 3 tasks").is_visible(), "paste preview counts 3 unique tasks")
        page.get_by_role("button", name="Make 3 tasks").click()
        check(page.locator(".task-row").count() == 3, "three task rows")
        for name, hours in [("Booking page", "10"), ("Reminder emails", "4"), ("Admin calendar", "12")]:
            page.get_by_label(f'Likely hours for "{name}"').fill(hours)
        page.wait_for_timeout(300)
        price1 = euros(page.get_by_test_id("price").inner_text())
        check(price1 > 0, f"price shown ({price1})")
        check("working day" in page.get_by_test_id("days").inner_text(), "working days shown")

        # Slice 2: familiarity and dial
        page.get_by_label('How familiar is "Admin calendar"').select_option("new")
        page.wait_for_timeout(200)
        worst = page.get_by_label('Worst case hours for "Admin calendar"').input_value()
        check(worst == "30", f"new territory sets worst to 2.5x (got {worst})")
        page.get_by_label('Best case hours for "Booking page"').fill("14")
        page.wait_for_timeout(200)
        check(page.locator(".row-note").count() == 1, "out-of-order range is flagged")
        page.get_by_label('Best case hours for "Booking page"').fill("8")
        prices = []
        for v in [50, 70, 90]:
            page.locator("#confidence").fill(str(v))
            page.wait_for_timeout(150)
            prices.append(euros(page.get_by_test_id("price").inner_text()))
        check(prices[0] <= prices[1] <= prices[2] and prices[0] < prices[2], f"price rises with confidence {prices}")

        # Slice 3 + 4: sample project, budget fit, persistence
        page.once("dialog", lambda d: d.accept())
        page.get_by_role("button", name="Sample", exact=True).click()
        page.wait_for_timeout(400)
        check(page.locator(".task-row").count() == 10, "sample loads 10 tasks")
        page.locator("#confidence").fill("80")
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / "02-sample-forecast.png"))
        full = euros(page.get_by_test_id("price").inner_text())
        # Same client budget as the demo video and write-up, so the screenshots match them.
        budget = 9500
        check(budget < full, f"budget {budget} is below the full quote {full}")
        page.get_by_label("Client budget in euros").fill(str(budget))
        page.wait_for_timeout(500)
        verdict = page.get_by_test_id("verdict").inner_text()
        check("move" in verdict.lower(), "budget below quote suggests phase 2")
        page.screenshot(path=str(OUT / "03-budget-suggestion.png"))
        page.get_by_role("button", name=re.compile(r"^Move (it|these \d+) to phase 2$")).click()
        page.wait_for_timeout(400)
        after = euros(page.get_by_test_id("price").inner_text())
        check(after <= budget, f"phase-1 price {after} fits budget {budget}")
        check(page.get_by_test_id("phase2").is_visible(), "phase 2 estimate shown")
        page.screenshot(path=str(OUT / "04-after-phase2.png"))
        page.reload()
        page.wait_for_timeout(500)
        check(euros(page.get_by_test_id("price").inner_text()) == after, "project survives a reload")

        # Slice 5: quote
        page.get_by_role("link", name="Client quote").click()
        page.wait_for_timeout(400)
        check(euros(page.get_by_test_id("quote-price").inner_text()) == after, "quote price matches workbench")
        page.get_by_label("Prepared by").fill("Rui Codex")
        page.screenshot(path=str(OUT / "05-quote.png"), full_page=True)
        page.emulate_media(media="print")
        pdf = OUT / "quote-sample.pdf"
        page.pdf(path=str(pdf), format="A4", print_background=True)
        pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf.read_bytes()))
        check(pages == 1, f"quote prints on one A4 page (pages={pages})")
        page.emulate_media(media="screen")

        # Narrow layout
        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        mobile.goto(BASE)
        mobile.wait_for_timeout(500)
        mobile.screenshot(path=str(OUT / "06-mobile.png"), full_page=True)
        overflow = mobile.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
        check(not overflow, "no horizontal scroll at 390px")

        check(not errors, f"no page errors {errors}")
        browser.close()

    print(f"\n{len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
