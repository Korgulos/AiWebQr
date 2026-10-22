<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/authStore';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	let { children, data } = $props();
	$effect(() => {
		authStore.setUser(data.user);
	});
	onMount(() => {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const current = document.cookie
			.split('; ')
			.find((row) => row.startsWith('qr_timezone='))
			?.slice('qr_timezone='.length);
		if (zone && current !== encodeURIComponent(zone)) {
			document.cookie = `qr_timezone=${encodeURIComponent(zone)}; Path=/; SameSite=Lax; Max-Age=31536000`;
			void invalidateAll();
		}
		try {
			localStorage.removeItem('user');
		} catch {
			/* Storage may be disabled. Sessions use cookies. */
		}
	});
</script>

<svelte:head>
	<meta
		name="description"
		content="Create custom QR codes with colors, logos and artistic backgrounds. Download high-quality PNG and SVG files with QR Gen Me."
	/>
	<meta name="color-scheme" content="light dark" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b1220" />
</svelte:head>
{@render children()}
