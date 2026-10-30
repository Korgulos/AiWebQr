import { qrTools } from '$lib/qr-tools';
import type { RequestHandler } from './$types';

// Include only public pages that can be indexed, never campaign or account URLs.
export const GET: RequestHandler = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/arte-qr-gen', '/privacy', ...qrTools.map((tool) => `/${tool.slug}`)].map((path) => `<url><loc>https://www.qr-gen-me.com${path}</loc></url>`).join('\n')}
</urlset>`,
		{
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		}
	);
