<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head
	><title>{data.campaign.title} | QR Gen Me</title><meta
		name="robots"
		content="noindex,nofollow"
	/></svelte:head
>
<main class="mx-auto max-w-5xl space-y-6 px-4 py-12">
	<p class="font-semibold text-indigo-600">QR Gen Me</p>
	<h1 class="text-3xl font-bold">{data.campaign.title}</h1>
	<p class="text-slate-500">{data.campaign.description}</p>
	{#if data.campaign.purpose === 'gallery'}<div class="grid gap-5 sm:grid-cols-2">
			{#each data.campaign.content_data.media_urls as link, i}<a
					href={link}
					target="_blank"
					rel="noopener noreferrer"
					><img
						src={link}
						alt={`Gallery image ${i + 1}`}
						referrerpolicy="no-referrer"
						loading="lazy"
						class="w-full rounded-xl object-contain"
					/></a
				>{/each}
		</div>
	{:else if data.campaign.purpose === 'mp3'}<audio
			controls
			preload="none"
			src={data.campaign.content_data.media_urls[0]}
			class="w-full">Your browser does not support audio playback.</audio
		><a
			href={data.campaign.content_data.media_urls[0]}
			rel="noreferrer"
			class="inline-block text-indigo-600">Open audio file →</a
		>
	{:else}<a
			href={data.campaign.content_data.media_urls[0]}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-block rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white"
			>Open PDF document →</a
		>{/if}
</main>
