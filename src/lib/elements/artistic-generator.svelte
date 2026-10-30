<script lang="ts">
	import { artisticExamples } from '$lib/artistic-examples';
	import Nav from '$lib/elements/nav/nav.svelte';
	import GifPicker from '$lib/elements/gif-picker.svelte';
	import prepareBackgroundPython from '$lib/artistic-background.py?raw';
	import { authStore } from '$lib/stores/authStore';
	let {
		fixedContent = '',
		embedded = false,
		onSave
	}: {
		fixedContent?: string;
		embedded?: boolean;
		onSave?: (file: Blob, content: string) => Promise<void>;
	} = $props();
	let savingDesign = $state(false),
		saveMessage = $state('');
	async function saveDesign() {
		if (!onSave || savingDesign) return;
		savingDesign = true;
		saveMessage = '';
		try {
			if (!qrImage) throw new Error('Generate a QR first.');
			const file = await (await fetch(qrImage)).blob();
			await onSave(file, inputUrl);
			saveMessage = 'Saved to campaign gallery.';
		} catch (e) {
			saveMessage = e instanceof Error ? e.message : 'Could not save QR.';
		} finally {
			savingDesign = false;
		}
	}

	let navigation: ReturnType<typeof Nav> | undefined = $state();
	import type { PyodideInterface } from 'pyodide';
	let pyodide: PyodideInterface | null = null;
	let inputUrl = $state('');
	$effect(() => {
		if (fixedContent) inputUrl = fixedContent;
	});
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

	async function useExample(example: (typeof artisticExamples)[number]) {
		if (isLoading || isImporting) return;
		isImporting = true;
		error = '';
		try {
			const response = await fetch(example.background, { credentials: 'omit' });
			if (!response.ok) throw new Error('Example unavailable');
			const blob = await response.blob();
			const image = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(new Error('Unable to read example'));
				reader.readAsDataURL(blob);
			});
			backgroundImage = image;
			backgroundSource = null;
			isAnimated = example.animated;
			if (!inputUrl.trim()) inputUrl = 'https://www.qr-gen-me.com/';
			if (uploadInput) uploadInput.value = '';
			document.getElementById('artistic-controls')?.scrollIntoView({ block: 'start' });
			document.getElementById('url')?.focus({ preventScroll: true });
		} catch {
			error = 'Unable to load this example. Try another example or upload your own image.';
		} finally {
			isImporting = false;
		}
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

{#if !embedded}<Nav bind:this={navigation} />{/if}

<main class="container mx-auto bg-gray-50 p-4">
	<div class="mx-auto max-w-7xl">
		{#if !embedded}
			<header class="py-8 sm:py-12">
				<p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">
					Images, motion and real connections
				</p>
				<h1 class="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
					Artistic & Animated QR Code Generator
				</h1>
				<p class="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
					Blend a QR code with your image or an animated GIF. Create PNG artwork for print or a
					moving GIF for digital displays, without an account.
				</p>
				<a
					href="#artistic-examples"
					class="mt-5 inline-block font-semibold text-indigo-700 underline underline-offset-4"
					>Explore four original QR examples →</a
				>
			</header>
		{/if}
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Left Column - Controls -->
			<div id="artistic-controls" class="space-y-6 rounded-lg bg-white p-6 shadow-sm">
				<div>
					<label for="url" class="block text-sm font-medium text-gray-700">URL or Text</label>
					<input
						type="text"
						id="url"
						bind:value={inputUrl}
						readonly={!!fixedContent}
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

				{#if onSave}<div class="mt-4 space-y-3">
						<p class="text-xs text-slate-500">
							Saving uploads this QR image to public storage. Anyone with its URL can read the
							encoded content.
						</p>
						<button
							onclick={saveDesign}
							disabled={savingDesign || !qrImage || isLoading || isImporting}
							class="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
							>{savingDesign ? 'Saving…' : 'Save to campaign'}</button
						>{#if saveMessage}<p role="status" class="text-sm text-indigo-600">
								{saveMessage}
							</p>{/if}
					</div>{/if}

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
	{#if !embedded}<section
			class="mx-auto max-w-7xl border-t border-slate-200 py-12 sm:py-16"
			aria-labelledby="artistic-info"
		>
			<p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">
				Your image. Your connection.
			</p>
			<h2 id="artistic-info" class="mt-3 text-3xl font-bold tracking-tight text-slate-900">
				How to create an artistic QR code
			</h2>
			<p class="mt-4 max-w-2xl leading-7 text-slate-600">
				Create a QR code with a photo, illustration or animated GIF. Add your link, choose a
				background, and download a design that brings your content to life.
			</p>
			<div class="mt-8 grid gap-6 md:grid-cols-3">
				<article class="rounded-2xl border border-slate-200 bg-white p-6">
					<h2 class="text-lg font-semibold text-slate-900">Add a link or text</h2>
					<p class="mt-2 leading-7 text-slate-600">
						Enter the content you want your QR code to open. A background is optional if you prefer
						a plain QR code.
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
			<section id="artistic-examples" class="mt-12 scroll-mt-6" aria-labelledby="examples-title">
				<h2 id="examples-title" class="text-3xl font-bold text-slate-900">
					Artistic QR examples you can try
				</h2>
				<p class="mt-4 max-w-3xl leading-7 text-slate-600">
					These four original designs encode https://www.qr-gen-me.com/. Every frame of the gallery
					files was decoded in an automated check. Test your own result on real phones and at its
					final display size.
				</p>
				<div class="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{#each artisticExamples as example}
						<article class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
							<picture>
								{#if example.animated}<source
										media="(prefers-reduced-motion: reduce)"
										srcset={`/artistic-examples/${example.id}-poster.png`}
									/>{/if}
								<img
									src={example.preview}
									alt={`${example.title}: ${example.animated ? 'animated' : 'static'} QR code linking to QR Gen Me`}
									width="328"
									height="328"
									loading="lazy"
									class="aspect-square w-full bg-white object-contain"
								/>
							</picture>
							<div class="p-5">
								<p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">
									{example.animated ? 'Animated GIF' : 'Static PNG'}
								</p>
								<h3 class="mt-2 text-lg font-bold text-slate-900">{example.title}</h3>
								<p class="mt-2 text-sm leading-6 text-slate-600">{example.description}</p>
								<button
									type="button"
									onclick={() => useExample(example)}
									disabled={isLoading || isImporting}
									class="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
									>Make a similar QR</button
								>
							</div>
						</article>
					{/each}
				</div>
			</section>
			<section class="mt-12" aria-labelledby="choose-format">
				<h2 id="choose-format" class="text-2xl font-bold text-slate-900">
					Standard, artistic or animated?
				</h2>
				<div class="mt-5 overflow-x-auto rounded-xl border border-slate-200">
					<table class="w-full min-w-[540px] text-left text-sm leading-6">
						<caption class="sr-only">Compare the three QR styles available on QR Gen Me</caption>
						<thead class="bg-indigo-50"
							><tr
								><th scope="col" class="p-4">Style</th><th scope="col" class="p-4">Use it for</th
								><th scope="col" class="p-4">Download</th></tr
							></thead
						>
						<tbody class="divide-y divide-slate-200">
							<tr
								><th scope="row" class="p-4"
									><a href="/" class="text-indigo-700 underline">Standard QR</a></th
								><td class="p-4">Clear codes with colors, shapes and an optional logo</td><td
									class="p-4">PNG or SVG</td
								></tr
							>
							<tr
								><th scope="row" class="p-4">Artistic QR</th><td class="p-4"
									>Image backgrounds for printed or digital artwork</td
								><td class="p-4">PNG</td></tr
							>
							<tr
								><th scope="row" class="p-4">Animated QR</th><td class="p-4"
									>Motion on screens, websites and digital presentations</td
								><td class="p-4">GIF</td></tr
							>
						</tbody>
					</table>
				</div>
			</section>
			<section class="mt-12 max-w-4xl" aria-labelledby="scan-tips">
				<h2 id="scan-tips" class="text-2xl font-bold text-slate-900">
					Keep your artistic QR easy to scan
				</h2>
				<ul class="mt-5 list-disc space-y-3 pl-6 leading-7 text-slate-600">
					<li>
						Use a short destination URL. Longer content creates a denser pattern with less room for
						artwork.
					</li>
					<li>
						Prefer simple backgrounds with clear contrast. Keep all three corner markers and the
						empty border visible.
					</li>
					<li>
						For animation, test more than one moment in the loop and avoid flashing, high-contrast
						frames. A scan may fail during a busy frame.
					</li>
					<li>
						Scan the downloaded file with different phones, then test the final printed or displayed
						version. An automated decode is useful, but cannot guarantee a phone camera will scan
						every design.
					</li>
				</ul>
			</section>
			<section class="mt-12 max-w-4xl" aria-labelledby="artistic-faq">
				<h2 id="artistic-faq" class="text-2xl font-bold text-slate-900">Artistic QR questions</h2>
				<div class="mt-5 divide-y divide-slate-200">
					<details class="py-4">
						<summary class="cursor-pointer font-semibold"
							>How do I make an animated QR code?</summary
						>
						<p class="mt-3 leading-7 text-slate-600">
							Enter your link or text, select an animated GIF, and press Generate. The first
							generation loads the image tools and may take longer. Download the generated GIF for a
							surface that supports animation.
						</p>
					</details>
					<details class="py-4">
						<summary class="cursor-pointer font-semibold">Which background files can I use?</summary
						>
						<p class="mt-3 leading-7 text-slate-600">
							Upload PNG, JPEG, WebP or GIF files up to 5 MB, use a direct GIF link, or choose a
							GIPHY result. Backgrounds are cropped to a square, so keep the subject near the
							center. Only GIF uploads produce animated output.
						</p>
					</details>
					<details class="py-4">
						<summary class="cursor-pointer font-semibold">Can I print an animated QR code?</summary>
						<p class="mt-3 leading-7 text-slate-600">
							Paper cannot display animation. Use a static image background and export PNG for
							print, or use the standard generator for SVG. Test a printed proof at the intended
							size.
						</p>
					</details>
					<details class="py-4">
						<summary class="cursor-pointer font-semibold"
							>Does the QR code expire or change its link?</summary
						>
						<p class="mt-3 leading-7 text-slate-600">
							These static examples store the destination directly and have no built-in expiry. The
							destination still needs to work. To change the encoded content, generate a new QR
							code.
						</p>
					</details>
				</div>
			</section>
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
		</section>{/if}
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
