import { redirect, error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url, params }) => {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id))
		error(404, 'Campaign not found');
	const data = await parent();
	if (!data.user) {
		const returnUrl = encodeURIComponent(url.pathname);
		throw redirect(302, `/login?returnTo=${returnUrl}`);
	}

	return {
		user: data.user
	};
};
