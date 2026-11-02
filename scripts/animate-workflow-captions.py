"""Add quick zoom-in / zoom-out motion to the workflow captions."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
folder = root / 'docs/product-hunt'
source = (folder / 'workflow-captions.srt').read_text(encoding='utf-8')
header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,2,24,24,26,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def millis(value):
    h, m, s, ms = map(int, re.split('[:,]', value))
    return ((h * 60 + m) * 60 + s) * 1000 + ms

def ass_time(value):
    ms = millis(value)
    return f'{ms//3600000}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000//10:02}'

events = []
for block in source.strip().split('\n\n'):
    lines = block.splitlines()
    start, end = lines[1].split(' --> ')
    duration = millis(end) - millis(start)
    # Centered motion: fast approach, small settle, then shrink away.
    motion = (r'{\an5\pos(640,668)\fscx25\fscy25\fad(70,100)'
              r'\t(0,140,\fscx108\fscy108)'
              r'\t(140,230,\fscx100\fscy100)'
              + f'\\t({duration-170},{duration},\\fscx25\\fscy25)' + '}')
    text = r'\N'.join(lines[2:])
    events.append(f'Dialogue: 0,{ass_time(start)},{ass_time(end)},Caption,,0,0,0,,{motion}{text}')
(folder / 'workflow-captions-zoom.ass').write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
original = (folder / 'workflow-edit.ffscript').read_text(encoding='utf-8')
animated = re.sub(r"subtitles=.*?\[out\]", 'ass=docs/product-hunt/workflow-captions-zoom.ass[out]', original)
(folder / 'workflow-edit-zoom.ffscript').write_text(animated, encoding='utf-8')
print('Generated animated ASS captions and video filter.')
