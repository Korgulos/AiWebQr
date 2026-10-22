<script lang="ts">
	import CampaignQRPreview from '$lib/elements/campaign-qr-preview.svelte';
	import { page } from '$app/state';
	import LocalDate from '$lib/elements/local-date.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	import CampaignWizard from '$lib/elements/campaign-wizard.svelte';
	import Nav from '$lib/elements/nav/nav.svelte';

	let campaigns: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	async function loadCampaigns() {
		try {
			const response = await fetch('/api/campaigns', {
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const data = await response.json();
			if (response.ok) {
				campaigns = data.campaigns;
				error = '';
			} else {
				error = data.error;
			}
		} catch (e) {
			error = 'Failed to load campaigns';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadCampaigns();
	});
</script>

<Nav></Nav>
<div class="w-full px-4 py-8 sm:px-6 lg:px-8">
	<h1 class="mb-8 text-3xl font-bold">Your campaigns</h1>

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
		<div class="min-w-0">
			{#if data.user}
				<CampaignWizard
					onCreated={(campaign) => {
						campaigns = [campaign, ...campaigns];
					}}
				/>
			{/if}
		</div>
		<section class="min-w-0" aria-labelledby="campaign-list-heading">
			<h2 id="campaign-list-heading" class="mb-5 text-xl font-semibold">Saved campaigns</h2>
			{#if error}
				<div
					class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
					role="alert"
				>
					<span class="block sm:inline">{error}</span>
				</div>
			{/if}

			{#if loading}
				<div class="py-8 text-center">Loading campaigns...</div>
			{:else}
				<div class="space-y-6">
					{#each campaigns as campaign}
						<div
							class="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,0.55fr)] items-center gap-3 rounded-lg bg-white p-6 shadow-md"
						>
							<div class="col-start-2 row-start-1">
								<CampaignQRPreview
									content={campaign.qr_payload ||
										`${page.url.origin}/api/campaigns/redirect?token=${encodeURIComponent(campaign.public_token)}`}
								/>
							</div>
							<div class="col-start-1 row-start-1 min-w-0">
								<h3 class="mb-2 break-words text-xl font-semibold">
									<a href="/campaign/{campaign.campaign_id}" class="hover:text-indigo-600">
										{campaign.title}
									</a>
								</h3>
								<p class="mb-4 text-gray-600">{campaign.description}</p>

								<div class="flex flex-wrap justify-between gap-x-3 text-sm text-gray-500">
									<span>By {campaign.author_name}</span>
								</div>
								<div class="mt-4 flex items-center justify-between">
									<span class="text-sm text-gray-500"
										>{campaign.purpose || 'url'} · {campaign.qr_payload
											? 'Direct QR · no scan tracking'
											: 'Tracked link'}</span
									>
								</div>
							</div>
							<div class="col-start-3 row-start-1 text-right text-sm text-gray-500">
								<LocalDate value={campaign.created_at} dateOnly />
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
