/// <reference lib="webworker" />
import qrcode from 'qrcode-generator';
import { parseGIF, decompressFrame } from 'gifuct-js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { ArtisticRequest } from './artistic-qr';
import { defaultArtisticStyle, type ArtisticStyle } from '../artistic-style';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const MAX_PIXELS = 4_000_000;
const MAX_FRAMES = 180;

function canvas(width: number, height: number) {
	const surface = new OffscreenCanvas(width, height);
	const context = surface.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Your browser does not support image rendering.');
	return { surface, context };
}

function checkSize(width: number, height: number) {
	if (!width || !height || width * height > MAX_PIXELS)
		throw new Error('Background is too large. Resize it to at most 4 megapixels.');
}

function renderer(text: string, scale: number, dotSize: number, style: ArtisticStyle) {
	const qr = qrcode(0, 'H');
	qr.addData(text, 'Byte');
	qr.make();
	const count = qr.getModuleCount();
	const version = (count - 17) / 4;
	const alignment: number[] = [];
	if (version > 1) {
		const positions = Math.floor(version / 7) + 2;
		const step =
			version === 32 ? 26 : Math.ceil((version * 4 + positions * 2 + 1) / (positions * 2 - 2)) * 2;
		alignment.push(6);
		for (let i = positions - 1; i >= 1; i--) alignment.push(count - 7 - (i - 1) * step);
	}
	// Three pixels per module keep its center readable, including at the lowest setting.
	const unit = Math.max(3, Math.min(10, Math.round(scale)));
	const size = (count + 8) * unit;
	const { surface, context } = canvas(size, size);
	const draw = (background?: OffscreenCanvas | ImageBitmap) => {
		context.fillStyle = style.light;
		context.fillRect(0, 0, size, size);
		if (background) {
			const side = Math.min(background.width, background.height);
			context.drawImage(
				background,
				(background.width - side) / 2,
				(background.height - side) / 2,
				side,
				side,
				4 * unit,
				4 * unit,
				count * unit,
				count * unit
			);
		}
		for (let y = 0; y < count; y++)
			for (let x = 0; x < count; x++) {
				const finderArea =
					(x < 8 && y < 8) || (x >= count - 8 && y < 8) || (x < 8 && y >= count - 8);
				// Draw the entire finder and its white separator below as rounded shapes.
				if (background && finderArea) continue;
				// Both module colors need contrast against a photo; use smaller light dots.
				const dark = qr.isDark(y, x);
				const aligned = alignment.some((cx) =>
					alignment.some(
						(cy) =>
							!(
								(cx === 6 && cy === 6) ||
								(cx === 6 && cy === count - 7) ||
								(cx === count - 7 && cy === 6)
							) &&
							Math.abs(x - cx) <= 2 &&
							Math.abs(y - cy) <= 2
					)
				);
				// Finder patterns plus their one-module separators occupy 8×8 areas.
				// Row/column 8 contain format/data modules, which should use the dot style.
				const structural =
					(x < 8 && y < 8) ||
					(x >= count - 8 && y < 8) ||
					(x < 8 && y >= count - 8) ||
					x === 6 ||
					y === 6 ||
					aligned ||
					(version >= 7 && ((x < 6 && y >= count - 11) || (y < 6 && x >= count - 11)));
				const width =
					!background || structural ? unit : Math.max(2, Math.ceil(unit * (dark ? 0.65 : 0.5)));
				const offset = Math.floor((unit - width) / 2);
				context.fillStyle = dark ? style.dark : style.light;
				if (background && !structural) {
					context.beginPath();
					context.arc(
						(x + 4.5) * unit,
						(y + 4.5) * unit,
						((width / 2) * dotSize) / 100,
						0,
						Math.PI * 2
					);
					context.fill();
				} else context.fillRect((x + 4) * unit + offset, (y + 4) * unit + offset, width, width);
			}
		{
			// Keep the standard 7:5:3 finder proportions with rounded frames and round centers.
			for (const [column, row] of [
				[0, 0],
				[count - 7, 0],
				[0, count - 7]
			]) {
				const left = (column + 4) * unit;
				const top = (row + 4) * unit;
				const rounded = (x: number, y: number, side: number, radius: number) => {
					context.beginPath();
					context.roundRect(x, y, side, side, radius);
					context.fill();
				};
				context.fillStyle = style.light;
				context.beginPath();
				context.roundRect(
					left - unit,
					top - unit,
					9 * unit,
					9 * unit,
					(style.frame === 'square' ? 0 : style.frame === 'circle' ? 4.5 : 2.5) * unit
				);
				context.fill();
				context.fillStyle = style.frameColor;
				rounded(
					left,
					top,
					7 * unit,
					(style.frame === 'square' ? 0 : style.frame === 'circle' ? 3.5 : 1.5) * unit
				);
				context.fillStyle = style.light;
				rounded(
					left + unit,
					top + unit,
					5 * unit,
					(style.frame === 'square' ? 0 : style.frame === 'circle' ? 2.5 : 1) * unit
				);
				context.fillStyle = style.centerColor;
				rounded(
					left + 2 * unit,
					top + 2 * unit,
					3 * unit,
					style.center === 'circle' ? 1.5 * unit : 0
				);
			}
		}
		return surface;
	};
	return { draw, context, size };
}

async function generate(request: ArtisticRequest) {
	if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined')
		throw new Error('Please use a current browser that supports background image processing.');
	if (!request.text.trim() || request.text.length > 2000)
		throw new Error('Enter a link or text of up to 2000 characters.');
	qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
	const style = request.style ?? defaultArtisticStyle;
	if (
		![style.dark, style.light, style.frameColor, style.centerColor].every((color) =>
			/^#[0-9a-f]{6}$/i.test(color)
		)
	)
		throw new Error('Choose valid QR colors.');
	const render = renderer(
		request.text,
		request.scale,
		Math.max(25, Math.min(100, request.dotSize ?? 62.68)),
		style
	);
	if (!request.background) return render.draw().convertToBlob({ type: 'image/png' });
	const response = await fetch(request.background);
	const blob = await response.blob();
	if (blob.size > 5 * 1024 * 1024) throw new Error('Use a background smaller than 5 MB.');
	if (!request.animated) {
		const image = await createImageBitmap(blob);
		try {
			checkSize(image.width, image.height);
			return await render.draw(image).convertToBlob({ type: 'image/png' });
		} finally {
			image.close();
		}
	}
	const parsed = parseGIF(await blob.arrayBuffer());
	const { width, height } = parsed.lsd;
	checkSize(width, height);
	const frames = parsed.frames.filter((frame) => 'image' in frame);
	if (!frames.length || frames.length > MAX_FRAMES || width * height * frames.length > 100_000_000)
		throw new Error(
			'GIF is too long or too large. Use up to 180 frames and reduce its dimensions.'
		);
	const { surface, context } = canvas(width, height);
	const encoder = GIFEncoder();
	// GIF repeat: -1 means play once, 0 forever, positive values repeat that many times.
	const extension = parsed.frames.find(
		(frame) => 'application' in frame && frame.application.id.startsWith('NETSCAPE')
	);
	const application = extension && 'application' in extension ? extension.application : undefined;
	const blocks = application?.blocks;
	const repeat = blocks && blocks.length >= 3 ? blocks[1] | (blocks[2] << 8) : -1;
	const bg = parsed.gct?.[parsed.lsd.backgroundColorIndex];
	const clear = () => {
		context.clearRect(0, 0, width, height);
		const first = frames[0].gce;
		if (
			bg &&
			!(
				first?.extras.transparentColorGiven &&
				first.transparentColorIndex === parsed.lsd.backgroundColorIndex
			)
		) {
			context.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
			context.fillRect(0, 0, width, height);
		}
	};
	clear();
	for (let i = 0; i < frames.length; i++) {
		const bounds = frames[i].image.descriptor;
		if (
			!bounds.width ||
			!bounds.height ||
			bounds.left + bounds.width > width ||
			bounds.top + bounds.height > height
		)
			throw new Error('GIF contains an invalid frame. Try another file.');
		const frame = decompressFrame(frames[i], parsed.gct, true);
		const before = frame.disposalType === 3 ? context.getImageData(0, 0, width, height) : null;
		const patch = canvas(frame.dims.width, frame.dims.height);
		patch.context.putImageData(
			new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
			0,
			0
		);
		context.drawImage(patch.surface, frame.dims.left, frame.dims.top);
		render.draw(surface);
		const rgba = render.context.getImageData(0, 0, render.size, render.size).data;
		const palette = quantize(rgba, 256);
		const delay = frames[i].gce ? frames[i].gce.delay * 10 : 100;
		encoder.writeFrame(applyPalette(rgba, palette), render.size, render.size, {
			palette,
			delay,
			repeat,
			dispose: 1
		});
		if (frame.disposalType === 2) {
			context.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
			if (bg && frame.transparentIndex !== parsed.lsd.backgroundColorIndex) {
				context.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
				context.fillRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
			}
		} else if (before) context.putImageData(before, 0, 0);
		scope.postMessage({ progress: `Rendering GIF frame ${i + 1} of ${frames.length}…` });
	}
	encoder.finish();
	return new Blob([new Uint8Array(encoder.bytes())], { type: 'image/gif' });
}

scope.onmessage = async ({ data }: MessageEvent<ArtisticRequest>) => {
	try {
		scope.postMessage({ blob: await generate(data) });
	} catch (error) {
		scope.postMessage({
			error: error instanceof Error ? error.message : 'Unable to generate this QR code.'
		});
	}
};
