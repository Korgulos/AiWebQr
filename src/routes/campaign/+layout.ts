import type { LayoutLoad } from './$types';
import { authStore } from '$lib/stores/authStore';
import { get } from 'svelte/store';

export const load: LayoutLoad = async () => {
    const user = get(authStore).user;
    
    return {
        user
    };
};