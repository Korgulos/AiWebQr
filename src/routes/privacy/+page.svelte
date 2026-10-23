<script lang="ts">
	import policy from '../../../drafts/privacy-policy.md?raw';
	// The policy is plain text; never render document content as HTML.
	const sections = policy.trim().split('\n\n');
</script>

<svelte:head>
	<title>Privacy policy | QR Gen Me</title>
	<meta
		name="description"
		content="How QR Gen Me uses account, sign-in, campaign and analytics data."
	/>
</svelte:head>

<main class="mx-auto max-w-3xl px-5 py-12 text-slate-700">
	<a href="/" class="text-sm font-semibold text-indigo-600">← QR Gen Me</a>
	<article class="mt-8 space-y-5 leading-7">
		{#each sections as section}
			{#if section.startsWith('# ')}
				<h1 class="text-3xl font-bold tracking-tight text-slate-950">{section.slice(2)}</h1>
			{:else if section.startsWith('## ')}
				<h2 class="pt-5 text-xl font-semibold text-slate-950">{section.slice(3)}</h2>
			{:else}
				<p>{section.replaceAll('**', '')}</p>
			{/if}
		{/each}
	</article>
</main>
