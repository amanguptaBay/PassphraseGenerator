#!/usr/bin/env python3
"""
Convert every SVG in this directory to a PNG.
Also produces favicon.jpg from favicon.svg.
"""

import io
import os
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

svgs = sorted(f for f in os.listdir(HERE) if f.endswith('.svg'))

if not svgs:
    print("No SVGs found.")
    raise SystemExit

print(f"Found {len(svgs)} SVG(s)\n")

for svg_file in svgs:
    svg_path = os.path.join(HERE, svg_file)
    png_name = svg_file.replace('.svg', '.png')
    png_path = os.path.join(HERE, png_name)

    png_bytes = cairosvg.svg2png(url=svg_path)
    with open(png_path, 'wb') as f:
        f.write(png_bytes)

    size = os.path.getsize(png_path)
    img = Image.open(io.BytesIO(png_bytes))
    print(f"  {svg_file:<30} → {png_name}  ({img.width}×{img.height}, {size // 1024}KB)")

# ── favicon.jpg ──────────────────────────────────────────────────────────────
favicon_svg = os.path.join(HERE, 'favicon.svg')
if os.path.exists(favicon_svg):
    png_bytes = cairosvg.svg2png(url=favicon_svg, output_width=64, output_height=64)
    img = Image.open(io.BytesIO(png_bytes)).convert('RGBA')

    # JPEG has no alpha — composite onto the app background colour
    bg = Image.new('RGB', img.size, (6, 6, 6))
    bg.paste(img, mask=img.split()[3])

    jpg_path = os.path.join(HERE, 'favicon.jpg')
    bg.save(jpg_path, 'JPEG', quality=95)
    print(f"\n  {'favicon.svg':<30} → favicon.jpg  (64×64, {os.path.getsize(jpg_path) // 1024}KB)")

print("\nDone.")
