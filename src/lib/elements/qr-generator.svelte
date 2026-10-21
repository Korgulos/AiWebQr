<script lang="ts">
	import artisticDemo from '$lib/assets/QrInfo.gif';
	import ContentForm from '$lib/elements/qr-content-form.svelte';
	import {
		buildQRContent,
		contentTypes,
		emptyContent,
		contrastRatio,
		type ContentType
	} from '$lib/qr-content';
	import type QRCodeStyling from 'qr-code-styling';
	import type { Options, DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
	import { onMount } from 'svelte';

	let renderRevision = 0;
	let QRConstructor: typeof QRCodeStyling | null = null;
	let ready = $state(false);
	let qrCode: QRCodeStyling | null = $state(null);
	let previewContainer: HTMLDivElement | null = $state(null);
	let contentType = $state<ContentType>('url');
	let values = $state(emptyContent());
	let attempted = $state(false);
	let isLoading = $state(false);
	let error = $state('');
	let size = $state(600);
	let format = $state<'png' | 'svg'>('png');
	let mainColor = $state('#111827');
	let backgroundColor = $state('#ffffff');
	let transparent = $state(false);
	let useGradient = $state(false);
	let gradientColor1 = $state('#4338ca');
	let gradientColor2 = $state('#7c3aed');
	let gradientType = $state<'linear' | 'radial'>('linear');
	let gradientRotation = $state(90);
	let customEyes = $state(false);
	let eyeFrameColor = $state('#111827');
	let eyeBallColor = $state('#111827');
	let bodyStyle = $state<DotType>('square');
	let frameStyle = $state<CornerSquareType>('square');
	let ballStyle = $state<CornerDotType>('square');
	let uploadedLogo = $state('');
	let logoSize = $state(0.3);
	let logoPadding = $state(4);
	let hideLogoDots = $state(true);
	let logoInput: HTMLInputElement | undefined = $state();
	const bodyStyles = [
		'square',
		'dots',
		'rounded',
		'classy',
		'classy-rounded',
		'extra-rounded'
	] as const;
	const frameStyles = ['square', 'dot', 'extra-rounded'] as const;
	const ballStyles = ['square', 'dot', 'rounded', 'extra-rounded'] as const;
	const templates = [
		{
			name: 'Classic',
			color: '#111827',
			end: '#111827',
			body: 'square',
			frame: 'square',
			ball: 'square',
			gradient: false
		},
		{
			name: 'Indigo',
			color: '#4338ca',
			end: '#7c3aed',
			body: 'rounded',
			frame: 'extra-rounded',
			ball: 'dot',
			gradient: true
		},
		{
			name: 'Forest',
			color: '#166534',
			end: '#166534',
			body: 'dots',
			frame: 'dot',
			ball: 'dot',
			gradient: false
		},
		{
			name: 'Ocean',
			color: '#075985',
			end: '#0f766e',
			body: 'classy-rounded',
			frame: 'extra-rounded',
			ball: 'square',
			gradient: true
		},
		{
			name: 'Berry',
			color: '#9d174d',
			end: '#9d174d',
			body: 'extra-rounded',
			frame: 'square',
			ball: 'dot',
			gradient: false
		}
	] as const;
	const content = $derived.by(() => {
		try {
			return { value: buildQRContent(contentType, values), error: '' };
		} catch (error) {
			return { value: '', error: error instanceof Error ? error.message : 'Check your content.' };
		}
	});
	const lowContrast = $derived(
		[
			useGradient ? gradientColor1 : mainColor,
			...(useGradient ? [gradientColor2] : []),
			...(customEyes ? [eyeFrameColor, eyeBallColor] : [])
		].some((color) => contrastRatio(color, transparent ? '#ffffff' : backgroundColor) < 4.5)
	);
	function resetDesign() {
		mainColor = '#111827';
		backgroundColor = '#ffffff';
		transparent = false;
		useGradient = false;
		gradientColor1 = '#4338ca';
		gradientColor2 = '#7c3aed';
		gradientType = 'linear';
		gradientRotation = 90;
		customEyes = false;
		eyeFrameColor = '#111827';
		eyeBallColor = '#111827';
		bodyStyle = 'square';
		frameStyle = 'square';
		ballStyle = 'square';
		uploadedLogo = '';
		logoSize = 0.3;
		logoPadding = 4;
		hideLogoDots = true;
		if (logoInput) logoInput.value = '';
	}
	function applyTemplate(template: (typeof templates)[number]) {
		resetDesign();
		mainColor = template.color;
		gradientColor1 = template.color;
		gradientColor2 = template.end;
		useGradient = template.gradient;
		bodyStyle = template.body;
		frameStyle = template.frame;
		ballStyle = template.ball;
	}
	async function generateQR() {
		const revision = ++renderRevision;
		if (!QRConstructor || !previewContainer) return;
		if (!content.value) {
			qrCode = null;
			previewContainer.replaceChildren();
			isLoading = false;
			error = '';
			return;
		}
		isLoading = true;
		error = '';
		try {
			const gradient = useGradient
				? {
						type: gradientType,
						rotation: (gradientRotation * Math.PI) / 180,
						colorStops: [
							{ offset: 0, color: gradientColor1 },
							{ offset: 1, color: gradientColor2 }
						]
					}
				: undefined;
			const options: Options = {
				width: size,
				height: size,
				data: content.value,
				type: 'svg',
				margin: Math.ceil(size * 0.14),
				qrOptions: { errorCorrectionLevel: 'H' },
				image: uploadedLogo,
				imageOptions: {
					hideBackgroundDots: hideLogoDots,
					imageSize: logoSize,
					margin: logoPadding,
					saveAsBlob: true
				},
				dotsOptions: { type: bodyStyle, color: mainColor, gradient },
				backgroundOptions: { color: transparent ? 'transparent' : backgroundColor },
				cornersSquareOptions: {
					type: frameStyle,
					color: customEyes ? eyeFrameColor : mainColor,
					gradient: customEyes ? undefined : gradient
				},
				cornersDotOptions: {
					type: ballStyle,
					color: customEyes ? eyeBallColor : mainColor,
					gradient: customEyes ? undefined : gradient
				}
			};
			// Recreate the instance so removing a gradient or logo cannot retain old merged options.
			const instance = new QRConstructor(options);
			await instance.getRawData('svg');
			if (revision !== renderRevision) return;
			previewContainer.replaceChildren();
			instance.append(previewContainer);
			qrCode = instance;
		} catch (exception) {
			if (revision !== renderRevision) return;
			qrCode = null;
			previewContainer.replaceChildren();
			error = 'Unable to generate this code. Try shorter content or a smaller logo.';
			console.error('QR generation failed', exception);
		} finally {
			if (revision === renderRevision) isLoading = false;
		}
	}
	async function downloadQR() {
		if (!qrCode || !content.value || isLoading) return;
		try {
			await qrCode.download({ name: `qr-gen-me-${contentType}`, extension: format });
		} catch {
			error = 'Unable to download. Please try again.';
		}
	}
	function handleLogoUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (
			!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
			file.size > 2 * 1024 * 1024
		) {
			error = 'Choose a PNG, JPEG or WebP logo smaller than 2 MB.';
			input.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			uploadedLogo = String(reader.result);
			error = '';
		};
		reader.onerror = () => {
			error = 'Unable to read the logo.';
		};
		reader.readAsDataURL(file);
	}
	$effect(() => {
		content.value;
		size;
		mainColor;
		backgroundColor;
		transparent;
		useGradient;
		gradientColor1;
		gradientColor2;
		gradientType;
		gradientRotation;
		customEyes;
		eyeFrameColor;
		eyeBallColor;
		bodyStyle;
		frameStyle;
		ballStyle;
		uploadedLogo;
		logoSize;
		logoPadding;
		hideLogoDots;
		if (!ready) return;
		renderRevision++;
		isLoading = true;
		const timeout = setTimeout(() => {
			void generateQR();
		}, 180);
		return () => clearTimeout(timeout);
	});
	onMount(() => {
		let active = true;
		import('qr-code-styling')
			.then(({ default: Constructor }) => {
				if (active) {
					QRConstructor = Constructor;
					ready = true;
				}
			})
			.catch(() => {
				error = 'Unable to load the generator. Refresh the page to retry.';
			});
		return () => {
			active = false;
			renderRevision++;
		};
	});
</script>

<div class="container mx-auto bg-gray-50 p-4">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8 grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
			<div class="self-center py-3">
				<h2 class="text-3xl font-bold text-gray-900">Make it yours</h2>
				<p class="mt-3 max-w-lg leading-7 text-gray-600">
					Enter a link or text, customize your code, and download it. No account needed.
				</p>
			</div>
			<a
				href="/arte-qr-gen"
				class="group flex min-h-44 items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 p-5 text-white shadow-sm transition-shadow hover:shadow-lg sm:gap-6 sm:p-6"
			>
				<div class="min-w-0">
					<p class="text-xs font-semibold uppercase tracking-widest text-indigo-200">Artistic QR</p>
					<h3 class="mt-2 text-xl font-bold sm:text-2xl">Bring your QR to life.</h3>
					<p class="mt-2 max-w-xs text-sm leading-6 text-indigo-100">
						Turn an image or animated GIF into a QR code.
					</p>
					<span class="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
						>Try Artistic QR <span
							aria-hidden="true"
							class="transition-transform group-hover:translate-x-1">→</span
						></span
					>
				</div>
				<div class="shrink-0 text-center">
					<div
						class="artistic-demo relative size-28 overflow-hidden rounded-xl border-4 border-white/90 bg-white shadow-lg sm:size-36"
					>
						<img
							src={artisticDemo}
							alt="Animated artistic QR code example"
							width="1100"
							height="1100"
							class="artistic-demo-image absolute"
						/>
					</div>
					<span class="mt-2 block text-[10px] font-medium uppercase tracking-widest text-indigo-200"
						>Animated QR example</span
					>
				</div>
			</a>
		</div>

		<div
			class="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3"
			role="group"
			aria-label="QR content type"
		>
			{#each contentTypes as type}
				<button
					type="button"
					aria-pressed={contentType === type.id}
					onclick={() => {
						contentType = type.id;
						attempted = false;
					}}
					class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors {contentType ===
					type.id
						? 'bg-indigo-600 text-white shadow-sm'
						: 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}"
					><span aria-hidden="true" class="text-lg leading-none">{type.symbol}</span
					>{type.label}</button
				>
			{/each}
		</div>
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
			<div class="space-y-4">
				<section
					class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
					aria-labelledby="content-heading"
				>
					<h3
						id="content-heading"
						class="mb-5 flex items-center gap-3 text-lg font-semibold text-slate-900"
					>
						<span class="step-number">1</span>Enter content<span
							class="ml-auto text-xs font-medium text-indigo-600"
							>{contentTypes.find((type) => type.id === contentType)?.label}</span
						>
					</h3>
					<ContentForm type={contentType} bind:values />
					{#if attempted && content.error}<p role="alert" class="mt-3 text-sm text-red-600">
							{content.error}
						</p>{/if}
					<p class="mt-4 text-xs leading-5 text-slate-500">
						Your content stays in your browser. No account required.
					</p>
				</section>
				<details class="design-section" open>
					<summary
						><span class="step-number">2</span>Set colors<span
							class="summary-arrow"
							aria-hidden="true">⌄</span
						></summary
					>
					<div class="section-body space-y-5">
						<div class="flex flex-wrap gap-4 text-sm">
							<label class="flex items-center gap-2"
								><input
									type="radio"
									name="qr-color-mode"
									checked={!useGradient}
									onchange={() => (useGradient = false)}
								/>Single color</label
							><label class="flex items-center gap-2"
								><input
									type="radio"
									name="qr-color-mode"
									checked={useGradient}
									onchange={() => (useGradient = true)}
								/>Color gradient</label
							>
						</div>
						<div class="grid grid-cols-2 gap-4">
							{#if useGradient}
								<label class="color-field"
									>Start color<input type="color" bind:value={gradientColor1} /><span
										>{gradientColor1}</span
									></label
								>
								<label class="color-field"
									>End color<input type="color" bind:value={gradientColor2} /><span
										>{gradientColor2}</span
									></label
								>
							{:else}
								<label class="color-field"
									>Foreground<input type="color" bind:value={mainColor} /><span>{mainColor}</span
									></label
								>
							{/if}
							<label class="color-field"
								>Background<input
									type="color"
									bind:value={backgroundColor}
									disabled={transparent}
								/><span>{transparent ? 'Transparent' : backgroundColor}</span></label
							>
						</div>
						{#if useGradient}<div class="grid grid-cols-2 gap-4">
								<label class="field-label"
									>Gradient type<select bind:value={gradientType} class="mt-2 w-full"
										><option value="linear">Linear</option><option value="radial">Radial</option
										></select
									></label
								><label class="field-label"
									>Rotation · {gradientRotation}°<input
										type="range"
										min="0"
										max="360"
										bind:value={gradientRotation}
										class="mt-4 w-full"
									/></label
								>
							</div>{/if}
						<label class="flex items-center gap-2 text-sm text-slate-700"
							><input type="checkbox" bind:checked={transparent} />Transparent background</label
						>
						<label class="flex items-center gap-2 text-sm text-slate-700"
							><input type="checkbox" bind:checked={customEyes} />Custom eye colors</label
						>
						{#if customEyes}<div class="grid grid-cols-2 gap-4">
								<label class="color-field"
									>Eye frame<input type="color" bind:value={eyeFrameColor} /><span
										>{eyeFrameColor}</span
									></label
								><label class="color-field"
									>Eye center<input type="color" bind:value={eyeBallColor} /><span
										>{eyeBallColor}</span
									></label
								>
							</div>{/if}
						{#if lowContrast}<p
								role="status"
								class="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900"
							>
								Low contrast can make your QR code harder to scan. Use darker foreground colors and
								a lighter background.
							</p>{/if}
					</div>
				</details>
				<details class="design-section">
					<summary
						><span class="step-number">3</span>Add a logo<span
							class="summary-arrow"
							aria-hidden="true">⌄</span
						></summary
					>
					<div class="section-body space-y-4">
						<label for="logoUpload" class="field-label">Upload your logo</label>
						<input
							id="logoUpload"
							bind:this={logoInput}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							onchange={handleLogoUpload}
							class="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-3 file:font-semibold file:text-indigo-700"
						/>
						<p class="text-xs text-slate-500">PNG, JPEG or WebP · up to 2 MB</p>
						{#if uploadedLogo}
							<div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3">
								<img
									src={uploadedLogo}
									alt="Your uploaded logo"
									class="size-16 rounded-lg bg-white object-contain"
								/><button
									type="button"
									onclick={() => {
										uploadedLogo = '';
										if (logoInput) logoInput.value = '';
									}}
									class="text-sm font-semibold text-indigo-600">Remove logo</button
								>
							</div>
							<label class="field-label block"
								>Logo size · {Math.round(logoSize * 100)}%<input
									type="range"
									min="0.15"
									max="0.4"
									step="0.01"
									bind:value={logoSize}
									class="mt-3 w-full"
								/></label
							>
							<label class="field-label block"
								>Logo padding · {logoPadding}px<input
									type="range"
									min="0"
									max="20"
									step="1"
									bind:value={logoPadding}
									class="mt-3 w-full"
								/></label
							>
							<label class="flex items-center gap-2 text-sm"
								><input type="checkbox" bind:checked={hideLogoDots} />Clear QR dots behind logo</label
							>
						{/if}
					</div>
				</details>
				<details class="design-section">
					<summary
						><span class="step-number">4</span>Customize design<span
							class="summary-arrow"
							aria-hidden="true">⌄</span
						></summary
					>
					<div class="section-body space-y-5">
						<div>
							<p class="field-label mb-3">Body shape</p>
							<div class="flex flex-wrap gap-2">
								{#each bodyStyles as shape}<button
										type="button"
										class="shape-choice"
										class:chosen={bodyStyle === shape}
										aria-label={`Body: ${shape}`}
										aria-pressed={bodyStyle === shape}
										onclick={() => (bodyStyle = shape)}
										><svg viewBox="0 0 36 36" class="size-9" aria-hidden="true"
											>{#each [0, 1, 2] as row}{#each [0, 1, 2] as col}<rect
														x={3 + col * 11}
														y={3 + row * 11}
														width="8"
														height="8"
														rx={shape === 'square'
															? 0
															: shape === 'dots' || shape === 'extra-rounded'
																? 4
																: shape === 'rounded'
																	? 2
																	: (row + col) % 2
																		? 0
																		: 4}
														fill="currentColor"
													/>{/each}{/each}</svg
										><span>{shape.replaceAll('-', ' ')}</span></button
									>{/each}
							</div>
						</div>
						<div>
							<p class="field-label mb-3">Eye frame shape</p>
							<div class="flex flex-wrap gap-2">
								{#each frameStyles as shape}<button
										type="button"
										class="shape-choice"
										class:chosen={frameStyle === shape}
										aria-label={`Eye frame: ${shape}`}
										aria-pressed={frameStyle === shape}
										onclick={() => (frameStyle = shape)}
										><svg viewBox="0 0 36 36" class="size-9" aria-hidden="true"
											><rect
												x="5"
												y="5"
												width="26"
												height="26"
												rx={shape === 'square' ? 0 : shape === 'dot' ? 13 : 8}
												fill="none"
												stroke="currentColor"
												stroke-width="6"
											/></svg
										><span>{shape.replaceAll('-', ' ')}</span></button
									>{/each}
							</div>
						</div>
						<div>
							<p class="field-label mb-3">Eye center shape</p>
							<div class="flex flex-wrap gap-2">
								{#each ballStyles as shape}<button
										type="button"
										class="shape-choice"
										class:chosen={ballStyle === shape}
										aria-label={`Eye center: ${shape}`}
										aria-pressed={ballStyle === shape}
										onclick={() => (ballStyle = shape)}
										><svg viewBox="0 0 36 36" class="size-9" aria-hidden="true"
											><rect
												x="8"
												y="8"
												width="20"
												height="20"
												rx={shape === 'square' ? 0 : shape === 'dot' ? 10 : 5}
												fill="currentColor"
											/></svg
										><span>{shape.replaceAll('-', ' ')}</span></button
									>{/each}
							</div>
						</div>
					</div>
				</details>
				<button
					type="button"
					onclick={resetDesign}
					class="px-2 py-2 text-sm font-medium text-slate-500 hover:text-indigo-600"
					>Reset design</button
				>
			</div>
			<div class="space-y-4 lg:sticky lg:top-6 lg:self-start">
				<div class="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-sm font-semibold text-slate-800">Your QR code</h3>
						<span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
							>Live preview</span
						>
					</div>
					<div
						class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-2"
						class:transparent-preview={transparent}
					>
						{#if !content.value}<p class="max-w-52 text-center text-sm leading-6 text-slate-400">
								Your QR code will appear here.<br />Choose a content type and add your details.
							</p>{/if}
						<div
							bind:this={previewContainer}
							class="qr-preview w-full max-w-sm"
							role="img"
							aria-label="Generated QR code preview"
						></div>
					</div>
					<label
						for="size"
						class="mt-5 flex items-center justify-between text-sm font-medium text-slate-700"
						>Export resolution<span class="font-semibold text-indigo-600">{size} × {size} px</span
						></label
					>
					<input
						id="size"
						type="range"
						min="200"
						max="2000"
						step="100"
						bind:value={size}
						class="mt-3 w-full"
					/>
					<div class="mt-1 flex justify-between text-xs text-slate-400">
						<span>Small file</span><span>Print quality</span>
					</div>
					<p class="mt-4 text-xs leading-5 text-slate-500">
						Static QR · no expiration · scan your final design before printing.
					</p>
				</div>
				<button
					type="button"
					onclick={() => {
						attempted = true;
						void generateQR();
					}}
					disabled={!ready || isLoading}
					class="w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white shadow-sm hover:bg-indigo-700"
					>{isLoading ? 'Creating…' : 'Create QR Code'}</button
				>
				<div class="flex gap-2">
					<label for="download-format" class="sr-only">Download format</label><select
						id="download-format"
						bind:value={format}
						class="min-w-0 flex-1"
						><option value="png">PNG image</option><option value="svg">SVG vector</option></select
					><button
						type="button"
						onclick={downloadQR}
						disabled={!content.value || !qrCode || isLoading}
						class="flex-[2] rounded-xl border border-indigo-200 bg-white px-4 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
						>Download {format.toUpperCase()}</button
					>
				</div>
				{#if attempted && content.error}<p
						role="alert"
						class="rounded-xl bg-red-50 p-3 text-sm text-red-700"
					>
						{content.error}
					</p>{/if}
				{#if error}<p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
						{error}
					</p>{/if}
				<section class="rounded-2xl border border-slate-200 bg-white p-5">
					<h3 class="text-sm font-semibold text-slate-800">Start with a style</h3>
					<p class="mt-1 text-xs text-slate-500">Apply a template, then make it your own.</p>
					<div class="mt-4 grid grid-cols-5 gap-2">
						{#each templates as template}<button
								type="button"
								onclick={() => applyTemplate(template)}
								class="group flex flex-col items-center gap-2 text-[10px] font-medium text-slate-500"
								aria-label={`Apply ${template.name} template`}
								><span
									class="flex size-10 items-center justify-center rounded-lg border border-slate-100"
									style={`color: ${template.color}; background: ${template.gradient ? `linear-gradient(135deg, ${template.color}15, ${template.end}25)` : '#f8fafc'}`}
									><svg viewBox="0 0 24 24" class="size-7" aria-hidden="true"
										><path
											fill="currentColor"
											d="M2 2h8v8H2zm3 3v2h2V5zm9-3h8v8h-8zm3 3v2h2V5zM2 14h8v8H2zm3 3v2h2v-2zm9-3h3v3h-3zm5 0h3v5h-3zm-5 5h3v3h-3zm5 2h3v1h-3z"
										/></svg
									></span
								>{template.name}</button
							>{/each}
					</div>
				</section>
			</div>
		</div>
	</div>
</div>

<style>
	.artistic-demo-image {
		width: 262%;
		max-width: none;
		height: auto;
		left: -138%;
		top: -27%;
	}
	.step-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 0.5rem;
		background: #eef2ff;
		color: #4f46e5;
		font-size: 0.8rem;
		flex-shrink: 0;
	}
	.design-section {
		border: 1px solid #e2e8f0;
		border-radius: 1rem;
		background: white;
	}
	.design-section summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		cursor: pointer;
		font-size: 1.125rem;
		font-weight: 600;
		color: #0f172a;
		list-style: none;
	}
	.design-section summary::-webkit-details-marker {
		display: none;
	}
	.summary-arrow {
		margin-left: auto;
		color: #94a3b8;
	}
	details[open] .summary-arrow {
		transform: rotate(180deg);
	}
	.section-body {
		border-top: 1px solid #f1f5f9;
		padding: 1.25rem 1.5rem;
	}
	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #334155;
	}
	.color-field {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #475569;
	}
	.color-field input {
		width: 3rem;
		height: 2.5rem;
		padding: 0.15rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.color-field span {
		font-family: ui-monospace, monospace;
		font-size: 0.75rem;
	}
	.shape-choice {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-width: 4.5rem;
		border: 2px solid #e2e8f0;
		border-radius: 0.65rem;
		padding: 0.65rem;
		color: #475569;
	}
	.shape-choice:hover,
	.shape-choice.chosen {
		border-color: #6366f1;
		background: #eef2ff;
		color: #4338ca;
	}
	.shape-choice span {
		font-size: 0.6rem;
		text-transform: capitalize;
	}
	.qr-preview :global(svg),
	.qr-preview :global(canvas) {
		display: block;
		max-width: 100%;
		height: auto !important;
		margin: 0 auto;
	}
	.transparent-preview {
		background-image:
			linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
			linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
			linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
		background-size: 16px 16px;
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
	}
</style>
