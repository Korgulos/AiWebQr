<script lang="ts">
	import Nav from '$lib/elements/nav/nav.svelte';
	import GifPicker from '$lib/elements/gif-picker.svelte';
	import prepareBackgroundPython from '$lib/artistic-background.py?raw';
	import { authStore } from '$lib/stores/authStore';
	let navigation: ReturnType<typeof Nav> | undefined = $state();
	import type { PyodideInterface } from 'pyodide';
	let pyodide: PyodideInterface | null = null;
	let inputUrl = $state('');
	let qrImage = $state<string | null>(null);
	let isLoading = $state(false);
	let status = $state('');
	let error = $state('');
	let backgroundImage = $state<string | null>(null);
	let isAnimated = $state(false);
	let scale = $state(4);
	let generatedAnimated = $state(false);
	let isImporting = $state(false);
	let backgroundSource = $state<string | null>(null);
	let uploadInput: HTMLInputElement | undefined = $state();

	function selectWebGif(image: string, source: string) {
		backgroundImage = image;
		backgroundSource = source;
		isAnimated = true;
		error = '';
		if (uploadInput) uploadInput.value = '';
	}

	function clearBackground() {
		backgroundImage = null;
		backgroundSource = null;
		isAnimated = false;
		if (uploadInput) uploadInput.value = '';
	}

	$effect(() => {
		inputUrl;
		scale;
		backgroundImage;
		qrImage = null;
	});

	async function generateArtisticQR() {
		if (!inputUrl.trim() || isLoading || isImporting) return;
		isLoading = true;
		error = '';
		qrImage = null;
		try {
			if (!pyodide) {
				status = 'Loading image tools. The first generation may take a moment…';
				const { loadPyodide } = await import('pyodide');
				const runtime = await loadPyodide({
					indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
				});
				await runtime.loadPackage(['Pillow', 'micropip']);
				await runtime.runPythonAsync(`
import micropip
await micropip.install('segno==1.6.6')
await micropip.install('qrcode-artistic==3.0.2')
`);
				pyodide = runtime;
			}
			status = 'Generating your QR code…';
			// Values cross the Python boundary as data, never executable source.
			pyodide.globals.set('qr_text', inputUrl);
			pyodide.globals.set('qr_background', backgroundImage || '');
			pyodide.globals.set('qr_scale', scale);
			pyodide.globals.set('qr_kind', isAnimated && !!backgroundImage ? 'gif' : 'png');
			const base64Data = await pyodide.runPythonAsync(
				prepareBackgroundPython +
					`
import segno, io, base64
qr = segno.make(qr_text, error='h', micro=False)
buffer = io.BytesIO()
if qr_background:
    background = prepare_background(io.BytesIO(base64.b64decode(qr_background.split(',', 1)[1])))
    qr.to_artistic(background=background, target=buffer, scale=int(qr_scale), border=4, kind=qr_kind)
else:
    qr.save(buffer, kind='png', scale=int(qr_scale), border=4)
base64.b64encode(buffer.getvalue()).decode()
`
			);
			generatedAnimated = isAnimated && !!backgroundImage;
			qrImage = `data:image/${generatedAnimated ? 'gif' : 'png'};base64,${base64Data}`;
		} catch (err) {
			error = 'Unable to generate this QR code. Try shorter text or a smaller image, then retry.';
			console.error('Artistic QR generation failed', err);
		} finally {
			if (pyodide)
				for (const name of ['qr_text', 'qr_background', 'qr_scale', 'qr_kind'])
					pyodide.globals.delete(name);
			isLoading = false;
			status = '';
		}
	}
	function handleBackgroundUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		backgroundSource = null;
		error = '';
		if (!file) {
			backgroundImage = null;
			isAnimated = false;
			return;
		}
		if (
			!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) ||
			file.size > 5 * 1024 * 1024
		) {
			error = 'Choose a PNG, JPEG, WebP or GIF image smaller than 5 MB.';
			input.value = '';
			backgroundImage = null;
			return;
		}
		isAnimated = file.type === 'image/gif';
		const reader = new FileReader();
		reader.onload = () => {
			backgroundImage = String(reader.result);
			qrImage = null;
		};
		reader.onerror = () => {
			error = 'Unable to read this image.';
		};
		reader.readAsDataURL(file);
	}
	function downloadQR() {
		if (!qrImage) return;
		const link = document.createElement('a');
		link.href = qrImage;
		link.download = `artistic-qr.${generatedAnimated ? 'gif' : 'png'}`;
		link.click();
	}
</script>

<svelte:head><title>Artistic QR Code Generator | QR Gen Me</title></svelte:head>

<Nav bind:this={navigation} />

<main class="container mx-auto bg-gray-50 p-4">
	<div class="mx-auto max-w-7xl">
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Left Column - Controls -->
			<div class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
				<div>
					<label for="url" class="block text-sm font-medium text-gray-700">URL or Text</label>
					<input
						type="text"
						id="url"
						bind:value={inputUrl}
						maxlength="2000"
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
						bind:this={uploadInput}
						disabled={isLoading || isImporting}
						type="file"
						accept="image/png,image/jpeg,image/gif,image/webp"
						onchange={handleBackgroundUpload}
						class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
					/>
				</div>

				<GifPicker
					disabled={isLoading || isImporting}
					onSelect={selectWebGif}
					onBusy={(busy) => {
						isImporting = busy;
					}}
				/>

				{#if isLoading}<p role="status" aria-live="polite" class="text-sm text-indigo-700">
						{status}
					</p>{/if}
				{#if error}
					<p class="text-sm text-red-500">{error}</p>
				{/if}
			</div>

			<!-- Right Column - GIF import, selected background and QR preview -->
			<div class="space-y-5 md:sticky md:top-6 md:self-start">
				<div
					class="flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg bg-white p-6 shadow-sm"
				>
					<div class="qr-preview max-w-full">
						{#if isLoading}
							<div class="text-center text-lg text-indigo-700">{status}</div>
						{:else if qrImage}
							<img src={qrImage} alt="Your generated artistic QR code" />
						{:else}
							<p class="max-w-xs text-center text-gray-500">
								Add text or a link to create your QR code. A background image is optional.
							</p>
						{/if}
					</div>
				</div>

				<div class="flex gap-4">
					<button
						onclick={generateArtisticQR}
						class="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						disabled={!inputUrl.trim() || isLoading || isImporting}
					>
						{isLoading ? 'Generating…' : 'Generate QR Code'}
					</button>

					<button
						onclick={downloadQR}
						class="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-lg text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						disabled={!qrImage || isLoading || isImporting}
					>
						Download
					</button>
				</div>

				{#if backgroundImage}
					<div class="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
						<img
							src={backgroundImage}
							alt="Selected QR background"
							class="mx-auto h-40 w-full max-w-sm rounded-lg bg-white object-contain sm:h-48"
						/>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold text-slate-800">
									{isAnimated ? 'GIF background selected' : 'Image background selected'}
								</p>
								{#if backgroundSource}<a
										href={backgroundSource}
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs text-indigo-600 underline">View original GIF ↗</a
									>{/if}
							</div>
							<button
								type="button"
								onclick={clearBackground}
								disabled={isLoading || isImporting}
								class="text-sm font-medium text-slate-600 hover:text-indigo-700">Remove</button
							>
						</div>
					</div>
				{/if}

				<div class="rounded-lg bg-white p-6 shadow-sm">
					<GifPicker
						mode="link"
						disabled={isLoading || isImporting}
						onSelect={selectWebGif}
						onBusy={(busy) => {
							isImporting = busy;
						}}
					/>
				</div>
			</div>
		</div>
	</div>
	<section
		class="mx-auto max-w-7xl border-t border-slate-200 py-12 sm:py-16"
		aria-labelledby="artistic-info"
	>
		<p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">
			Your image. Your connection.
		</p>
		<h1 id="artistic-info" class="mt-3 text-3xl font-bold tracking-tight text-slate-900">
			Artistic QR Code Generator
		</h1>
		<p class="mt-4 max-w-2xl leading-7 text-slate-600">
			Create a QR code with a photo, illustration or animated GIF. Add your link, choose a
			background, and download a design that brings your content to life.
		</p>
		<div class="mt-8 grid gap-6 md:grid-cols-3">
			<article class="rounded-2xl border border-slate-200 bg-white p-6">
				<h2 class="text-lg font-semibold text-slate-900">Add a link or text</h2>
				<p class="mt-2 leading-7 text-slate-600">
					Enter the content you want your QR code to open. A background is optional if you prefer a
					plain QR code.
				</p>
			</article>
			<article class="rounded-2xl border border-slate-200 bg-white p-6">
				<h2 class="text-lg font-semibold text-slate-900">Make it move</h2>
				<p class="mt-2 leading-7 text-slate-600">
					Upload a PNG, JPEG, WebP or GIF up to 5 MB. Animated GIF backgrounds produce an animated
					QR code.
				</p>
			</article>
			<article class="rounded-2xl border border-slate-200 bg-white p-6">
				<h2 class="text-lg font-semibold text-slate-900">Download and scan</h2>
				<p class="mt-2 leading-7 text-slate-600">
					Download your PNG or GIF and test it with your phone before sharing or printing. Simple,
					contrasting backgrounds work best.
				</p>
			</article>
		</div>
		{#if !$authStore.user}
			<div class="mt-10 rounded-2xl bg-indigo-50 p-8 text-center">
				<h2 class="text-2xl font-bold text-slate-900">Keep your campaigns in one place</h2>
				<p class="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
					Create an account to manage QR campaigns. Artistic QR generation is available without
					signing up.
				</p>
				<button
					onclick={() => navigation?.showRegister()}
					class="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
					>Create an account</button
				>
			</div>
		{/if}
	</section>
</main>

<style>
	.qr-preview {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.qr-preview img {
		max-height: 65vh;
		object-fit: contain;
		max-width: 100%;
		overflow: hidden;
		height: auto;
		display: block;
		margin: 0 auto;
	}
</style>
