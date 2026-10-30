"""Build deterministic, brand-matched social cards from our original QR artwork.
Requires Pillow. Run from the repository root; output is static/og/.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'static/og'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path('/usr/share/fonts/noto')
def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('NotoSans-Bold.ttf' if bold else 'NotoSans-Regular.ttf')), size)

def background(w,h):
    im=Image.new('RGB',(w,h)); px=im.load()
    for y in range(h):
        for x in range(w):
            glow=max(0,1-math.hypot((x-w*.88)/(w*.8),(y-h*.1)/(h*1.2)))**2
            px[x,y]=(int(11+35*glow),int(18+25*glow),int(32+84*glow))
    return im

def card(name,lines,description,tags,artistic=False):
    im=background(1200,630); d=ImageDraw.Draw(im)
    d.rounded_rectangle((64,52,108,96),radius=12,fill='#6366f1')
    for x,y in [(73,61),(91,61),(73,79)]:
        d.rectangle((x,y,x+9,y+9),fill='white');d.rectangle((x+3,y+3,x+6,y+6),fill='#6366f1')
    d.text((122,53),'QR Gen Me',font=font(27,True),fill='white')
    d.text((65,135),'CREATE. CUSTOMIZE. CONNECT.',font=font(16,True),fill='#a5b4fc')
    for i,line in enumerate(lines):
        d.text((60,184+i*78),line,font=font(62,True),fill='white' if i==0 else '#c4b5fd')
    d.text((65,365),description,font=font(22),fill='#cbd5e1')
    x=65
    for tag in tags:
        width=d.textlength(tag,font=font(17))+32
        d.rounded_rectangle((x,437,x+width,480),radius=21,fill='#1e293b',outline='#475569')
        d.text((x+16,445),tag,font=font(17),fill='#e0e7ff');x+=width+12
    d.rounded_rectangle((796,140,1144,488),radius=28,fill='#ffffff')
    qr=Image.open(ROOT/'static/artistic-examples'/('ripple-poster.png' if artistic else 'ocean-qr.png')).convert('RGB')
    qr=qr.resize((328,328),Image.Resampling.NEAREST)
    im.paste(qr,(806,150))
    d.line((65,541,1135,541),fill='#334155',width=1)
    d.text((65,561),'qr-gen-me.com',font=font(20,True),fill='#e0e7ff')
    text='Your link. Your style.'
    d.text((1135-d.textlength(text,font=font(18)),563),text,font=font(18),fill='#94a3b8')
    im.save(OUT/f'{name}.png',optimize=True)
    print(name,(OUT/f'{name}.png').stat().st_size)

card('home',['Small code.','Endless possibilities.'],'Create a QR code that feels like you.', ['Free QR generator','PNG & SVG','Custom styles'],True)
card('artistic',['Make a code.','Make it art.'],'Blend your QR with images and animated GIFs.', ['Artistic QR','Animated GIFs','Your own images'],True)
card('wifi',['One scan.','You’re connected.'],'Share your guest Wi-Fi with a QR code.', ['Wi-Fi QR','Guest networks','Free download'])
card('vcard',['One scan.','A new connection.'],'Share contact details with a vCard QR code.', ['vCard QR','Contact details','PNG & SVG'])
card('logo',['Your code.','Your signature.'],'Add your logo, colors, shapes and frames.', ['Custom logos','Colors & frames','PNG & SVG'])
# Square variant for placements which prefer a square social image.
im=background(1080,1080);d=ImageDraw.Draw(im)
d.text((64,48),'QR Gen Me',font=font(36,True),fill='#e0e7ff')
d.text((64,137),'Small code.',font=font(76,True),fill='white')
d.text((64,234),'Endless possibilities.',font=font(65,True),fill='#c4b5fd')
d.rounded_rectangle((300,390,780,870),radius=32,fill='white')
qr=Image.open(ROOT/'static/artistic-examples/ripple-poster.png').convert('RGB').resize((440,440),Image.Resampling.NEAREST)
im.paste(qr,(320,410));d.text((64,957),'qr-gen-me.com',font=font(29,True),fill='#e0e7ff')
im.save(OUT/'home-square.png',optimize=True)
