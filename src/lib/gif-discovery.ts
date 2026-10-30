const pageSize = 12;
const defaultPages = 10;

export function nextGifPage(previous: number | null, random = Math.random): number {
	if (previous !== null && Number.isInteger(previous) && previous >= 0 && previous < defaultPages)
		return (previous + 1) % defaultPages;
	return Math.min(defaultPages - 1, Math.max(0, Math.floor(random() * defaultPages)));
}

export function gifDiscoveryRequest(query: string, page: number) {
	const term = query.trim();
	return {
		path: term ? 'search' : 'trending',
		params: {
			...(term ? { q: term } : {}),
			limit: String(pageSize),
			offset: String(Math.max(0, page) * pageSize),
			rating: 'g'
		} as Record<string, string>
	};
}
