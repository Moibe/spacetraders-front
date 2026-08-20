import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const [statusRes, agentRes] = await Promise.all([
		fetch(`${base}/api/status`),
		fetch(`${base}/api/agent`)
	]);

	return {
		status: statusRes.ok ? await statusRes.json() : null,
		agent: agentRes.ok ? await agentRes.json() : null
	};
};
