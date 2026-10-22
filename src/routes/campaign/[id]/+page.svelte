<script lang="ts">
	import { localDateTimeInput, formatCalendarDate } from '$lib/local-time';
	import LocalDate from '$lib/elements/local-date.svelte';
	import { page } from '$app/state';
	import CampaignWizard from '$lib/elements/campaign-wizard.svelte';
	import { saveCampaignQR } from '$lib/client/save-campaign-qr';
	import CampaignQRGallery from '$lib/elements/campaign-qr-gallery.svelte';
	import Generator from '$lib/elements/qr-generator.svelte';
	import ArtisticGenerator from '$lib/elements/artistic-generator.svelte';
	import Nav from '$lib/elements/nav/nav.svelte';
	import ContentForm from '$lib/elements/qr-content-form.svelte';
	import { contentFields, type ContentType } from '$lib/qr-content';
	import { onMount } from 'svelte';

	let campaign: any = $state(null);
	let galleryRevision = $state(0);
	let backlinkMode = $state<'standard' | 'artistic' | null>(null);
	let backlink = $derived(
		campaign?.qr_payload ||
			(campaign?.public_token
				? `${page.url.origin}/api/campaigns/redirect?token=${encodeURIComponent(campaign.public_token)}`
				: '')
	);
	let editing = $state(false);
	let savedMessage = $state('');
	let loading = $state(true);
	let analytics: any = $state(null);
	let analyticsError = $state('');
	let error = $state('');

	let editingField = $state(''),
		draft = $state(''),
		saving = $state(false);
	let contentValues = $state<Record<string, string>>({});
	function editField(key: string, value: unknown) {
		editingField = key;
		draft =
			key === 'expiration_date'
				? value
					? localDateTimeInput(String(value))
					: ''
				: String(value ?? '');
		error = '';
	}
	async function saveField(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';
		try {
			const value =
				editingField === 'expiration_date'
					? draft
						? new Date(draft).toISOString()
						: null
					: editingField === 'is_active'
						? draft === 'true'
						: draft;
			const response = await fetch('/api/campaigns/field', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: campaign.campaign_id, field: editingField, value })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error);
			editingField = '';
			savedMessage = 'Changes saved.';
			await loadCampaign();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save changes';
		} finally {
			saving = false;
		}
	}
	async function saveContent(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';
		try {
			const response = await fetch(`/api/campaigns?id=${campaign.campaign_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: campaign.title,
					description: campaign.description || '',
					purpose: campaign.purpose,
					values: contentValues,
					status: campaign.status,
					is_active: campaign.is_active,
					expiration_date: campaign.expiration_date,
					asset_ids: campaign.assets?.map((asset: any) => asset.id) || []
				})
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error);
			editingField = '';
			savedMessage = 'Content updated.';
			await loadCampaign();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save content';
		} finally {
			saving = false;
		}
	}

	async function loadCampaign() {
		try {
			const response = await fetch(`/api/campaigns?id=${page.params.id}`, {
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const data = await response.json();
			if (response.ok) {
				campaign = data.campaigns[0];
				if (campaign) {
					if (campaign.purpose === 'url' && !campaign.content_data?.values)
						campaign.content_data = {
							...campaign.content_data,
							values: { url: campaign.destination_url }
						};
					try {
						const response = await fetch(
							`/api/campaigns/analytics?id=${page.params.id}&timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`
						);
						if (!response.ok) throw new Error();
						analytics = await response.json();
					} catch {
						analyticsError = 'Analytics temporarily unavailable';
					}
				} else error = 'Campaign not found or unavailable for your account.';
			} else {
				error = data.error;
			}
		} catch (e) {
			error = 'Failed to load campaign';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadCampaign();
	});
</script>

<Nav></Nav>
<div class="w-full px-4 py-8 sm:px-6 lg:px-8">
	{#if loading}
		<div class="py-8 text-center">Loading campaign...</div>
	{:else if campaign}
		<a href="/campaign" class="mb-5 inline-block text-indigo-600">← All campaigns</a>
		{#if savedMessage}<p role="status" class="mb-4 text-emerald-700">{savedMessage}</p>{/if}
		{#if editing}<CampaignWizard
				editCampaign={campaign}
				onCancel={() => (editing = false)}
				onCreated={async () => {
					editing = false;
					savedMessage = 'Campaign updated.';
					await loadCampaign();
				}}
			/>{/if}
		<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
			<section class="mb-8 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
				<h1 class="border-b border-slate-200 p-6 text-3xl font-bold">Campaign details</h1>
				{#if error}<p role="alert" class="px-6 py-3 text-red-700">{error}</p>{/if}
				{#each [{ key: 'title', label: 'Name', value: campaign.title }, { key: 'description', label: 'Description', value: campaign.description || '' }, { key: 'status', label: 'Status', value: campaign.status }, { key: 'is_active', label: 'Link enabled', value: campaign.is_active !== false }, { key: 'expiration_date', label: 'Expiration (local time)', value: campaign.expiration_date }] as field}
					<div class="border-b border-slate-200 p-5 sm:px-6">
						<div class="flex items-start justify-between gap-5">
							<div class="min-w-0">
								<h2 class="text-sm font-medium text-slate-500">{field.label}</h2>
								<p class="mt-1 whitespace-pre-wrap break-words">
									{field.key === 'is_active'
										? field.value
											? 'Enabled'
											: 'Disabled'
										: field.key === 'expiration_date'
											? field.value
												? new Date(String(field.value)).toLocaleString()
												: 'No expiration'
											: field.value || 'Not set'}
								</p>
							</div>
							<button
								onclick={() => editField(field.key, field.value)}
								class="shrink-0 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600"
								aria-label={`Edit ${field.label}`}>Edit</button
							>
						</div>
						{#if editingField === field.key}<form onsubmit={saveField} class="mt-4 space-y-3">
								{#if field.key === 'status'}<select
										aria-label="Status"
										bind:value={draft}
										class="w-full"
										><option value="active">Active</option><option value="paused">Paused</option
										><option value="archived">Archived</option></select
									>
								{:else if field.key === 'is_active'}<select
										aria-label="Link enabled"
										bind:value={draft}
										class="w-full"
										><option value="true">Enabled</option><option value="false">Disabled</option
										></select
									>
								{:else if field.key === 'expiration_date'}<input
										aria-label="Expiration (local time)"
										type="datetime-local"
										bind:value={draft}
										class="w-full"
									/>
								{:else if field.key === 'description'}<textarea
										aria-label="Description"
										bind:value={draft}
										maxlength="5000"
										rows="3"
										class="w-full"
									></textarea>
								{:else}<input
										aria-label="Name"
										bind:value={draft}
										required
										maxlength="200"
										class="w-full"
									/>{/if}
								<button
									disabled={saving}
									class="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Save</button
								><button
									type="button"
									disabled={saving}
									onclick={() => (editingField = '')}
									class="ml-3 px-3 py-2">Cancel</button
								>
							</form>{/if}
					</div>
				{/each}
				<div class="flex items-center justify-between gap-5 border-b border-slate-200 p-5 sm:px-6">
					<div>
						<h2 class="text-sm font-medium text-slate-500">Purpose</h2>
						<p class="mt-1">{campaign.purpose}</p>
					</div>
					<button
						onclick={() => {
							editing = !editing;
							editingField = '';
						}}
						class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600"
						>Edit</button
					>
				</div>
				{#if ['pdf', 'mp3', 'gallery'].includes(campaign.purpose)}
					<div class="flex items-start justify-between gap-5 p-5 sm:px-6">
						<div class="min-w-0">
							<h2 class="text-sm font-medium text-slate-500">Files</h2>
							{#each campaign.content_data?.media_urls || [] as link}<p
									class="mt-2 break-all text-sm"
								>
									{link}
								</p>{/each}
						</div>
						<button
							onclick={() => {
								editing = !editing;
								editingField = '';
							}}
							class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600"
							>Edit</button
						>
					</div>
				{:else if campaign.content_data?.values}
					{#each contentFields[campaign.purpose as ContentType] || [] as field}
						<div class="border-b border-slate-200 p-5 sm:px-6">
							<div class="flex items-start justify-between gap-5">
								<div class="min-w-0">
									<h2 class="text-sm font-medium text-slate-500">{field.label}</h2>
									<p class="mt-1 whitespace-pre-wrap break-words">
										{field.key === 'password'
											? '••••••••'
											: campaign.content_data.values[field.key] || 'Not set'}
									</p>
								</div>
								<button
									onclick={() => {
										contentValues = structuredClone(campaign.content_data.values);
										editingField = `content:${field.key}`;
									}}
									class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600"
									>Edit</button
								>
							</div>
							{#if editingField === `content:${field.key}`}<form
									onsubmit={saveContent}
									class="mt-4 space-y-3"
								>
									<ContentForm
										type={campaign.purpose as ContentType}
										bind:values={contentValues}
										onlyField={field.key}
									/><button
										disabled={saving}
										class="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Save</button
									><button
										type="button"
										disabled={saving}
										onclick={() => (editingField = '')}
										class="ml-3 px-3 py-2">Cancel</button
									>
								</form>{/if}
						</div>
					{/each}
				{:else}<div class="flex items-start justify-between gap-5 p-5 sm:px-6">
						<div class="min-w-0">
							<h2 class="text-sm font-medium text-slate-500">QR content</h2>
							<p class="mt-1 break-all">{campaign.qr_payload || campaign.destination_url}</p>
						</div>
						<button
							onclick={() => {
								editing = !editing;
								editingField = '';
							}}
							class="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600"
							>Edit</button
						>
					</div>{/if}
				{#if backlink}
					<div class="border-t border-slate-200 p-5 sm:px-6">
						<label for="campaign-backlink" class="text-sm font-medium text-slate-500"
							>{campaign.qr_payload ? 'QR content' : 'Backlink · tracking URL'}</label
						>
						<input
							id="campaign-backlink"
							value={backlink}
							readonly
							class="mt-2 w-full font-mono text-sm"
						/>
						<p class="mt-2 text-xs text-slate-500">
							{campaign.qr_payload
								? 'Direct QR content. Changes require generating a new QR image.'
								: 'Permanent campaign link. QR codes use this link so destination changes keep working and visits can be counted.'}
						</p>
						<div class="mt-4 flex flex-wrap gap-3">
							<button
								onclick={() => (backlinkMode = 'standard')}
								aria-pressed={backlinkMode === 'standard'}
								class="rounded-xl border border-indigo-200 px-4 py-3 font-semibold text-indigo-600"
								>Create standard QR</button
							><button
								onclick={() => (backlinkMode = 'artistic')}
								aria-pressed={backlinkMode === 'artistic'}
								class="rounded-xl border border-indigo-200 px-4 py-3 font-semibold text-indigo-600"
								>Create Artistic QR / GIF</button
							>
						</div>
						{#if backlinkMode}<div class="mt-5">
								<button onclick={() => (backlinkMode = null)} class="mb-3 text-sm text-slate-500"
									>Close QR designer</button
								>{#if backlinkMode === 'standard'}<Generator
										onSave={async (file, content) => {
											await saveCampaignQR(campaign.campaign_id, 'standard', file, content);
											galleryRevision++;
										}}
										fixedContent={backlink}
										embedded
									/>{:else}<ArtisticGenerator
										fixedContent={backlink}
										embedded
										onSave={async (file, content) => {
											await saveCampaignQR(campaign.campaign_id, 'artistic', file, content);
											galleryRevision++;
										}}
									/>{/if}
							</div>{/if}
					</div>
				{/if}
			</section>

			<div class="min-w-0 space-y-6">
				<section class="mb-8 min-w-0 rounded-lg bg-white p-6 shadow-md">
					{#if campaign.qr_payload}<h2 class="mb-4 text-2xl font-semibold">Direct QR campaign</h2>
						<p class="mb-4 text-slate-500">
							This QR contains its content directly. Scan analytics are not available.
						</p>{:else}
						<h2 class="mb-4 text-2xl font-semibold">Scan analytics · last 30 days</h2>
						<p class="mb-4 text-sm text-slate-600">
							Openings of your tracked link. Dates follow your device’s time zone. Visitor counts
							are approximate; shared links and previews may also open this URL.
						</p>
						{#if analytics}
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
								<div class="flex flex-col gap-3">
									{#each [['Openings', analytics.summary.total], ['Bots / previews', analytics.summary.bots], ['Daily visitors (sum)', analytics.summary.daily_visitor_sum], ['Rapid repeats', analytics.summary.rapid_repeats]] as [label, value]}
										<div class="rounded-xl border p-3">
											<p class="text-sm">{label}</p>
											<strong class="text-2xl">{value}</strong>
										</div>
									{/each}
								</div>
								<div class="min-w-0 rounded-xl border p-4">
									<h3 class="font-semibold">Daily activity · local time</h3>
									<p class="mt-1 text-sm text-slate-500">Openings per day</p>
									{#if analytics.daily.length}
										{@const peak = Math.max(
											1,
											...analytics.daily.map((day: any) => Number(day.total))
										)}
										<div
											class="mt-4 flex h-64 items-end gap-2 overflow-x-auto border-b border-slate-300"
											role="img"
											aria-label="Daily openings chart. Exact values are listed below."
										>
											{#each analytics.daily as day}
												<div
													class="flex h-full min-w-6 flex-1 flex-col items-center justify-end gap-1"
													title={`${formatCalendarDate(day.day)}: ${day.total} openings · ${day.visitors} visitors`}
												>
													<span class="text-xs font-semibold">{day.total}</span>
													<div
														class="w-full max-w-16 rounded-t bg-indigo-500"
														style:height={`${(Number(day.total) / peak) * 85}%`}
													></div>
												</div>
											{/each}
										</div>
										<div class="mt-2 flex justify-between gap-2 text-xs text-slate-500">
											<span>{formatCalendarDate(analytics.daily[0].day)}</span>
											{#if analytics.daily.length > 1}<span
													>{formatCalendarDate(
														analytics.daily[analytics.daily.length - 1].day
													)}</span
												>{/if}
										</div>
										<details class="mt-4 text-sm">
											<summary class="cursor-pointer">Daily values</summary>
											{#each analytics.daily as day}<p class="mt-2">
													{formatCalendarDate(day.day)}: {day.total} openings · {day.visitors} visitors
												</p>{/each}
										</details>
									{:else}<p class="flex h-64 items-center justify-center text-sm text-slate-500">
											No tracked openings yet.
										</p>{/if}
								</div>
							</div>
							<h3 class="mt-5 font-semibold">Devices (excluding bots)</h3>
							{#each analytics.devices as device}<p>{device.device_type}: {device.total}</p>{/each}
						{:else}<p>{analyticsError || 'Loading analytics…'}</p>{/if}
					{/if}
				</section>
				<CampaignQRGallery campaignId={campaign.campaign_id} revision={galleryRevision} />
			</div>
		</div>
	{:else if error}
		<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700" role="alert">
			<span class="block sm:inline">{error}</span>
		</div>
	{/if}
</div>
