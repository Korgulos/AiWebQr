import { writable } from 'svelte/store';

export interface AuthUser {
	user_id: number;
	name: string;
	email: string;
	subscription: boolean;
	signup: string;
	login: string | null;
	logout: string | null;
	updated_at: string;
}
interface AuthState {
	user: AuthUser | null;
	loading: boolean;
	error: string | null;
}
const initialState: AuthState = { user: null, loading: false, error: null };
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);
	return {
		subscribe,
		setUser: (user: AuthUser | null) => update((state) => ({ ...state, user, error: null })),
		setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),
		setError: (error: string | null) => update((state) => ({ ...state, error })),
		reset: () => set({ ...initialState })
	};
}
export const authStore = createAuthStore();
