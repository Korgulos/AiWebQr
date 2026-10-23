export type SocialProvider = 'google' | 'microsoft';
export const providerLabels: Record<SocialProvider, string> = {
	google: 'Google',
	microsoft: 'Microsoft'
};
export function socialAuthMessage(code: string | null) {
	const messages: Record<string, string> = {
		unavailable: 'This sign-in option is not available yet. Please use email and password.',
		expired: 'Your sign-in attempt expired. Please try again.',
		cancelled: 'Sign-in was cancelled. You can try again or use email and password.',
		failed: 'Could not complete sign-in. Please try again.',
		account_exists:
			'An account with this email already exists. Sign in using your existing method, then connect this provider in Account settings.',
		already_linked:
			'This provider is already connected to an account. Use that account to sign in.',
		email_required:
			'This provider did not supply a supported email address. Create an account with email and password, then connect it in Account settings.'
	};
	return code ? messages[code] || messages.failed : '';
}
