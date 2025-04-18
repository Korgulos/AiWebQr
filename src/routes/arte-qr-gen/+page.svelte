<script lang="ts">
    import qrDummyPic from '$lib/assets/QrInfo.gif';
    import Nav from '$lib/elements/nav/nav.svelte';
    import { onMount } from 'svelte';
    import { loadPyodide } from 'pyodide';

    let pyodide: any = null;
    let inputUrl = $state('');
    let qrImage = $state<string | null>(null);
    let isLoading = $state(false);
    let error = $state('');
    let backgroundImage = $state<string | null>(null);
    let isAnimated = $state(false);
    let scale = $state(4);
    
    // URL for Pyodide
    const pyodideURL = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/";

    async function generateAnimatedQR() {
        const pythonCode = `
            import segno
            import io
            import base64
            from urllib.request import urlopen

            # Create QR code with high error correction
            qr = segno.make("${inputUrl}", error='h')
            
            # Save to bytes buffer
            buffer = io.BytesIO()
            
            url = "${backgroundImage}"
            bg_file = urlopen(url)

            # Create artistic QR code with background
            qr.to_artistic(
                background=bg_file,
                target=buffer,
                scale=${scale},
                border=5,
                kind='gif'
            )
            
            # Convert to base64
            b64 = base64.b64encode(buffer.getvalue()).decode()
            b64
        `;

        return await pyodide.runPythonAsync(pythonCode);
    }

    async function generateStaticQR() {
        const pythonCode =  
             `
                import segno
                import io
                import base64
                from urllib.request import urlopen

                # Create QR code with high error correction
                qr = segno.make("${inputUrl}", error='h')
                
                # Save to bytes buffer
                buffer = io.BytesIO()
                
                url = "${backgroundImage}"
                bg_file = urlopen(url)

                # Create artistic QR code with background
                qr.to_artistic(
                    background=bg_file,
                    target=buffer,
                    scale=${scale},
                    border=5,
                    kind='png'
                )
                
                # Convert to base64
                b64 = base64.b64encode(buffer.getvalue()).decode()
                b64
            `;

        return await pyodide.runPythonAsync(pythonCode);
    }

    async function generateArtisticQR() {
        if (!inputUrl) {
            error = 'Please enter a URL or text';
            return;
        }

        try {
            isLoading = true;
            error = '';

            // If no background image, generate simple QR code
            if (!backgroundImage) {
                
                qrImage = qrDummyPic;
            } else {
                // Generate QR with background image (animated or static)
                const base64Data = isAnimated && backgroundImage 
                    ? await generateAnimatedQR()
                    : await generateStaticQR();

                // Create data URL with appropriate mime type
                const mimeType = isAnimated ? 'image/gif' : 'image/png';
                qrImage = `data:${mimeType};base64,${base64Data}`;
            }
        } catch (err) {
            error = 'Failed to generate QR code: ' + (err instanceof Error ? err.message : String(err));
            console.error('QR generation error:', err);
        } finally {
            isLoading = false;
        }
    }

    function handleBackgroundUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            // Check if file is an animated GIF
            isAnimated = file.type === 'image/gif';
            
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    backgroundImage = e.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    function downloadQR() {
        if (!qrImage) return;
        
        const link = document.createElement('a');
        link.href = qrImage;
        link.download = `artistic-qr-${isAnimated ? 'animated' : 'static'}-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.${isAnimated ? 'gif' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    onMount(async () => {
        try {
            error = '';
            // Load qrDummyPic
            qrImage = qrDummyPic;

            // Load Pyodide
            pyodide = await loadPyodide({
                indexURL: pyodideURL,
            });

            // Install required packages
            await pyodide.loadPackage("Pillow"); // Required for image processing
            await pyodide.loadPackage("micropip");
            await pyodide.runPythonAsync(`
                import micropip
                await micropip.install('segno>=1.5.0')
                await micropip.install('qrcode-artistic')
            `);
            await pyodide.runPythonAsync(`
                from PIL import Image
            `);

        } catch (err) {
            error = 'Failed to initialize Python environment: ' + (err instanceof Error ? err.message : String(err));
            console.error('Initialization error:', err);
        }
    });
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

                <div>
                    <label for="scale" class="block text-sm font-medium text-gray-700">Scale</label>
                    <input
                        type="range"
                        id="scale"
                        bind:value={scale}
                        min="1"
                        max="12"
                        step="1"
                        class="mt-1 block w-full"
                    />
                    <span class="text-sm text-gray-500">{scale}x</span>
                </div>

                <div>
                    <label for="backgroundUpload" class="block text-sm font-medium text-gray-700">
                        Background Image {#if isAnimated}(Animated GIF){/if}
                    </label>
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
                        Generate QR Code
                    </button>

                    <button
                        onclick={downloadQR}
                        class="flex-1 bg-indigo-600 text-white text-lg  px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        disabled={!qrImage || isLoading}
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
                <div class="qr-preview max-w-full">
                    {#if isLoading}
                        <div class="text-indigo-700 text-3xl">Generating QR Code ...</div>
                    {:else if qrImage}
                        <img src={qrImage} alt="QR Code" />
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

    .qr-preview img {
        max-width: 600px;
        overflow: hidden;
        height: auto;
        display: block;
        margin: 0 auto;
    }
</style>

