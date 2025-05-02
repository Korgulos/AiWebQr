import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
    const data = await parent();
    
    if (!data.user) {
        const returnUrl = encodeURIComponent(url.pathname);
        throw redirect(302, `/login?returnTo=${returnUrl}`);
    }
    
    return {
        user: data.user
    };
};