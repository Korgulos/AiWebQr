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
    token?: string;
}

interface AuthState {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
}

// Initialize state from localStorage if available
const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
const initialState: AuthState = {
    user: storedUser ? JSON.parse(storedUser) : null,
    loading: false,
    error: null
};

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>(initialState);

    return {
        subscribe,
        setUser: (user: AuthUser | null) => {
            if (typeof localStorage !== 'undefined') {
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                } else {
                    localStorage.removeItem('user');
                }
            }
            update(state => ({ ...state, user, error: null }));
        },
        setLoading: (loading: boolean) => 
            update(state => ({ ...state, loading })),
        setError: (error: string | null) => 
            update(state => ({ ...state, error })),
        reset: () => {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user');
            }
            set({ user: null, loading: false, error: null });
        }
    };
}

export const authStore = createAuthStore();