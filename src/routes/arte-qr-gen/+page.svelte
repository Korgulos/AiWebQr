<script lang="ts">
    import Nav from '$lib/elements/nav/nav.svelte';
    import { AwesomeQR } from 'awesome-qr';
    import { qrArteStore } from '$lib/stores/qrArte';
    import { onMount } from 'svelte';

    let previewContainer = $state<HTMLDivElement | null>(null);
    let isLoading = $state(false);
    let error = $state('');
    
    // Input fields bound to store
    let inputUrl = $state('');
    let size = $state(500);
    let margin = $state(10);
    let colorDark = $state('#000000');
    let colorLight = $state('#ffffff');
    let autoColor = $state(true);
    let backgroundImage = $state<string | null>(null);
    let errorCorrectionLevel = $state<'L' | 'M' | 'Q' | 'H'>('H');

    const errorLevels = [
        { value: 'L', label: 'Low (7%)' },
        { value: 'M', label: 'Medium (15%)' },
        { value: 'Q', label: 'Quartile (25%)' },
        { value: 'H', label: 'High (30%)' }
    ];

    async function generateArtisticQR() {
        if (!inputUrl) {
            error = 'Please enter a URL or text';
            return;
        }

        try {
            isLoading = true;
            error = '';

            // Update store
            qrArteStore.setUrl(inputUrl);
            qrArteStore.setSize(size);
            qrArteStore.setColorDark(colorDark);
            qrArteStore.setColorLight(colorLight);
            qrArteStore.setBackgroundImage(backgroundImage);
            qrArteStore.setMargin(margin);
            qrArteStore.setErrorCorrectionLevel(errorCorrectionLevel);
            qrArteStore.setAutoColor(autoColor);

            const options = {
                text: inputUrl,
                size,
                margin,
                colorDark,
                colorLight,
                backgroundImage: backgroundImage || undefined,
                autoColor,
                errorCorrectionLevel,
                components: {
                    data: {
                        scale: 0.4,
                    },
                    timing: {
                        scale: 0.5,
                        protectors: false,
                    },
                    alignment: {
                        scale: 0.5,
                        protectors: false,
                    },
                    cornerAlignment: {
                        scale: 0.5,
                        protectors: true,
                    },
                }
            };

            const qr = new AwesomeQR(options);
            const buffer = await qr.draw();

            if (buffer && previewContainer) {
                const img = document.createElement('img');
                previewContainer.innerHTML = '';
                previewContainer.appendChild(img);
                
                if (buffer instanceof ArrayBuffer) {
                    const uint8Array = new Uint8Array(buffer);
                    const base64String = btoa(String.fromCharCode(...uint8Array));
                    img.src = `data:image/png;base64,${base64String}`;
                } else if (typeof buffer === 'string') {
                    img.src = buffer;
                }
            } else {
                throw new Error('QR generation failed');
            }
        } catch (err) {
            error = 'Failed to generate QR code. Please try again.';
            console.error('QR generation error:', err);
        } finally {
            isLoading = false;
        }
    }

    function handleBackgroundUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    backgroundImage = e.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    async function downloadQR() {
        if (!previewContainer?.querySelector('img')) { return; }
        
        try {
            const img = previewContainer.querySelector('img');
            const response = await fetch(img!.src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `artistic-qr-${new Date().toISOString().replace('T', ' h').split('.')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (err) {
            error = 'Failed to download QR code. Please try again.';
            console.error('Download error:', err);
        }
    }
</script>

<Nav />

<div class="container mx-auto p-4 min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto">
        <h1 class="text-4xl font-bold text-gray-900 mb-8">Artistic QR Code Generator</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left Column - Controls -->
            <div class="space-y-6 bg-white p-6 rounded-lg shadow-sm">
                <div>
                    <label for="url" class="block text-sm font-medium text-gray-700">URL or Text</label>
                    <input
                        type="text"
                        id="url"
                        bind:value={inputUrl}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter URL or text"
                    />
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="size" class="block text-sm font-medium text-gray-700">Size</label>
                        <input
                            id="size"
                            type="range"
                            bind:value={size}
                            min="200"
                            max="1000"
                            step="10"
                            class="w-full"
                        />
                        <span class="text-sm text-gray-500">{size}px</span>
                    </div>
                    <div>
                        <label for="margin" class="block text-sm font-medium text-gray-700">Margin</label>
                        <input
                            id="margin"
                            type="range"
                            bind:value={margin}
                            min="0"
                            max="50"
                            step="1"
                            class="w-full"
                        />
                        <span class="text-sm text-gray-500">{margin}px</span>
                    </div>
                </div>

                <div>
                    <label for="errorLevel" class="block text-sm font-medium text-gray-700">Error Correction Level</label>
                    <select
                        id="errorLevel"
                        bind:value={errorCorrectionLevel}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        {#each errorLevels as level}
                            <option value={level.value}>{level.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="colorDark" class="block text-sm font-medium text-gray-700">QR Color</label>
                            <input
                                id="colorDark"
                                type="color"
                                bind:value={colorDark}
                                class="mt-1 block w-full"
                                disabled={autoColor}
                            />
                        </div>
                        <div>
                            <label for="colorLight" class="block text-sm font-medium text-gray-700">Background Color</label>
                            <input
                                id="colorLight"
                                type="color"
                                bind:value={colorLight}
                                class="mt-1 block w-full"
                            />
                        </div>
                    </div>
                    <div class="flex items-center">
                        <input
                            type="checkbox"
                            id="autoColor"
                            bind:checked={autoColor}
                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label for="autoColor" class="ml-2 text-sm text-gray-700">Auto adjust colors</label>
                    </div>
                </div>

                <div>
                    <label for="backgroundUpload" class="block text-sm font-medium text-gray-700">Background Image</label>
                    <input
                        id="backgroundUpload"
                        type="file"
                        accept="image/*"
                        onchange={handleBackgroundUpload}
                        class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>

                <div class="flex gap-4">
                    <button
                        onclick={generateArtisticQR}
                        class="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        disabled={!inputUrl || isLoading}
                    >
                        Preview QR Code
                    </button>

                    <button
                        onclick={downloadQR}
                        class="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        disabled={isLoading}
                    >
                        Download
                    </button>
                </div>

                {#if error}
                    <p class="text-red-500 text-sm">{error}</p>
                {/if}
            </div>

            <!-- Right Column - Preview -->
            <div class="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center min-h-[500px] overflow-hidden">
                <div bind:this={previewContainer} class="qr-preview max-w-full">
                    {#if isLoading}
                        <div class="text-gray-500">Generating QR code...</div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .qr-preview {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
    }

    .qr-preview :global(img) {
        max-width: 100%;
        height: auto;
        object-fit: contain;
    }
</style>

