// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        interface Locals {
            user: { user_id: number } | null;
        }
        // interface PageData {}
        // interface Platform {}
        // interface PrivateEnv {}
        // interface PublicEnv {}
    }
}

export {};
