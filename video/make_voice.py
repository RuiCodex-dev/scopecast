"""Narration with Microsoft Edge neural TTS (edge-tts): one MP3 plus word timings per scene."""
import asyncio
import json
from pathlib import Path

import edge_tts

HERE = Path(__file__).resolve().parent
OUT = HERE / "hyperframes" / "media"
OUT.mkdir(parents=True, exist_ok=True)
cfg = json.loads((HERE / "narration.json").read_text(encoding="utf-8"))


async def one(scene: dict) -> None:
    com = edge_tts.Communicate(scene["text"], cfg["voice"], rate=cfg["rate"], boundary="WordBoundary")
    words, audio = [], bytearray()
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio.extend(ch["data"])
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    (OUT / f"vo_{scene['id']}.mp3").write_bytes(bytes(audio))
    (OUT / f"vo_{scene['id']}.json").write_text(json.dumps(words), encoding="utf-8")
    print(scene["id"], round(words[-1]["t"] + words[-1]["d"], 2), "s")


async def main() -> None:
    for s in cfg["scenes"]:
        await one(s)


asyncio.run(main())
