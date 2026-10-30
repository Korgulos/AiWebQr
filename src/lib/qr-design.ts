import type { DotType } from 'qr-code-styling';

export const bodyShapes = [
	'square',
	'dots',
	'rounded',
	'classy',
	'classy-rounded',
	'extra-rounded',
	'small-dots',
	'diamond',
	'vertical-bars',
	'horizontal-bars'
] as const;
export type BodyShape = (typeof bodyShapes)[number];
export const eyeShapes = [
	'square',
	'dot',
	'extra-rounded',
	'rounded',
	'classy',
	'classy-rounded'
] as const;
export const qrFrames = [
	{ id: 'none', label: 'No frame' },
	{ id: 'outline', label: 'Outline' },
	{ id: 'rounded', label: 'Rounded' },
	{ id: 'brackets', label: 'Corner brackets' },
	{ id: 'label-bottom', label: 'Bottom label' },
	{ id: 'label-top', label: 'Top label' },
	{ id: 'badge', label: 'Rounded badge' }
] as const;
export type FrameStyle = (typeof qrFrames)[number]['id'];
export type QRDecoration = {
	body: BodyShape;
	frame: FrameStyle;
	color: string;
	caption: string;
	textColor: string;
};
export const baseBodyShape = (shape: BodyShape): DotType =>
	shape === 'small-dots'
		? 'dots'
		: ['diamond', 'vertical-bars', 'horizontal-bars'].includes(shape)
			? 'square'
			: (shape as DotType);
export const hasFrameLabel = (frame: FrameStyle) =>
	['label-bottom', 'label-top', 'badge'].includes(frame);
export const decoratedHeight = (width: number, frame: FrameStyle) =>
	width + (hasFrameLabel(frame) ? Math.round(width * 0.16) : 0);
const ns = 'http://www.w3.org/2000/svg';

// The library separates data modules from finder patterns into clip paths.
// Alter only individual data modules, preserving each module's center and all eyes.
export function decorateQR(svg: SVGElement, size: number, design: QRDecoration) {
	if (svg.hasAttribute('data-qr-decorated')) return;
	svg.setAttribute('data-qr-decorated', 'true');
	svg.setAttribute('data-body-shape', design.body);
	svg.setAttribute('data-frame-style', design.frame);
	const dots = svg.querySelector('clipPath[id^="clip-path-dot-color-"]');
	if (design.body === 'small-dots') {
		dots
			?.querySelectorAll('circle')
			.forEach((dot) => dot.setAttribute('r', String(Number(dot.getAttribute('r')) * 0.86)));
	} else if (['diamond', 'vertical-bars', 'horizontal-bars'].includes(design.body)) {
		dots?.querySelectorAll('rect').forEach((dot) => {
			const x = Number(dot.getAttribute('x')),
				y = Number(dot.getAttribute('y'));
			const w = Number(dot.getAttribute('width')),
				h = Number(dot.getAttribute('height'));
			if (design.body === 'diamond') {
				const polygon = svg.ownerDocument.createElementNS(ns, 'polygon');
				polygon.setAttribute(
					'points',
					`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`
				);
				dot.replaceWith(polygon);
			} else if (design.body === 'vertical-bars') {
				dot.setAttribute('x', String(x + w * 0.1));
				dot.setAttribute('width', String(w * 0.8));
			} else {
				dot.setAttribute('y', String(y + h * 0.1));
				dot.setAttribute('height', String(h * 0.8));
			}
		});
	}
	if (design.frame === 'none') return;
	const add = (tag: string, attrs: Record<string, string | number>, parent: Element = svg) => {
		const element = svg.ownerDocument.createElementNS(ns, tag);
		for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
		parent.appendChild(element);
		return element;
	};
	const pad = size * 0.035,
		stroke = size * 0.014,
		height = decoratedHeight(size, design.frame);
	const labelHeight = height - size,
		top = design.frame === 'label-top' ? labelHeight : 0;
	const round = ['rounded', 'badge'].includes(design.frame) ? size * 0.065 : 0;
	const original = Array.from(svg.children).filter(
		(child) => child.tagName.toLowerCase() !== 'defs'
	);
	svg.setAttribute('width', String(size));
	svg.setAttribute('height', String(height));
	svg.setAttribute('viewBox', `0 0 ${size} ${height}`);
	const decoration = add('g', { 'data-qr-frame': design.frame });
	add('rect', { x: 0, y: 0, width: size, height, rx: round, fill: '#ffffff' }, decoration);
	if (hasFrameLabel(design.frame))
		add('rect', { x: 0, y: 0, width: size, height, rx: round, fill: design.color }, decoration);
	const core = add('g', {
		'data-qr-core': '',
		transform: `translate(${pad} ${top + pad}) scale(${1 - (2 * pad) / size})`
	});
	for (const child of original) core.appendChild(child);
	// A white panel keeps transparent QR exports legible inside a colored badge.
	const panel = svg.ownerDocument.createElementNS(ns, 'rect');
	for (const [key, value] of Object.entries({
		x: pad,
		y: top + pad,
		width: size - 2 * pad,
		height: size - 2 * pad,
		rx: round / 2,
		fill: '#ffffff'
	}))
		panel.setAttribute(key, String(value));
	svg.insertBefore(panel, core);
	if (!hasFrameLabel(design.frame)) {
		if (design.frame === 'brackets') {
			const a = stroke,
				b = size - stroke,
				length = size * 0.17;
			add('path', {
				d: `M ${a} ${a + length} V ${a} H ${a + length} M ${b - length} ${a} H ${b} V ${a + length} M ${b} ${b - length} V ${b} H ${b - length} M ${a + length} ${b} H ${a} V ${b - length}`,
				fill: 'none',
				stroke: design.color,
				'stroke-width': stroke,
				'stroke-linecap': 'round'
			});
		} else
			add('rect', {
				x: stroke / 2,
				y: stroke / 2,
				width: size - stroke,
				height: size - stroke,
				rx: round,
				fill: 'none',
				stroke: design.color,
				'stroke-width': stroke
			});
	} else {
		const caption = Array.from(design.caption.trim()).slice(0, 32).join('');
		const fontSize = Math.min(
			size * 0.065,
			(size * 0.84) / Math.max(1, Array.from(caption).length)
		);
		const text = add('text', {
			x: size / 2,
			y: design.frame === 'label-top' ? labelHeight / 2 : size + labelHeight / 2,
			'text-anchor': 'middle',
			'dominant-baseline': 'central',
			'font-family': 'Arial, Helvetica, sans-serif',
			'font-weight': '700',
			'font-size': fontSize,
			fill: design.textColor
		});
		text.textContent = caption;
	}
}

// Render the decorated SVG for every output so frame, caption and dimensions match.
export async function exportQR(
	instance: { getRawData: (extension: 'svg') => Promise<Blob | Buffer | null> },
	format: 'svg' | 'png'
): Promise<Blob> {
	const svg = await instance.getRawData('svg');
	if (!(svg instanceof Blob)) throw new Error('Generate a QR code first.');
	if (format === 'svg') return svg;
	const url = URL.createObjectURL(svg);
	try {
		const image = new Image();
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('Unable to render QR image.'));
			image.src = url;
		});
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Image export unavailable.');
		context.drawImage(image, 0, 0);
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('Unable to export PNG.'))),
				'image/png'
			)
		);
	} finally {
		URL.revokeObjectURL(url);
	}
}
