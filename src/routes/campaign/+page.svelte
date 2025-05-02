<script lang="ts">
    import { onMount } from 'svelte';
    import { authStore } from '$lib/stores/authStore';
    import { goto } from '$app/navigation';
    import QRCodeStyling from 'qr-code-styling';
    import type { Options as QRCodeStylingOptions } from 'qr-code-styling';

    let campaigns: any[] = [];
    let newCampaign = {
        title: '',
        description: '',
        backlink_id: null as number | null
    };
    let loading = true;
    let error = '';
    let selectedCampaignId: number | null = null;
    let qrCode: QRCodeStyling | null = null;
    let showQRModal = false;
    let qrPreviewContainer: HTMLDivElement;

    // QR Code styling options
    let qrSize = 300;
    let qrColor = '#000000';
    let qrBackgroundColor = '#ffffff';

    async function loadCampaigns() {
        try {
            const response = await fetch('/api/campaigns', {
                headers: {
                    'Authorization': `Bearer ${$authStore.user?.token}`,
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
                    'Authorization': `Bearer ${$authStore.user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newCampaign)
            });
            const data = await response.json();
            if (response.ok) {
                campaigns = [data.campaign, ...campaigns];
                newCampaign = { title: '', description: '', backlink_id: null };
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
        await new Promise(resolve => setTimeout(resolve, 100));
        
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

<div class="max-w-4xl mx-auto p-4">
    <h1 class="text-3xl font-bold mb-8">Campaign Forum</h1>

    {#if $authStore.user}
        <div class="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">Create New Campaign</h2>
            <form on:submit|preventDefault={createCampaign} class="space-y-4">
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
                    <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
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
                    class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Create Campaign
                </button>
            </form>
        </div>
    {/if}

    {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <span class="block sm:inline">{error}</span>
        </div>
    {/if}

    {#if loading}
        <div class="text-center py-8">Loading campaigns...</div>
    {:else}
        <div class="space-y-6">
            {#each campaigns as campaign}
                <div class="bg-white shadow-md rounded-lg p-6">
                    <h3 class="text-xl font-semibold mb-2">
                        <a href="/campaign/{campaign.campaign_id}" class="hover:text-indigo-600">
                            {campaign.title}
                        </a>
                    </h3>
                    <p class="text-gray-600 mb-4">{campaign.description}</p>
                    <div class="flex justify-between text-sm text-gray-500">
                        <span>By {campaign.author_name}</span>
                        <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="mt-4 flex justify-between items-center">
                        <span class="text-sm text-gray-500">{campaign.comment_count} comments</span>
                        <button
                            class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            on:click={() => generateCampaignQR(campaign.campaign_id)}
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
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="flex flex-col items-center">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Campaign QR Code</h3>
                
                <div class="w-full mb-4">
                    <label for="qrSize" class="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <input
                        id="qrSize"
                        type="range"
                        bind:value={qrSize}
                        min="200"
                        max="800"
                        step="50"
                        on:change={() => generateCampaignQR(selectedCampaignId!)}
                        class="w-full"
                    />
                    <span class="text-sm text-gray-500">{qrSize}px</span>
                </div>

                <div class="w-full mb-4">
                    <label for="qrColor" class="block text-sm font-medium text-gray-700 mb-1">QR Color</label>
                    <input
                        id="qrColor"
                        type="color"
                        bind:value={qrColor}
                        on:change={() => generateCampaignQR(selectedCampaignId!)}
                        class="w-full h-8"
                    />
                </div>

                <div bind:this={qrPreviewContainer} class="qr-preview mb-4"></div>

                <div class="flex space-x-4">
                    <button
                        class="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        on:click={downloadQR}
                    >
                        Download
                    </button>
                    <button
                        class="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        on:click={() => showQRModal = false}
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