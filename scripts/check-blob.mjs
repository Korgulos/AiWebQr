import { loadEnv } from 'vite';
const env = loadEnv('development', process.cwd(), '');
if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is missing');
try {
	const response = await fetch('https://vercel.com/api/blob?limit=1', {
		headers: { Authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}` },
		signal: AbortSignal.timeout(15000), redirect: 'error'
	});
	console.log('Blob list HTTP status:', response.status);
	if (!response.ok) { process.exitCode = 1; }
	else {
		const data = await response.json();
		console.log('Authenticated storage access:', Array.isArray(data.blobs) ? 'OK' : 'Unexpected response');
	}
} catch { console.error('Blob connectivity check failed'); process.exitCode = 1; }
