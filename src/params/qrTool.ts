import { qrTools } from '$lib/qr-tools';
import type { ParamMatcher } from '@sveltejs/kit';
export const match: ParamMatcher = (param) => qrTools.some((tool) => tool.slug === param);
