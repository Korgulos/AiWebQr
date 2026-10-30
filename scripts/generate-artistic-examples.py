"""Generate original geometric backgrounds and QR examples; verify every frame.
Run in an environment with segno==1.6.6, qrcode-artistic==3.0.2, Pillow, zxing-cpp.
"""
from pathlib import Path
import math
import segno
import zxingcpp
from PIL import Image, ImageDraw, ImageSequence

out = Path(__file__).resolve().parents[1] / 'static/artistic-examples'
out.mkdir(parents=True, exist_ok=True)
payload = 'https://www.qr-gen-me.com/'
qr = segno.make(payload, error='h', micro=False)
for name, animated, palette in [
    ('ocean', False, ('#edfaff', '#9ad9ef', '#c6edf7')),
    ('sunrise', False, ('#fff8ed', '#f4d2a1', '#f6e5cd')),
    ('ripple', True, ('#f5f3ff', '#c4b5fd', '#ddd6fe')),
    ('confetti', True, ('#f0fdf4', '#a7e3c4', '#d2efe2')),
]:
    frames = []
    for step in range(8 if animated else 1):
        image = Image.new('RGB', (328, 328), palette[0])
        draw = ImageDraw.Draw(image)
        if name in ('ocean', 'sunrise'):
            for band in range(5):
                points = [(x, int(110 + band * 38 + 24 * math.sin(x / 60 + band))) for x in range(329)]
                draw.polygon(points + [(328, 328), (0, 328)], fill=palette[1 + band % 2])
        elif name == 'ripple':
            for ring in range(6, 0, -1):
                radius = ring * 35 + step * 3
                draw.ellipse((164-radius, 164-radius, 164+radius, 164+radius), outline=palette[1 + ring % 2], width=12)
        else:
            for i in range(25):
                x, y = (i*67 + step*7) % 328, (i*43 + step*3) % 328
                draw.rounded_rectangle((x, y, x+18, y+12), radius=4, fill=palette[1 + i % 2])
        frames.append(image)
    kind = 'gif' if animated else 'png'
    background = out / f'{name}-background.{kind}'
    if animated:
        frames[0].save(background, save_all=True, append_images=frames[1:], duration=180, loop=0, disposal=2)
    else:
        frames[0].save(background)
    target = out / f'{name}-qr.{kind}'
    qr.to_artistic(background=str(background), target=str(target), scale=8, border=4, kind=kind)
    with Image.open(target) as result:
        if animated:
            result.convert('RGB').save(out / f'{name}-poster.png')
        count = 0
        for frame in ImageSequence.Iterator(result):
            found = zxingcpp.read_barcode(frame.convert('RGB'))
            assert found and found.text == payload, f'Cannot decode {name} frame {count}'
            count += 1
        print(f'PASS {name}: {count} frame(s) decode to the site URL')
