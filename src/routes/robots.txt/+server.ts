import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	new Response(
		'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.qr-gen-me.com/sitemap.xml\n',
		{
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		}
	);
