function contrastRatio(foreground: string, background: string): number {
	const luminance = (hex: string) => {
		const rgb = [1, 3, 5]
			.map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
			.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
		return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
	};
	const a = luminance(foreground),
		b = luminance(background);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}


export type ArtisticStyle = {
	frame: 'square' | 'rounded' | 'circle';
	center: 'square' | 'circle';
	dark: string;
	light: string;
	frameColor: string;
	centerColor: string;
};

export const defaultArtisticStyle: ArtisticStyle = {
	frame: 'rounded',
	center: 'circle',
	dark: '#000000',
	light: '#ffffff',
	frameColor: '#000000',
	centerColor: '#000000'
};

/** Color-pair guidance only: GIF/photo contrast still varies across pixels and frames. */
export function artisticContrast(style: ArtisticStyle) {
	const colors = [style.dark, style.frameColor, style.centerColor];
	const ratio = Math.min(...colors.map((color) => contrastRatio(color, style.light)));
	const darkOnLight = colors.every(
		(color) => contrastRatio(color, '#ffffff') > contrastRatio(style.light, '#ffffff')
	);
	return { ratio, darkOnLight, recommended: ratio >= 4.5 && darkOnLight };
}
