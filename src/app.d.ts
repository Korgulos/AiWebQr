// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: { user_id: number; session_version?: number } | null;
		}
		interface PageData {
			socialProviders: import('$lib/social-auth').SocialProvider[];
		}
		// interface Platform {}
		// interface PrivateEnv {}
		// interface PublicEnv {}
	}
}

export {};
