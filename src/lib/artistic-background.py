"""Center-crop image backgrounds to cover the square QR symbol."""
import io
from PIL import Image, ImageOps, ImageSequence


def prepare_background(source):
    with Image.open(source) as image:
        width, height = image.size
        side = min(width, height)
        left = (width - side) // 2
        top = (height - side) // 2
        crop_box = (left, top, left + side, top + side)
        output = io.BytesIO()
        if getattr(image, 'is_animated', False):
            loop = image.info.get('loop', 0)
            frames = []
            durations = []
            for frame in ImageSequence.Iterator(image):
                frames.append(frame.convert('RGBA').crop(crop_box))
                durations.append(frame.info.get('duration', 100))
            frames[0].save(
                output, format='GIF', save_all=True, append_images=frames[1:],
                duration=durations, loop=loop, disposal=2,
            )
        else:
            oriented = ImageOps.exif_transpose(image)
            width, height = oriented.size
            side = min(width, height)
            left, top = (width - side) // 2, (height - side) // 2
            oriented.crop((left, top, left + side, top + side)).save(output, format='PNG')
        output.seek(0)
        return output
