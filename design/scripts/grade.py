"""Shared colour grade for Scopecast marketing photography.

usage: python design/scripts/grade.py <in.jpg> <out.jpg> [width height]
Desaturates slightly, warms the shadows toward the paper tone, lifts blacks to ink
(no pure black), and adds a seeded film grain so every image reads as one series.
"""
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageOps

src, dst = sys.argv[1], sys.argv[2]
size = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (1920, 1080)

im = Image.open(src).convert("RGB")
im = ImageOps.fit(im, size, method=Image.LANCZOS, centering=(0.5, 0.5))
im = ImageEnhance.Color(im).enhance(0.82)
im = ImageEnhance.Contrast(im).enhance(0.94)

a = np.asarray(im).astype(np.float32) / 255.0
ink = np.array([0x1F, 0x1C, 0x17], np.float32) / 255.0
paper = np.array([0xF3, 0xEE, 0xE4], np.float32) / 255.0
lum = a.mean(axis=2, keepdims=True)
# Split tone: shadows toward ink, highlights toward paper.
a = a * 0.9 + (ink * (1 - lum) + paper * lum) * 0.1
# Lift blacks to the ink tone.
a = ink + a * (1 - ink)
rng = np.random.default_rng(20261015)
grain = rng.normal(0, 0.018, a.shape[:2])[..., None]
a = np.clip(a + grain, 0, 1)
Image.fromarray((a * 255).astype(np.uint8)).save(dst, quality=90)
print("graded", dst, size)
