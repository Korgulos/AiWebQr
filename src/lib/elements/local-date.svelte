<script lang="ts">
	import { onMount } from 'svelte';
	let { value, dateOnly = false }: { value: string | Date; dateOnly?: boolean } = $props();
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	let text = $derived(
		mounted
			? dateOnly
				? new Date(value).toLocaleDateString()
				: new Date(value).toLocaleString()
			: '…'
	);
</script>

<time datetime={new Date(value).toISOString()}>{text}</time>
