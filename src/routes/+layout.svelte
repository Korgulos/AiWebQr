<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/authStore';
	import { onMount } from 'svelte';
	let { children, data } = $props();
	$effect(() => {
		authStore.setUser(data.user);
	});
	onMount(() => {
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
	<meta name="theme-color" content="#4338ca" />
</svelte:head>
{@render children()}
