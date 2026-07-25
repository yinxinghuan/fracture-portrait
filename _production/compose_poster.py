from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_production" / "poster-source-v2.webp"
OUTPUT = ROOT / "public" / "poster.png"
THUMB = ROOT / "_production" / "poster-thumb.png"
FONT = "/System/Library/Fonts/Supplemental/Bodoni 72.ttc"

image = Image.open(SOURCE).convert("RGB")

# The platform raster included a generated white mockup margin. Crop only that
# accidental margin, then return to the required 1024px square.
image = image.crop((42, 42, 982, 982)).resize((1024, 1024), Image.Resampling.LANCZOS)

# Quiet the top safe area so the title remains legible without turning the
# photograph into an interface.
veil = Image.new("RGBA", image.size, (0, 0, 0, 0))
veil_pixels = veil.load()
for y in range(300):
    alpha = round(166 * (1 - y / 300) ** 1.65)
    for x in range(1024):
        veil_pixels[x, y] = (4, 6, 9, alpha)
image = Image.alpha_composite(image.convert("RGBA"), veil)

draw = ImageDraw.Draw(image)
font = ImageFont.truetype(FONT, 92, index=0)
small = ImageFont.truetype(
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    15,
)

ivory = (246, 242, 234, 255)
muted = (246, 242, 234, 180)
draw.text((63, 42), "VISUAL STUDY / 01", font=small, fill=muted, spacing=0)
draw.multiline_text(
    (58, 62),
    "FRACTURE\nPORTRAIT",
    font=font,
    fill=ivory,
    spacing=-22,
)

poster_rgb = image.convert("RGB")
poster_rgb.quantize(
    colors=256,
    method=Image.Quantize.MEDIANCUT,
    dither=Image.Dither.FLOYDSTEINBERG,
).save(OUTPUT, "PNG", optimize=True)
image.resize((160, 160), Image.Resampling.LANCZOS).convert("RGB").save(
    THUMB,
    "PNG",
    optimize=True,
)
