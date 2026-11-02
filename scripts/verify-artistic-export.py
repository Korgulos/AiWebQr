"""Verify a browser-downloaded PNG/GIF with an independent QR decoder.

python scripts/verify-artistic-export.py output.gif --payload https://example.com --background input.gif
Requires Pillow and zxing-cpp. Checks every frame, timing and GIF repeat count.
"""
import argparse
from PIL import Image, ImageSequence
import zxingcpp

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output')
parser.add_argument('--payload', required=True)
parser.add_argument('--background')
args = parser.parse_args()
with Image.open(args.output) as output:
    assert output.width == output.height, 'QR export must be square'
    durations = []
    for index, frame in enumerate(ImageSequence.Iterator(output)):
        decoded = zxingcpp.read_barcode(frame.convert('RGB'))
        assert decoded and decoded.text == args.payload, f'Wrong or unreadable QR in frame {index}'
        durations.append(frame.info.get('duration'))
    if args.background:
        with Image.open(args.background) as source:
            assert len(durations) == getattr(source, 'n_frames', 1), 'Frame count changed'
            if source.format == 'GIF':
                expected = [frame.info.get('duration', 100) for frame in ImageSequence.Iterator(source)]
                assert durations == expected, f'Frame timing changed: {durations} != {expected}'
                assert output.info.get('loop') == source.info.get('loop'), 'GIF repeat count changed'
    print(f'PASS: {len(durations)} readable frame(s), square output, expected payload and animation metadata')
