<script lang="ts">
	let result = $state<{
		summary: Record<string, number>;
		events: Record<string, unknown>[];
	} | null>(null);
	let busy = $state(false);
	let failure = $state('');
	async function record() {
		busy = true;
		failure = '';
		try {
			const response = await fetch('/api/analytics-draft', { method: 'POST' });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error);
			result = data;
		} catch (e) {
			failure = e instanceof Error ? e.message : 'Request failed';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>Local analytics draft | QR Gen Me</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<main class="mx-auto max-w-6xl space-y-6 p-6">
	<a href="/" class="text-indigo-600">← QR Gen Me</a>
	<h1 class="text-3xl font-bold">Scan analytics · local draft</h1>
	<p>
		Test your current browser request. Repeat within 10 seconds to flag a rapid repeat. Events
		belong to this demo session and disappear after one hour or a server restart. No production
		database is used.
	</p>
	<button
		class="rounded-xl bg-indigo-600 px-5 py-3 text-white disabled:opacity-50"
		disabled={busy}
		onclick={record}>{busy ? 'Recording…' : 'Record test opening'}</button
	>
	{#if failure}<p role="alert" class="text-red-700">{failure}</p>{/if}
	{#if result}
		<div class="grid gap-3 sm:grid-cols-5">
			{#each Object.entries(result.summary) as [label, value]}<div
					class="rounded-xl border bg-white p-4"
				>
					<p class="text-sm text-slate-600">{label.replaceAll('_', ' ')}</p>
					<strong class="text-3xl">{value}</strong>
				</div>{/each}
		</div>
		<h2 class="text-xl font-semibold">Captured request metadata</h2>
		<p>
			Headers are client claims, not verified identity. Cookies, authorization, raw IP, URL query
			values and POST bodies are excluded. Geography is unavailable in this local draft.
		</p>
		<pre class="overflow-auto rounded-xl bg-slate-900 p-5 text-sm text-slate-100">{JSON.stringify(
				result.events,
				null,
				2
			)}</pre>
	{/if}
</main>
