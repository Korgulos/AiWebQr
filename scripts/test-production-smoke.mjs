import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import pg from 'pg';
import bcrypt from 'bcrypt';
const origin = process.argv[2];
if (!origin || !new URL(origin).hostname.endsWith('-korgulos-projects.vercel.app'))
	throw new Error('Expected staged deployment URL');
const env = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'));
const client = new pg.Client({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 15000
});
const directory = mkdtempSync(join(tmpdir(), 'qr-prod-smoke-'));
const email = `smoke-${randomUUID().slice(0, 8)}@example.invalid`;
const password = randomUUID();
let userId;
function request(path, method = 'GET', body) {
	const args = [
		'dlx',
		'vercel',
		'curl',
		origin + path,
		'--scope',
		'korgulos-projects',
		'--',
		'--silent',
		'--show-error',
		'--max-time',
		'40',
		'--cookie',
		join(directory, 'cookies'),
		'--cookie-jar',
		join(directory, 'cookies'),
		'--output',
		join(directory, 'response'),
		'--write-out',
		'%{http_code}',
		'--request',
		method
	];
	if (body) {
		writeFileSync(join(directory, 'body'), JSON.stringify(body), { mode: 0o600 });
		args.push(
			'--header',
			'Content-Type: application/json',
			'--header',
			`Origin: ${origin}`,
			'--data-binary',
			`@${join(directory, 'body')}`
		);
	}
	const result = spawnSync(
		'/home/korgulos/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm',
		args,
		{
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `/home/korgulos/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:${process.env.PATH}`
			}
		}
	);
	if (result.status !== 0) throw new Error(`Request failed: ${method} ${path}`);
	const status = Number(result.stdout.trim().slice(-3));
	const text = readFileSync(join(directory, 'response'), 'utf8');
	if (status < 200 || status >= 300) throw new Error(`HTTP ${status}: ${method} ${path}`);
	return path === '/' ? text : JSON.parse(text);
}
try {
	await client.connect();
	const result = await client.query(
		'INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING user_id',
		['Deploy smoke test', email, await bcrypt.hash(password, 10)]
	);
	userId = result.rows[0].user_id;
	request('/api/auth/login', 'POST', { email, password });
	console.log('PASS production login and session');
	assert.match(request('/'), /Welcome back/);
	console.log('PASS authenticated dashboard');
	const created = request('/api/campaigns', 'POST', {
		title: 'Temporary deployment check',
		description: '',
		purpose: 'url',
		values: { url: 'https://example.com/' }
	});
	const id = created.campaign?.campaign_id || created.campaign_id;
	assert.ok(id);
	request('/api/campaigns/analytics?id=' + id + '&timeZone=Europe%2FBelgrade');
	request('/api/campaigns/field', 'PATCH', { id, field: 'status', value: 'paused' });
	request('/api/campaigns', 'DELETE', { id, confirmation: 'DELETE' });
	console.log('PASS campaign create, analytics, status edit and delete');
} finally {
	if (userId) await client.query('DELETE FROM users WHERE user_id=$1', [userId]);
	await client.end();
	rmSync(directory, { recursive: true, force: true });
	console.log('Temporary test account and files cleaned up');
}
