<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import Nav from '$lib/elements/nav/nav.svelte';
	import QRCodeStyling from 'qr-code-styling';
	import type { Options as QRCodeStylingOptions } from 'qr-code-styling';

	let campaigns: any[] = $state([]);
	let newCampaign = $state({
		title: '',
		description: '',
		destination_url: '',
		backlink_id: null as number | null
	});
	let loading = $state(true);
	let error = $state('');
	let selectedCampaignId: number | null = null;
	let qrCode: QRCodeStyling | null = null;
	let showQRModal = $state(false);
	let qrPreviewContainer: HTMLDivElement | undefined = $state();
	// QR Code styling options
	let qrSize = $state(300);
	let qrColor = $state('#000000');
	let qrBackgroundColor = '#ffffff';

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

	async function createCampaign() {
		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newCampaign)
			});
			const data = await response.json();
			if (response.ok) {
				campaigns = [data.campaign, ...campaigns];
				newCampaign = { title: '', description: '', destination_url: '', backlink_id: null };
				error = '';
			} else {
				error = data.error || 'Failed to create campaign';
			}
		} catch (e) {
			error = 'Failed to create campaign';
		}
	}

	async function generateCampaignQR(campaignId: number) {
		selectedCampaignId = campaignId;
		showQRModal = true;

		const redirectUrl = `${window.location.origin}/api/campaigns/redirect?id=${campaignId}`;

		const options: QRCodeStylingOptions = {
			width: qrSize,
			height: qrSize,
			data: redirectUrl,
			margin: 10,
			type: 'svg',
			qrOptions: {
				errorCorrectionLevel: 'H'
			},
			dotsOptions: {
				color: qrColor,
				type: 'square'
			},
			backgroundOptions: {
				color: qrBackgroundColor
			}
		};

		if (qrCode) {
			qrCode.update(options);
		} else {
			qrCode = new QRCodeStyling(options);
		}

		// Wait for modal to be shown
		await new Promise((resolve) => setTimeout(resolve, 100));

		if (qrPreviewContainer) {
			qrPreviewContainer.innerHTML = '';
			await qrCode.append(qrPreviewContainer);
		}
	}

	async function downloadQR() {
		if (!qrCode) return;
		try {
			await qrCode.download({
				name: `campaign-qr-${selectedCampaignId}-${new Date().toISOString().slice(0, 10)}`,
				extension: 'png'
			});
		} catch (err) {
			error = 'Failed to download QR code';
		}
	}

	onMount(() => {
		if ($authStore.user) {
			loadCampaigns();
		} else {
			const returnUrl = encodeURIComponent(window.location.pathname);
			goto(`/login?returnTo=${returnUrl}`);
		}
	});
</script>

<Nav></Nav>
<div class="mx-auto max-w-4xl p-4">
	<h1 class="mb-8 text-3xl font-bold">Your campaigns</h1>

	{#if $authStore.user}
		<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold">Create New Campaign</h2>
			<form onsubmit={preventDefault(createCampaign)} class="space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium text-gray-700">Title</label>
					<input
						type="text"
						id="title"
						bind:value={newCampaign.title}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						required
					/>
				</div>
				<div>
					<label for="destination" class="block text-sm font-medium text-gray-700"
						>Destination URL</label
					>
					<input
						id="destination"
						type="url"
						bind:value={newCampaign.destination_url}
						required
						placeholder="https://example.com"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
					/>
				</div>
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700"
						>Description</label
					>
					<textarea
						id="description"
						bind:value={newCampaign.description}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						rows="4"
						required
					></textarea>
				</div>
				<button
					type="submit"
					class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
				>
					Create Campaign
				</button>
			</form>
		</div>
	{/if}

	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700" role="alert">
			<span class="block sm:inline">{error}</span>
		</div>
	{/if}

	{#if loading}
		<div class="py-8 text-center">Loading campaigns...</div>
	{:else}
		<div class="space-y-6">
			{#each campaigns as campaign}
				<div class="rounded-lg bg-white p-6 shadow-md">
					<h3 class="mb-2 text-xl font-semibold">
						<a href="/campaign/{campaign.campaign_id}" class="hover:text-indigo-600">
							{campaign.title}
						</a>
					</h3>
					<p class="mb-4 text-gray-600">{campaign.description}</p>
					<div class="flex justify-between text-sm text-gray-500">
						<span>By {campaign.author_name}</span>
						<span>{new Date(campaign.created_at).toLocaleDateString()}</span>
					</div>
					<div class="mt-4 flex items-center justify-between">
						<span class="text-sm text-gray-500">{campaign.comment_count} comments</span>
						<button
							class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
							onclick={() => generateCampaignQR(campaign.campaign_id)}
						>
							Generate QR Code
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- QR Code Modal -->
{#if showQRModal}
	<div class="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
		<div class="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
			<div class="flex flex-col items-center">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Campaign QR Code</h3>

				<div class="mb-4 w-full">
					<label for="qrSize" class="mb-1 block text-sm font-medium text-gray-700">Size</label>
					<input
						id="qrSize"
						type="range"
						bind:value={qrSize}
						min="200"
						max="800"
						step="50"
						onchange={() => generateCampaignQR(selectedCampaignId!)}
						class="w-full"
					/>
					<span class="text-sm text-gray-500">{qrSize}px</span>
				</div>

				<div class="mb-4 w-full">
					<label for="qrColor" class="mb-1 block text-sm font-medium text-gray-700">QR Color</label>
					<input
						id="qrColor"
						type="color"
						bind:value={qrColor}
						onchange={() => generateCampaignQR(selectedCampaignId!)}
						class="h-8 w-full"
					/>
				</div>

				<div bind:this={qrPreviewContainer} class="qr-preview mb-4"></div>

				<div class="flex space-x-4">
					<button
						class="rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						onclick={downloadQR}
					>
						Download
					</button>
					<button
						class="rounded-md bg-gray-200 px-4 py-2 text-base font-medium text-gray-800 shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
						onclick={() => (showQRModal = false)}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.qr-preview {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		min-height: 200px;
	}

	.qr-preview :global(canvas),
	.qr-preview :global(svg) {
		max-width: 100% !important;
		height: auto !important;
	}
</style>
