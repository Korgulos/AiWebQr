import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
const production = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'));
const development = parseEnv(readFileSync('.env', 'utf8'));
if (
	!production.DATABASE_URL?.startsWith('postgres') ||
	production.DATABASE_URL === development.DATABASE_URL
)
	throw new Error('Expected separate production database');
const result = spawnSync(
	'/home/korgulos/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm',
	[
		'dlx',
		'vercel',
		'env',
		'add',
		'DATABASE_URL',
		'--environment',
		'production',
		'--force',
		'--sensitive',
		'--yes',
		'--scope',
		'korgulos-projects'
	],
	{
		input: production.DATABASE_URL,
		encoding: 'utf8',
		env: {
			...process.env,
			PATH: `/home/korgulos/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:${process.env.PATH}`
		}
	}
);
if (result.status !== 0) {
	console.error('Production database configuration failed');
	process.exit(1);
}
console.log('Production DATABASE_URL synchronized (value hidden)');
