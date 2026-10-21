<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { onDestroy, onMount } from 'svelte';
	import { fetchGifBlob, parseGifLink } from '$lib/gif-sources';

	type Gif = { id: string; title: string; url: string; images: Record<string, { url: string }> };
	let {
		mode = 'search',
		disabled = false,
		onSelect,
		onBusy
	}: {
		mode?: 'search' | 'link';
		disabled?: boolean;
		onSelect: (image: string, source: string) => void;
		onBusy: (busy: boolean) => void;
	} = $props();
	let link = $state('');
	let query = $state('');
	let results = $state<Gif[]>([]);
	let busy = $state(false);
	let searching = $state(false);
	let message = $state('');
	let controller: AbortController | null = null;
	let searchController: AbortController | null = null;
	const apiKey = env.PUBLIC_GIPHY_API_KEY || '';
	onMount(() => {
		if (apiKey && mode === 'search') void searchGifs();
	});
	onDestroy(() => {
		controller?.abort();
		searchController?.abort();
	});

	async function getGiphy(path: string, params: Record<string, string>, signal: AbortSignal) {
		const url = new URL(`https://api.giphy.com/v1/gifs/${path}`);
		url.searchParams.set('api_key', apiKey);
		for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
		const response = await fetch(url, { signal, credentials: 'omit' });
		if (!response.ok)
			throw new Error('GIPHY is currently unavailable. Try a direct GIF link or upload a file.');
		return response.json();
	}

	async function searchGifs(event?: SubmitEvent) {
		event?.preventDefault();
		if (!apiKey || searching) return;
		searchController?.abort();
		searchController = new AbortController();
		const timeout = setTimeout(() => searchController?.abort(), 15000);
		searching = true;
		message = '';
		results = [];
		try {
			const data = await getGiphy(
				'search',
				{ q: query.trim() ? query : 'best gifs', limit: '12', rating: 'g' },
				searchController.signal
			);
			results = data.data;
			if (!results.length) message = 'No GIFs found. Try another search.';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Unable to search GIPHY.';
		} finally {
			clearTimeout(timeout);
			searching = false;
		}
	}

	async function importGif(mediaUrl: string, sourceUrl: string, giphyId?: string) {
		if (disabled || busy) return;
		controller?.abort();
		controller = new AbortController();
		const timeout = setTimeout(() => controller?.abort(), 20000);
		busy = true;
		onBusy(true);
		message = '';
		try {
			if (giphyId) {
				const data = await getGiphy(giphyId, {}, controller.signal);
				const gif: Gif = data.data;
				mediaUrl = gif.images.downsized?.url || gif.images.original.url;
				sourceUrl = gif.url;
			}
			const blob = await fetchGifBlob(mediaUrl, controller.signal);
			const image = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(new Error('Unable to read this GIF.'));
				reader.readAsDataURL(blob);
			});
			onSelect(image, sourceUrl);
			message = 'GIF selected. Add your link or text, then generate your QR code.';
		} catch (error) {
			message =
				error instanceof TypeError
					? 'This website blocks direct GIF imports. Download the GIF and use Choose file, or try another link.'
					: error instanceof Error && error.name === 'AbortError'
						? 'Loading timed out. Try a smaller GIF or upload the file.'
						: error instanceof Error
							? error.message
							: 'Unable to import GIF.';
		} finally {
			clearTimeout(timeout);
			busy = false;
			onBusy(false);
		}
	}

	async function importLink(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		try {
			const parsed = parseGifLink(link);
			if (parsed.giphyId) {
				if (!apiKey)
					throw new Error(
						'Copy the GIF Link from GIPHY’s Share options, rather than its webpage address.'
					);
				await importGif(parsed.url.href, parsed.url.href, parsed.giphyId);
			} else await importGif(parsed.url.href, parsed.url.href);
		} catch (error) {
			message = error instanceof Error ? error.message : 'Unable to import this link.';
		}
	}
</script>

<div class="space-y-3 border-t border-slate-100 pt-4">
	{#if mode === 'search'}
		<h2 class="text-sm font-semibold text-slate-800">Find a GIF on GIPHY</h2>
		<a
			href="https://giphy.com/explore/free"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
			>Browse GIPHY <span aria-hidden="true">↗</span></a
		>
		{#if apiKey}
			<form onsubmit={searchGifs} class="flex gap-2">
				<label for="gif-search" class="sr-only">Search GIPHY</label>
				<input
					id="gif-search"
					bind:value={query}
					maxlength="100"
					placeholder="Search GIFs: waves, space, cats…"
					class="min-w-0 flex-1"
					disabled={disabled || searching || busy}
				/>
				<button
					type="submit"
					disabled={disabled || searching || busy}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
					>{searching ? 'Searching…' : 'Search'}</button
				>
			</form>
			<div
				class="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto overscroll-contain"
				aria-label="GIPHY search results"
			>
				{#each results as gif (gif.id)}
					<button
						type="button"
						disabled={disabled || busy}
						onclick={() => importGif(gif.images.downsized?.url || gif.images.original.url, gif.url)}
						class="overflow-hidden rounded-lg border-2 border-transparent bg-slate-100 focus-visible:border-indigo-600"
						aria-label={`Use ${gif.title || 'this GIF'}`}
					>
						<img
							src={gif.images.fixed_width?.url || gif.images.original.url}
							alt={gif.title || 'GIPHY GIF'}
							loading="lazy"
							class="aspect-square w-full object-cover"
						/>
					</button>
				{/each}
			</div>
			<a
				href="https://giphy.com/"
				target="_blank"
				rel="noopener noreferrer"
				class="block text-xs font-bold tracking-widest text-slate-700">Powered By GIPHY</a
			>
		{:else}
			<p class="text-sm leading-6 text-slate-500">
				Browse GIPHY, open a GIF and copy its GIF link from the Share options. Paste it below to use
				it here.
			</p>
		{/if}
	{:else}
		<h2 class="text-sm font-semibold text-slate-800">Use a GIF link</h2>
		<form onsubmit={importLink} class="flex flex-wrap gap-2">
			<label for="gif-link" class="sr-only">Direct GIF link</label>
			<input
				id="gif-link"
				type="url"
				bind:value={link}
				placeholder="https://media.giphy.com/…/giphy.gif"
				class="min-w-0 flex-1 basis-48"
				disabled={disabled || busy}
				required
			/>
			<button
				type="submit"
				disabled={disabled || busy || !link.trim()}
				class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
				>{busy ? 'Loading GIF…' : 'Use GIF'}</button
			>
		</form>
		<p class="text-xs leading-5 text-slate-500">
			Direct GIF files up to 5 MB. Some websites require downloading the file first.
		</p>
	{/if}
	{#if message}<p role="status" class="text-sm leading-6 text-indigo-700">{message}</p>{/if}
</div>
