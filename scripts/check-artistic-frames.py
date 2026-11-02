"""Print a JSON decode summary for a browser-exported QR image."""
import json
import sys
from PIL import Image, ImageSequence
import zxingcpp

with Image.open(sys.argv[1]) as image:
    results = [zxingcpp.read_barcode(frame.convert('RGB')) for frame in ImageSequence.Iterator(image)]
    correct = sum(bool(result) and result.text == sys.argv[2] for result in results)
    print(json.dumps({'readable': correct, 'total': len(results), 'passed': correct == len(results)}))
