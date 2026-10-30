import { error } from '@sveltejs/kit';
import { qrTools } from '$lib/qr-tools';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params }) => {
	const tool = qrTools.find((item) => item.slug === params.tool);
	if (!tool) error(404, 'Generator not found');
	return { tool };
};
