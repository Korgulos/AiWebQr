<script lang="ts">
	import { page } from '$app/state';
	import { providerLabels, type SocialProvider } from '$lib/social-auth';
	let {
		returnTo = '/',
		connect = false,
		linked = [],
		only,
		connectPending = false
	}: {
		returnTo?: string;
		connect?: boolean;
		linked?: SocialProvider[];
		only?: SocialProvider[];
		connectPending?: boolean;
	} = $props();
	const providers = $derived(
		(page.data.socialProviders || []).filter((provider) => !only || only.includes(provider))
	);
</script>

{#if providers.length}
	<div
		class="space-y-3"
		aria-label={connect ? 'Connect a sign-in provider' : 'Continue with a social account'}
	>
		{#each providers as provider}
			{#if connect && linked.includes(provider)}
				<p
					class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
				>
					{providerLabels[provider]} connected
				</p>
			{:else}
				<a
					href={`/api/auth/${provider}?${connect ? 'link=1' : `returnTo=${encodeURIComponent(returnTo)}${connectPending ? '&connectPending=1' : ''}`}`}
					data-sveltekit-reload
					class="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
				>
					{#if provider === 'google'}
						<svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"
							><path
								fill="#4285F4"
								d="M43.6 24.5c0-1.5-.1-2.8-.4-4.2H24v8h11a9.5 9.5 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.8 6-15.2Z"
							/><path
								fill="#34A853"
								d="M24 44c5.4 0 9.9-1.8 13.2-4.8l-6.7-5.2c-1.8 1.2-4 1.9-6.5 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9V33A20 20 0 0 0 24 44Z"
							/><path
								fill="#FBBC05"
								d="M12.8 27.7a12 12 0 0 1 0-7.4V15H5.9a20 20 0 0 0 0 18l6.9-5.3Z"
							/><path
								fill="#EA4335"
								d="M24 12.1c2.9 0 5.5 1 7.5 2.9l5.6-5.6A19 19 0 0 0 24 4 20 20 0 0 0 5.9 15l6.9 5.3A12 12 0 0 1 24 12.1Z"
							/></svg
						>
					{:else}
						<svg aria-hidden="true" width="20" height="20" viewBox="0 0 21 21"
							><path fill="#f25022" d="M1 1h9v9H1z" /><path fill="#7fba00" d="M11 1h9v9h-9z" /><path
								fill="#00a4ef"
								d="M1 11h9v9H1z"
							/><path fill="#ffb900" d="M11 11h9v9h-9z" /></svg
						>
					{/if}
					{connect ? 'Connect' : 'Continue with'}
					{providerLabels[provider]}
				</a>
			{/if}
		{/each}
	</div>
	{#if !connect}<div class="my-5 flex items-center gap-3 text-xs text-slate-500">
			<span class="h-px flex-1 bg-slate-200"></span>or use email<span
				class="h-px flex-1 bg-slate-200"
			></span>
		</div>{/if}
{/if}
