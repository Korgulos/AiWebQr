<script lang="ts">
    import { qrStore } from '../../lib/stores/qrStore';
    import Nav from '../../lib/elements/nav/nav.svelte';
    import QRCodeStyling from 'qr-code-styling';
    import type { Options as QRCodeStylingOptions } from 'qr-code-styling';
    import { onMount } from 'svelte';

    let preview = $state('');
    let isLoading = $state(false);
    let error = $state('');
    let qrCode = $state<QRCodeStyling | null>(null);
    let previewContainer = $state<HTMLDivElement | null>(null);
    
    // Customization options
    let inputUrl = $state('');
    let size = $state(300);
    let margin = $state(10);
    let selectedDotsStyle = $state<typeof $qrStore.dotsStyle>('square');
    let selectedCornersStyle = $state<typeof $qrStore.cornersStyle>('square');
    let mainColor = $state('#000000');
    let backgroundColor = $state('#ffffff');
    let useGradient = $state(false);
    let gradientRotation = $state(90);
    let gradientColor1 = $state('#000000');
    let gradientColor2 = $state('#4338ca');
    let useCustomCorners = $state(false);
    let cornerSquareColor = $state('#000000');
    let cornerDotColor = $state('#000000');
    let uploadedLogo = $state<string | null>(null);

    const dotsStyles = ['square', 'dots', 'rounded', 'classy', 'classy-rounded', 'extra-rounded'] as const;
    const cornersStyles = ['square', 'dot', 'extra-rounded'] as const;

    async function generateQR() {
        if (!inputUrl) {
            error = 'Please enter a URL or text';
            return;
        }

        try {
            isLoading = true;
            error = '';

            const options: QRCodeStylingOptions = {
                width: size,
                height: size,
                data: inputUrl,
                margin,
                type: 'svg',
                qrOptions: {
                    errorCorrectionLevel: 'H'
                },
                imageOptions: {
                    hideBackgroundDots: true,
                    imageSize: 0.4,
                    margin: 0
                },
                dotsOptions: {
                    type: selectedDotsStyle,
                    color: useGradient ? undefined : mainColor,
                    gradient: useGradient ? {
                        type: 'linear',
                        rotation: gradientRotation,
                        colorStops: [
                            { offset: 0, color: gradientColor1 },
                            { offset: 1, color: gradientColor2 }
                        ]
                    } : undefined
                },
                backgroundOptions: {
                    color: backgroundColor
                },
                cornersSquareOptions: {
                    type: selectedCornersStyle,
                    color: useCustomCorners ? cornerSquareColor : (useGradient ? undefined : mainColor),
                    gradient: useGradient && !useCustomCorners ? {
                        type: 'linear',
                        rotation: gradientRotation,
                        colorStops: [
                            { offset: 0, color: gradientColor1 },
                            { offset: 1, color: gradientColor2 }
                        ]
                    } : undefined
                },
                cornersDotOptions: {
                    type: selectedCornersStyle === 'dot' ? 'dot' : 'square',
                    color: useCustomCorners ? cornerDotColor : (useGradient ? undefined : mainColor),
                    gradient: useGradient && !useCustomCorners ? {
                        type: 'linear',
                        rotation: gradientRotation,
                        colorStops: [
                            { offset: 0, color: gradientColor1 },
                            { offset: 1, color: gradientColor2 }
                        ]
                    } : undefined
                }
            };

            if (uploadedLogo) {
                options.image = uploadedLogo;
            }

            if (qrCode) {
                qrCode.update(options);
            } else {
                qrCode = new QRCodeStyling(options);
                if (previewContainer) {
                    previewContainer.innerHTML = '';
                    await qrCode.append(previewContainer);
                }
            }
        } catch (err) {
            error = 'Failed to generate QR code. Please try again.';
            console.error('QR generation error:', err);
        } finally {
            isLoading = false;
        }
    }

    async function downloadQR() {
        if (!qrCode) return;
        try {
            await qrCode.download({
                name: `qr-gen-me-${new Date().toISOString().replace('T', ' h').split('.')[0]}`,
                extension: 'png',
            });
        } catch (err) {
            error = 'Failed to download QR code. Please try again.';
            console.error('Download error:', err);
        }
    }

    function handleLogoUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedLogo = e.target?.result as string;
                generateQR();
            };
            reader.readAsDataURL(file);
        }
    }

    $effect(() => {
        if (inputUrl) {
            generateQR();
        }
    });

    onMount(() => {
        generateQR();
    });
</script>

<Nav />

<div class="container mx-auto p-4 min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto">
        <h1 class="text-4xl font-bold text-gray-900 mb-8">QR Code Generator</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Left Column - Controls -->
            <div class="space-y-6 bg-white p-6 rounded-lg shadow-sm">
                <div>
                    <label for="url" class="block text-sm font-medium text-gray-700">URL or Text</label>
                    <input
                        type="text"
                        id="url"
                        maxlength="150"
                        bind:value={inputUrl}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter URL or text"
                    />
                </div>

                <div>
                    <label for="size" class="block text-sm font-medium text-gray-700">Size</label>
                    <input
                        id="size"
                        type="range"
                        bind:value={size}
                        min="100"
                        max="1000"
                        step="10"
                        class="w-full"
                        oninput={generateQR}
                    />
                    <span class="text-sm text-gray-500">{size}px</span>
                </div>

                <div>
                    <label for="dotsStyle" class="block text-sm font-medium text-gray-700">Style</label>
                    <select
                        id="dotsStyle"
                        bind:value={selectedDotsStyle}
                        onchange={generateQR}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        {#each dotsStyles as style}
                            <option value={style}>{style}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label for="cornerStyle" class="block text-sm font-medium text-gray-700">Corner Style</label>
                    <select
                        id="cornerStyle"
                        bind:value={selectedCornersStyle}
                        onchange={generateQR}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        {#each cornersStyles as style}
                            <option value={style}>{style}</option>
                        {/each}
                    </select>
                </div>

                <div class="space-y-4">
                    <div>
                        <label for="colors" class="block text-sm font-medium text-gray-700">Colors</label>
                        <div id="colors" class="flex gap-4 mt-2">
                            <div>
                                <label for="foregroundColor" class="text-xs text-gray-500">Foreground</label>
                                <input
                                    id="foregroundColor"
                                    type="color"
                                    bind:value={mainColor}
                                    oninput={generateQR}
                                    class="block w-full"
                                    disabled={useGradient}
                                />
                            </div>
                            <div>
                                <label for="backgroundColor" class="text-xs text-gray-500">Background</label>
                                <input
                                    id="backgroundColor"
                                    type="color"
                                    bind:value={backgroundColor}
                                    oninput={generateQR}
                                    class="block w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center">
                        <input
                            type="checkbox"
                            id="useGradient"
                            bind:checked={useGradient}
                            onchange={generateQR}
                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label for="useGradient" class="ml-2 text-sm text-gray-700">Use Gradient</label>
                    </div>

                    {#if useGradient}
                        <div class="space-y-2">
                            <div class="flex gap-4">
                                <div>
                                    <label for="startColor" class="text-xs text-gray-500">Start Color</label>
                                    <input
                                        id="startColor"
                                        type="color"
                                        bind:value={gradientColor1}
                                        oninput={generateQR}
                                        class="block w-full"
                                    />
                                </div>
                                <div>
                                    <label for="endColor" class="text-xs text-gray-500">End Color</label>
                                    <input
                                        id="endColor"
                                        type="color"
                                        bind:value={gradientColor2}
                                        oninput={generateQR}
                                        class="block w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label for="gradientRotation" class="text-xs text-gray-500">Rotation ({gradientRotation}°)</label>
                                <input
                                    id="gradientRotation"
                                    type="range"
                                    bind:value={gradientRotation}
                                    min="0"
                                    max="360"
                                    oninput={generateQR}
                                    class="w-full"
                                />
                            </div>
                        </div>
                    {/if}

                    <div>
                        <label for="logoUpload" class="block text-sm font-medium text-gray-700">Logo</label>
                        <input
                            id="logoUpload"
                            type="file"
                            accept="image/*"
                            onchange={handleLogoUpload}
                            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                    </div>
                </div>

                <button
                    onclick={downloadQR}
                    class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    disabled={!inputUrl || isLoading}
                >
                    Download QR Code
                </button>

                {#if error}
                    <p class="text-red-500 text-sm">{error}</p>
                {/if}
            </div>

            <!-- Right Column - Preview -->
            <div class="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center min-h-[500px] max-w-[500px] overflow-hidden">
                <div bind:this={previewContainer} class="qr-preview max-w-full">
                    <if {previewContainer}>
                        <img src="src/lib/assets/qr-code.png" alt="Loading..." />
                    </if> 
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

    .qr-preview :global(canvas),
    .qr-preview :global(svg) {
        max-width: 100% !important;
        height: auto !important;
        object-fit: contain;
    }
</style>