import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
export const load = ({ url }: { url: URL }) => {
	if (!dev || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) error(404, 'Not found');
};
