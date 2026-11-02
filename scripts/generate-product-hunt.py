"""Generate Product Hunt artwork and a results showcase, not a UI recording.
Run with Pillow installed. Use ffmpeg afterwards for the MP4 version.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/product-hunt/assets'
OUT.mkdir(parents=True, exist_ok=True)
FONTS = Path('C:/Windows/Fonts')

def font(size, bold=False):
    return ImageFont.truetype(str(FONTS / ('arialbd.ttf' if bold else 'arial.ttf')), size)

def card(title, subtitle, name, step, frame=0):
    im = Image.new('RGB', (1270, 760), '#0b1220')
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((55, 49, 100, 94), radius=12, fill='#818cf8')
    d.text((115, 55), 'QR Gen Me', font=font(27, True), fill='white')
    d.text((58, 154), 'YOUR LINK. YOUR IMAGE. YOUR QR.', font=font(17, True), fill='#a5b4fc')
    for i, line in enumerate(title):
        d.text((55, 207+i*73), line, font=font(58, True), fill='white' if i == 0 else '#c4b5fd')
    for i, line in enumerate(subtitle):
        d.text((58, 393+i*32), line, font=font(23), fill='#cbd5e1')
    d.rounded_rectangle((58, 512, 530, 566), radius=14, fill='#4f46e5')
    d.text((80, 527), 'Free generation. No signup needed.', font=font(22, True), fill='white')
    animated = name != 'designer-portfolio'
    src = ROOT / 'static/artistic-examples' / f'{name}-qr.{"gif" if animated else "png"}'
    with Image.open(src) as qr:
        qr.seek(frame % getattr(qr, 'n_frames', 1))
        qr = qr.convert('RGB').resize((410, 410), Image.Resampling.NEAREST)
    d.rounded_rectangle((740, 155, 1190, 605), radius=24, fill='white')
    im.paste(qr, (760, 175))
    d.text((760, 625), 'Demo QR opens qr-gen-me.com', font=font(19), fill='#94a3b8')
    d.line((58, 687, 1210, 687), fill='#334155', width=2)
    d.text((58, 709), 'qr-gen-me.com/arte-qr-gen', font=font(20, True), fill='#e0e7ff')
    d.text((1035, 709), f'{step} / 3 examples', font=font(18), fill='#94a3b8')
    return im

scenes = [
    (['Make your', 'event QR move.'], ['Add your link and an animated GIF.', 'Download a QR for digital displays.'], 'music-event'),
    (['An invitation.', 'A little motion.'], ['Create a QR with a GIF background.', 'Use your RSVP link for your own design.'], 'digital-invitation'),
    (['Your portfolio.', 'Your visual style.'], ['Blend your QR with a static image.', 'Export PNG and test before printing.'], 'designer-portfolio'),
]
frames = []
for index, (title, subtitle, name) in enumerate(scenes, 1):
    card(title, subtitle, name, index).save(OUT / f'gallery-{index:02d}.png')
    for frame in range(24):
        frames.append(card(title, subtitle, name, index, frame))
frames[0].save(OUT / 'showcase.gif', save_all=True, append_images=frames[1:], duration=180, loop=0, optimize=True)
icon = Image.new('RGB', (240, 240), '#0b1220')
d = ImageDraw.Draw(icon)
d.rounded_rectangle((30, 25, 210, 205), radius=36, fill='#6366f1')
for x, y in [(55, 50), (132, 50), (55, 127)]:
    d.rectangle((x, y, x+51, y+51), fill='white')
    d.rectangle((x+12, y+12, x+39, y+39), fill='#0b1220')
d.rectangle((137, 132, 153, 148), fill='white')
d.rectangle((162, 157, 183, 178), fill='white')
icon.save(OUT / 'thumbnail.png')
for path in OUT.iterdir():
    print(path.name, path.stat().st_size)
