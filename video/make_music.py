"""A quiet, self-made music bed for the Scopecast demo (no samples, no third-party audio).

Soft additive pads (Fmaj9 - Dm9 - Bbmaj9 - Csus) with a sparse felt-piano pluck and a
small synthetic room. Pure numpy, seeded, so it renders identically every time.
usage: python video/make_music.py [seconds]  ->  video/hyperframes/media/music.wav
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
LENGTH = float(sys.argv[1]) if len(sys.argv) > 1 else 116.0
OUT = Path(__file__).resolve().parent / "hyperframes" / "media" / "music.wav"
rng = np.random.default_rng(1015)
N = int(SR * LENGTH)
t = np.arange(N) / SR


def hz(m: int) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


CHORDS = [
    [41, 53, 57, 60, 64, 67],  # F maj9
    [38, 50, 53, 57, 60, 64],  # D m9
    [34, 50, 53, 57, 60, 62],  # Bb maj9 (add9)
    [36, 48, 53, 55, 60, 62],  # C sus
]
BAR = 7.5

pad = np.zeros(N)
for i in range(int(np.ceil(LENGTH / BAR)) + 1):
    start = i * BAR - 1.0
    s0, s1 = max(0, int(start * SR)), min(N, int((start + BAR + 2.5) * SR))
    if s0 >= s1:
        continue
    tt = t[s0:s1] - start
    env = (np.clip(tt / 2.2, 0, 1) * np.clip((BAR + 2.5 - tt) / 2.5, 0, 1)) ** 1.5
    for n in CHORDS[i % 4]:
        f = hz(n)
        for det in (-0.08, 0.07):
            ph = rng.uniform(0, 2 * np.pi)
            tone = np.sin(2 * np.pi * f * (1 + det / 100) * tt + ph) + 0.18 * np.sin(4 * np.pi * f * tt + ph)
            pad[s0:s1] += env * tone * (0.55 if n < 45 else 0.28)

pluck = np.zeros(N)
beat = BAR / 6
for k in range(int(LENGTH / beat)):
    if rng.random() < 0.45:
        continue
    chord = CHORDS[int(k * beat // BAR) % 4]
    n = chord[rng.integers(2, len(chord))] + 12
    s0 = int(k * beat * SR)
    s1 = min(N, s0 + int(3.0 * SR))
    tt = t[s0:s1] - t[s0]
    env = np.exp(-tt * 2.4) * np.clip(tt / 0.012, 0, 1)
    pluck[s0:s1] += env * (np.sin(2 * np.pi * hz(n) * tt) + 0.25 * np.sin(4 * np.pi * hz(n) * tt)) * 0.42

mix = pad * 0.16 + pluck * 0.22

# Small synthetic room: a few decaying echoes, then a gentle low-pass.
room = mix.copy()
for delay, gain in ((0.031, 0.32), (0.053, 0.24), (0.089, 0.18), (0.137, 0.12), (0.211, 0.08)):
    d = int(delay * SR)
    room[d:] += mix[:-d] * gain
k = 9
room = np.convolve(room, np.ones(k) / k, mode="same")

fade = int(3.0 * SR)
room[:fade] *= np.linspace(0, 1, fade)
room[-fade:] *= np.linspace(1, 0, fade)
room = room / np.max(np.abs(room)) * 0.5

stereo = np.stack([room, np.roll(room, int(0.011 * SR))], axis=1)
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print("wrote", OUT, f"{LENGTH:.0f}s")
