import { authStore, type AuthUser } from './stores/authStore';
import { invalidateAll } from '$app/navigation';

interface AuthResponse {
	error?: string;
	user?: AuthUser;
}

interface RegisterData {
	name: string;
	email: string;
	password: string;
}

interface LoginData {
	email: string;
	password: string;
}

export async function register(
	name: string,
	email: string,
	password: string
): Promise<AuthResponse> {
	try {
		authStore.setLoading(true);
		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, email, password } as RegisterData)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Registration failed');
		}

		authStore.setUser(data);
		await invalidateAll();
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
			body: JSON.stringify({ email, password } as LoginData)
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Login failed');
		}

		authStore.setUser(data);
		await invalidateAll();
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
	try {
		const response = await fetch('/api/auth/logout', { method: 'POST' });
		if (!response.ok) throw new Error('Unable to sign out. Please try again.');
		authStore.reset();
		await invalidateAll();
	} catch (error) {
		authStore.setError(error instanceof Error ? error.message : 'Unable to sign out.');
	}
}
