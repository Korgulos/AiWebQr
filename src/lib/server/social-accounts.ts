import { randomBytes } from 'node:crypto';
import { hash } from 'bcrypt';
import { db, type User } from './db';

export interface SocialIdentity {
	provider: 'google' | 'microsoft';
	subject: string;
	name: string;
	email: string | null;
	emailVerified: boolean;
}

export class SocialAccountError extends Error {}

export async function resolveSocialAccount(
	identity: SocialIdentity,
	linkUserId?: number,
	expectedVersion?: number
): Promise<User> {
	const client = await db.getClient();
	try {
		await client.query('BEGIN');
		await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
			`${identity.provider}:${identity.subject}`
		]);
		const linked = await client.query<User>(
			`SELECT u.* FROM social_accounts a JOIN users u ON u.user_id=a.user_id
			 WHERE a.provider=$1 AND a.subject=$2 FOR UPDATE OF u`,
			[identity.provider, identity.subject]
		);
		let user = linked.rows[0];
		if (user && linkUserId && user.user_id !== linkUserId) {
			throw new SocialAccountError('already_linked');
		}
		if (user && expectedVersion !== undefined && (user.session_version || 0) !== expectedVersion)
			throw new SocialAccountError('expired');
		if (!user) {
			if (linkUserId) {
				const result = await client.query<User>('SELECT * FROM users WHERE user_id=$1 FOR UPDATE', [
					linkUserId
				]);
				user = result.rows[0];
				if (!user) throw new SocialAccountError('failed');
				if (expectedVersion !== undefined && (user.session_version || 0) !== expectedVersion)
					throw new SocialAccountError('expired');
				const other = await client.query(
					'SELECT 1 FROM social_accounts WHERE user_id=$1 AND provider=$2',
					[linkUserId, identity.provider]
				);
				if (other.rowCount) throw new SocialAccountError('already_linked');
			} else {
				if (!identity.email) throw new SocialAccountError('email_required');
				const existing = await client.query('SELECT 1 FROM users WHERE lower(trim(email))=$1', [
					identity.email
				]);
				if (existing.rowCount) throw new SocialAccountError('account_exists');
				// No usable password is assigned to a social-only account.
				const password = await hash(randomBytes(48).toString('base64url'), 10);
				const created = await client.query<User>(
					`INSERT INTO users(name,email,password,subscription,email_verified_at)
					 VALUES($1,$2,$3,false,CASE WHEN $4 THEN now() ELSE NULL END) RETURNING *`,
					[identity.name.slice(0, 121), identity.email, password, identity.emailVerified]
				);
				user = created.rows[0];
			}
			await client.query('INSERT INTO social_accounts(provider,subject,user_id) VALUES($1,$2,$3)', [
				identity.provider,
				identity.subject,
				user.user_id
			]);
		}
		await client.query('UPDATE users SET login=now() WHERE user_id=$1', [user.user_id]);
		await client.query('COMMIT');
		return user;
	} catch (error) {
		await client.query('ROLLBACK');
		if ((error as { code?: string }).code === '23505')
			throw new SocialAccountError('account_exists');
		throw error;
	} finally {
		client.release();
	}
}
