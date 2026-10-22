<script lang="ts">
	import { onMount } from 'svelte';
	let { content }: { content: string } = $props();
	let container: HTMLDivElement;
	let ready = $state(false);
	let failed = $state(false);
	let dark = $state(false);
	onMount(() => {
		const preference = window.matchMedia('(prefers-color-scheme: dark)');
		dark = preference.matches;
		const update = () => {
			dark = preference.matches;
		};
		preference.addEventListener('change', update);
		ready = true;
		return () => preference.removeEventListener('change', update);
	});
	$effect(() => {
		const value = content;
		const foreground = dark ? '#a5b4fc' : '#4338ca';
		const background = dark ? '#1e293b' : '#ffffff';
		if (!ready || !container || !value) return;
		let cancelled = false;
		failed = false;
		import('qr-code-styling')
			.then(({ default: QRCodeStyling }) => {
				if (cancelled) return;
				container.replaceChildren();
				new QRCodeStyling({
					type: 'svg',
					width: 96,
					height: 96,
					data: value,
					margin: 8,
					qrOptions: { errorCorrectionLevel: 'M' },
					dotsOptions: { color: foreground, type: 'square' },
					backgroundOptions: { color: background }
				}).append(container);
			})
			.catch(() => {
				if (!cancelled) failed = true;
			});
		return () => {
			cancelled = true;
		};
	});
</script>

<div class="flex justify-center">
	{#if failed}<p class="text-sm text-slate-500">QR preview unavailable.</p>{/if}
	<div
		bind:this={container}
		role="img"
		aria-label="Campaign QR code"
		class="overflow-hidden rounded-lg"
		hidden={failed}
	></div>
</div>
