import { authStore, type AuthUser } from './stores/authStore';

interface AuthResponse {
    error?: string;
    user?: AuthUser;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
        authStore.setLoading(true);
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        authStore.setUser(data);
        return { user: data };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        authStore.setError(message);
        return { error: message };
    } finally {
        authStore.setLoading(false);
    }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    try {
        authStore.setLoading(true);
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        authStore.setUser(data);
        return { user: data };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        authStore.setError(message);
        return { error: message };
    } finally {
        authStore.setLoading(false);
    }
}

export async function logout(): Promise<void> {
    let currentState = { user: null as AuthUser | null };
    
    const unsubscribe = authStore.subscribe(state => {
        currentState = state;
    });

    try {
        const user = currentState.user;
        if (user && typeof user.id === 'number') {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        unsubscribe();
        authStore.reset();
    }
}