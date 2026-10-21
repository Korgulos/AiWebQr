"""Regression checks for portrait, landscape and animated QR backgrounds."""
import io
import runpy
from pathlib import Path
from PIL import Image, ImageDraw

prepare = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'src/lib/artistic-background.py'))['prepare_background']

for dimensions in [(120, 60), (60, 120), (60, 60)]:
    image = Image.new('RGB', dimensions, 'red')
    width, height = dimensions
    side = min(dimensions)
    left, top = (width - side) // 2, (height - side) // 2
    ImageDraw.Draw(image).rectangle((left, top, left + side - 1, top + side - 1), fill='green')
    source = io.BytesIO()
    image.save(source, format='PNG')
    source.seek(0)
    with Image.open(prepare(source)) as cropped:
        assert cropped.size == (side, side)
        assert cropped.convert('RGB').getextrema() == ((0, 0), (128, 128), (0, 0))
print('PASS landscape, portrait and square images fill every edge without distortion')

for dimensions in [(120, 60), (60, 120)]:
    frames = [Image.new('RGB', dimensions, color) for color in ['red', 'green', 'blue']]
    source = io.BytesIO()
    frames[0].save(source, format='GIF', save_all=True, append_images=frames[1:], duration=[70, 120, 180], loop=2)
    source.seek(0)
    with Image.open(prepare(source)) as cropped:
        assert cropped.size == (60, 60)
        assert cropped.n_frames == 3
        assert cropped.info['loop'] == 2
        for index, (color, duration) in enumerate(zip([(255, 0, 0), (0, 128, 0), (0, 0, 255)], [70, 120, 180])):
            cropped.seek(index)
            assert cropped.info['duration'] == duration
            assert cropped.convert('RGB').getpixel((0, 0)) == color
            assert cropped.convert('RGB').getpixel((59, 59)) == color
print('PASS animated GIFs retain frames, durations, loop count and full-edge coverage')
