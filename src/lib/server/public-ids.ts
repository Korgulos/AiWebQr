export const validPublicId = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function publicCampaign(row: Record<string, any>) {
	const { user_id, backlink_id, campaign_id, ...safe } = row;
	return { ...safe, campaign_id: row.public_id };
}
