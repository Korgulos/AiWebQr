import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const development = parseEnv(readFileSync('.env', 'utf8'));
const production = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'));
for (const key of ['ANALYTICS_SECRET', 'BLOB_READ_WRITE_TOKEN']) {
	if (production[key]) {
		console.log(`${key}: already configured`);
		continue;
	}
	const value = key === 'ANALYTICS_SECRET' ? randomBytes(32).toString('hex') : development[key];
	if (!value) throw new Error(`${key} is missing locally`);
	const result = spawnSync(
		'/home/korgulos/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm',
		[
			'dlx',
			'vercel',
			'env',
			'add',
			key,
			'--environment',
			'production',
			'--sensitive',
			'--yes',
			'--scope',
			'korgulos-projects'
		],
		{
			input: value,
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `/home/korgulos/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:${process.env.PATH}`
			}
		}
	);
	if (result.status !== 0) {
		console.error(`${key}: configuration failed`);
		process.exit(1);
	}
	console.log(`${key}: configured (value hidden)`);
}
