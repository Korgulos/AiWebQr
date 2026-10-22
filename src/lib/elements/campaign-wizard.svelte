<script lang="ts">
	import {
		campaignPurposes,
		isMedia,
		prepareCampaign,
		type CampaignPurpose
	} from '$lib/campaign-purposes';
	import { emptyContent, type ContentType, type ContentValues } from '$lib/qr-content';
	import { localDateTimeInput } from '$lib/local-time';
	import { saveCampaignQR } from '$lib/client/save-campaign-qr';
	import { onMount } from 'svelte';
	import Generator from './qr-generator.svelte';
	import ArtisticGenerator from './artistic-generator.svelte';
	import ContentForm from './qr-content-form.svelte';
	let {
		onCreated,
		editCampaign = null,
		onCancel
	}: { onCreated: (campaign: any) => void; editCampaign?: any; onCancel?: () => void } = $props();
	let status = $state('active'),
		isActive = $state(true),
		expiry = $state('');
	onMount(() => {
		if (!editCampaign) return;
		purpose = editCampaign.purpose || 'url';
		title = editCampaign.title;
		description = editCampaign.description || '';
		values = structuredClone(
			editCampaign.content_data?.values ||
				(editCampaign.purpose === 'url'
					? { url: editCampaign.destination_url }
					: editCampaign.content_data?.media_urls
						? { media_urls: editCampaign.content_data.media_urls.join('\n') }
						: { text: editCampaign.qr_payload || '' })
		);
		if (!editCampaign.content_data?.values && editCampaign.qr_payload) purpose = 'text';
		uploaded = structuredClone(editCampaign.assets || []);
		status = editCampaign.status;
		isActive = editCampaign.is_active !== false;
		expiry = editCampaign.expiration_date ? localDateTimeInput(editCampaign.expiration_date) : '';
	});
	let saved = $state<any>(null);
	let qrContent = $state('');
	let generatorMode = $state<'standard' | 'artistic'>('standard');
	function finish() {
		saved = null;
		purpose = null;
		title = '';
		description = '';
		values = emptyContent();
		qrContent = '';
		generatorMode = 'standard';
	}

	let purpose = $state<CampaignPurpose | null>(null),
		values = $state<ContentValues>(emptyContent());
	let title = $state(''),
		description = $state(''),
		busy = $state(false),
		error = $state('');
	let uploaded = $state<{ id: string; url: string; name: string; size: number }[]>([]);
	let consent = $state(false);
	async function uploadFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files || []);
		if (!files.length || !purpose) return;
		if (!consent) {
			error = 'Confirm that these files may be public.';
			input.value = '';
			return;
		}
		if (uploaded.length + files.length > (purpose === 'gallery' ? 12 : 1)) {
			error = 'Too many files for this campaign.';
			input.value = '';
			return;
		}
		busy = true;
		error = '';
		try {
			for (const file of files) {
				if (file.size > 3 * 1024 * 1024) throw new Error('Maximum file size is 3 MB.');
				const form = new FormData();
				form.set('file', file);
				form.set('purpose', purpose);
				const response = await fetch('/api/campaigns/media', { method: 'POST', body: form });
				const data = await response.json();
				if (!response.ok) throw new Error(data.error || 'Upload failed');
				uploaded = [...uploaded, data.asset];
			}
			values.media_urls = uploaded.map((file) => file.url).join('\n');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Upload failed';
			values.media_urls = uploaded.map((file) => file.url).join('\n');
		} finally {
			busy = false;
			input.value = '';
		}
	}
	async function removeFile(id: string) {
		if (editCampaign?.assets?.some((file: any) => file.id === id)) {
			uploaded = uploaded.filter((file) => file.id !== id);
			values.media_urls = uploaded.map((file) => file.url).join('\n');
			return;
		}
		busy = true;
		error = '';
		try {
			const response = await fetch('/api/campaigns/media', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error);
			uploaded = uploaded.filter((file) => file.id !== id);
			values.media_urls = uploaded.map((file) => file.url).join('\n');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not remove file';
		} finally {
			busy = false;
		}
	}

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (!purpose) return;
		busy = true;
		error = '';
		try {
			prepareCampaign(purpose, values);
			const response = await fetch(
				editCampaign ? `/api/campaigns?id=${editCampaign.campaign_id}` : '/api/campaigns',
				{
					method: editCampaign ? 'PATCH' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title,
						description,
						purpose,
						values,
						asset_ids: uploaded.map((file) => file.id),
						status,
						is_active: isActive,
						expiration_date: expiry ? new Date(expiry).toISOString() : null
					})
				}
			);
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Could not create campaign');
			onCreated(data.campaign);
			if (editCampaign) return;
			saved = data.campaign;
			qrContent =
				data.campaign.qr_payload ||
				`${window.location.origin}/api/campaigns/redirect?token=${encodeURIComponent(data.campaign.public_token)}`;
			uploaded = [];
			consent = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create campaign';
		} finally {
			busy = false;
		}
	}
</script>

<section class="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
	<p class="text-sm font-semibold text-indigo-600">
		{editCampaign
			? 'EDIT CAMPAIGN'
			: saved
				? 'STEP 3 OF 3 · QR DESIGN'
				: purpose
					? 'STEP 2 OF 3 · CONTENT'
					: 'STEP 1 OF 3 · PURPOSE'}
	</p>
	<h2 class="mt-2 text-2xl font-bold">
		{saved
			? 'Design your campaign QR'
			: purpose
				? `${editCampaign ? 'Edit' : 'Create'} ${campaignPurposes.find((type) => type.id === purpose)?.label} campaign`
				: 'What should your QR code do?'}
	</h2>
	{#if saved}
		<p class="mt-3 text-sm text-slate-500">
			Campaign saved: {saved.title}. Both generators use the content from step 2. Tracked campaigns
			keep their analytics link.
		</p>
		<div class="mt-5 flex flex-wrap gap-3">
			<button
				aria-pressed={generatorMode === 'standard'}
				onclick={() => (generatorMode = 'standard')}
				class="rounded-xl border border-indigo-200 px-5 py-3 font-semibold text-indigo-600"
				>Standard QR</button
			><button
				aria-pressed={generatorMode === 'artistic'}
				onclick={() => (generatorMode = 'artistic')}
				class="rounded-xl border border-indigo-200 px-5 py-3 font-semibold text-indigo-600"
				>Artistic QR / GIF</button
			>
		</div>
		{#if generatorMode === 'standard'}<Generator
				onSave={(file, content) => saveCampaignQR(saved.campaign_id, 'standard', file, content)}
				fixedContent={qrContent}
				embedded
			/>{:else}<ArtisticGenerator
				fixedContent={qrContent}
				embedded
				onSave={(file, content) => saveCampaignQR(saved.campaign_id, 'artistic', file, content)}
			/>{/if}
		<button
			onclick={finish}
			class="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white"
			>Done · create another campaign</button
		>
	{:else if !purpose}
		<p class="mt-2 text-slate-500">Choose a purpose to see the right fields for your campaign.</p>
		<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each campaignPurposes as type}<button
					onclick={() => {
						purpose = type.id;
						values = emptyContent();
						error = '';
					}}
					class="rounded-xl border border-slate-200 p-5 text-left hover:border-indigo-500 hover:bg-indigo-50"
					><span class="text-2xl text-indigo-600" aria-hidden="true">{type.symbol}</span><span
						class="mt-3 block font-semibold">{type.label}</span
					><span class="mt-1 block text-sm text-slate-500">{type.description}</span></button
				>{/each}
		</div>
	{:else}
		<button
			onclick={() => {
				purpose = null;
				error = '';
			}}
			disabled={busy || uploaded.length > 0}
			class="mt-4 text-sm font-semibold text-indigo-600">← Change purpose</button
		>
		<form onsubmit={create} class="mt-6 space-y-5">
			{#if editCampaign}
				<p class="text-sm text-slate-500">
					Tracked links keep their public token. Direct QR content changes require downloading and
					sharing a new QR code. Older campaigns without editable field data open as raw text.
				</p>
				<div>
					<label for="campaign-purpose" class="block text-sm font-medium">Purpose</label><select
						id="campaign-purpose"
						value={purpose}
						disabled={busy || uploaded.length > 0}
						onchange={(event) => {
							purpose = event.currentTarget.value as CampaignPurpose;
							values = emptyContent();
						}}
						class="mt-2 w-full"
						>{#each campaignPurposes as type}<option value={type.id}>{type.label}</option
							>{/each}</select
					>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="campaign-status" class="block text-sm font-medium">Status</label><select
							id="campaign-status"
							bind:value={status}
							class="mt-2 w-full"
							><option value="active">Active</option><option value="paused">Paused</option><option
								value="archived">Archived</option
							></select
						>
					</div>
					<div>
						<label for="campaign-expiry" class="block text-sm font-medium"
							>Expires at (local time, optional)</label
						><input
							id="campaign-expiry"
							type="datetime-local"
							bind:value={expiry}
							class="mt-2 w-full"
						/>
					</div>
				</div>
				<label class="flex gap-3"
					><input type="checkbox" bind:checked={isActive} />Tracking link enabled</label
				>
			{/if}

			<div class="grid items-start gap-5 sm:grid-cols-2">
				<div>
					<label for="campaign-title" class="block text-sm font-medium">Campaign name</label><input
						id="campaign-title"
						bind:value={title}
						required
						maxlength="200"
						class="mt-2 w-full"
					/>
				</div>
				<details
					class="rounded-xl border border-slate-200 p-3 sm:mt-7"
					open={!!editCampaign?.description}
				>
					<summary class="cursor-pointer text-sm font-medium"
						>Description <span class="font-normal text-slate-500">(optional)</span></summary
					>
					<label for="campaign-description" class="sr-only">Description</label><textarea
						id="campaign-description"
						bind:value={description}
						maxlength="5000"
						rows="3"
						placeholder="Add a description…"
						class="mt-3 w-full"
					></textarea>
				</details>
			</div>

			{#if isMedia(purpose)}
				<div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
					<h3 class="font-semibold">Add your files</h3>
					<p class="mt-2 text-sm">
						Upload files or use existing public links. Uploaded files are public to anyone with the
						URL.
					</p>
				</div>
				<label class="flex items-start gap-3 text-sm"
					><input type="checkbox" bind:checked={consent} disabled={busy} />I understand uploaded
					files are public.</label
				>
				<div>
					<label for="campaign-upload" class="block text-sm font-medium"
						>Upload {purpose === 'gallery'
							? 'images'
							: purpose === 'mp3'
								? 'MP3 audio'
								: 'PDF document'}</label
					><input
						id="campaign-upload"
						type="file"
						multiple={purpose === 'gallery'}
						accept={purpose === 'gallery'
							? 'image/png,image/jpeg,image/webp'
							: purpose === 'mp3'
								? 'audio/mpeg,.mp3'
								: 'application/pdf,.pdf'}
						onchange={uploadFiles}
						disabled={busy || !consent}
						class="mt-2 max-w-full"
					/>
					<p class="mt-2 text-xs text-slate-500">
						Maximum 3 MB per file. Gallery: up to 12 images.
					</p>
				</div>
				{#each uploaded as file}<div
						class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
					>
						<span class="truncate text-sm">{file.name}</span><button
							type="button"
							disabled={busy}
							onclick={() => removeFile(file.id)}
							class="text-sm text-red-600">Remove</button
						>
					</div>{/each}

				<div>
					<label for="campaign-media" class="block text-sm font-medium"
						>{purpose === 'gallery'
							? 'Image links · one per line, maximum 12'
							: 'Public HTTPS file link'}</label
					><textarea
						id="campaign-media"
						readonly={uploaded.length > 0}
						bind:value={values.media_urls}
						placeholder={purpose === 'pdf'
							? 'https://example.com/menu.pdf'
							: purpose === 'mp3'
								? 'https://example.com/audio.mp3'
								: 'https://example.com/photo.jpg'}
						required
						rows={purpose === 'gallery' ? 4 : 2}
						class="mt-2 w-full"
					></textarea>
				</div>
			{:else}<ContentForm type={purpose as ContentType} bind:values />{/if}
			<p class="text-sm text-slate-500">
				{purpose === 'url' || isMedia(purpose)
					? 'Tracked link · visits appear in campaign analytics.'
					: 'Direct QR content · saved to your account. Scans cannot be counted and content cannot change in already printed codes.'}
			</p>
			{#if error}<p role="alert" class="text-red-700">{error}</p>{/if}
			<button
				disabled={busy}
				class="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
				>{busy ? 'Saving…' : editCampaign ? 'Save changes' : 'Save & continue to QR design'}</button
			>
			{#if editCampaign}<button
					type="button"
					disabled={busy}
					onclick={onCancel}
					class="ml-3 rounded-xl border border-slate-200 px-5 py-3">Cancel</button
				>{/if}
		</form>
	{/if}
</section>
