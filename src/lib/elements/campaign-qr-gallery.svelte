<script lang="ts">
	import LocalDate from '$lib/elements/local-date.svelte';
	let { campaignId, revision = 0 }: { campaignId: string; revision?: number } = $props();
	type Design = {
		design_id: string;
		image_url: string;
		mime_type: string;
		mode: string;
		created_at: string;
	};
	let designs = $state<Design[]>([]),
		loading = $state(true),
		error = $state('');
	$effect(() => {
		const id = campaignId;
		revision;
		const abort = new AbortController();
		loading = true;
		error = '';
		fetch(`/api/campaigns/designs?campaign=${encodeURIComponent(id)}`, { signal: abort.signal })
			.then(async (response) => {
				const data = await response.json();
				if (!response.ok) throw new Error(data.error);
				designs = data.designs;
			})
			.catch((e) => {
				if (e.name !== 'AbortError') error = e.message || 'Gallery unavailable';
			})
			.finally(() => {
				if (!abort.signal.aborted) loading = false;
			});
		return () => abort.abort();
	});
	async function download(design: Design) {
		try {
			const response = await fetch(design.image_url, { credentials: 'omit' });
			if (!response.ok) throw new Error();
			const url = URL.createObjectURL(await response.blob());
			const link = document.createElement('a');
			link.href = url;
			link.download = `campaign-qr-${design.design_id}.${design.mime_type === 'image/gif' ? 'gif' : 'png'}`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		} catch {
			error = 'Could not download image. Open the preview to save it.';
		}
	}
</script>

<section class="rounded-2xl border border-slate-200 bg-white p-6">
	<div class="flex items-center justify-between gap-3">
		<h2 class="text-xl font-semibold">Saved QR designs</h2>
		<span class="text-sm text-slate-500">{designs.length}</span>
	</div>
	<p class="mt-2 text-sm text-slate-500">
		Standard and Artistic QR codes saved for this campaign. Saved images are snapshots; changing the
		campaign content does not regenerate them.
	</p>
	{#if loading}<p class="mt-5 text-slate-500">Loading gallery…</p>{:else if error}<p
			role="alert"
			class="mt-5 text-red-700"
		>
			{error}
		</p>{:else if !designs.length}<p
			class="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500"
		>
			No saved QR designs yet. Open a QR designer and choose “Save to campaign”.
		</p>{:else}
		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			{#each designs as design}<article
					class="min-w-0 overflow-hidden rounded-xl border border-slate-200"
				>
					<a
						href={design.image_url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`Open ${design.mode} QR preview`}
						><img
							src={design.image_url}
							alt={`Saved ${design.mode} QR code`}
							loading="lazy"
							class="h-48 w-full bg-white object-contain p-3"
						/></a
					>
					<div class="space-y-2 border-t border-slate-200 p-3">
						<p class="text-sm font-semibold">
							{design.mode === 'artistic' ? 'Artistic QR' : 'Standard QR'}{design.mime_type ===
							'image/gif'
								? ' · GIF'
								: ''}
						</p>
						<p class="text-xs text-slate-500"><LocalDate value={design.created_at} /></p>
						<button onclick={() => download(design)} class="text-sm font-semibold text-indigo-600"
							>Download</button
						>
					</div>
				</article>{/each}
		</div>{/if}
</section>
