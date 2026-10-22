export function safeTimeZone(value?: string | null) {
	if (!value || value.length > 100) return 'UTC';
	try {
		new Intl.DateTimeFormat('en', { timeZone: value });
		return value;
	} catch {
		return 'UTC';
	}
}
