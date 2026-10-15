# Generated assets

All AI-generated imagery in this repository. None of it is used inside the Scopecast app; it is
marketing and video mood only. No generated image contains text, people's faces, client data or
product UI — every word that appears over these images is real typography, and every product shot
is a real browser capture of the running app.

| Date | Tool / model | Prompt (summary; full text in `design/flow/prompts.txt`) | Variants | Chosen | Used in | Post |
|---|---|---|---|---|---|---|
| 2026-10-15 | Google Flow via `gflow-cli` 0.80.0, `--model nano-pro` (Nano Banana Pro), 16:9, 0 credits | Overhead editorial photo, pale oak drafting desk, blank cream paper, brass ruler, pencil, terracotta cup, sage linen, film grain | 3 | `prompt_0_2` → `design/img/plate-desk.jpg` | Devpost cover, video opening and end card, thumbnail | `design/scripts/grade.py` |
| 2026-10-15 | same | Belgian bakery counter at dawn through the shop window, sourdough on linen, no people or signs | 3 | `prompt_1_2` → `design/img/plate-bakery.jpg` | Video: "the client" scene | `design/scripts/grade.py` |
| 2026-10-15 | same | Small home office by a window in a Flemish townhouse, rainy morning, closed laptop, notebook | 3 | `prompt_2_2` → `design/img/plate-office.jpg` | Video: "the freelancer" scene | `design/scripts/grade.py` |

Raw variants are kept locally in `design/flow/raw/` and are not committed. No Veo video was generated.
The video's narration is synthetic speech (Microsoft Edge neural TTS) — see `video/CREDITS.md`.
