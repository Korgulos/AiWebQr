import { contrastRatio } from './qr-content';

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
