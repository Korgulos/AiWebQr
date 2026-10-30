<script lang="ts">
	let { shape, ring = false }: { shape: string; ring?: boolean } = $props();
</script>

<svg viewBox="0 0 36 36" class="size-9" aria-hidden="true">
	{#if shape === 'classy' || shape === 'classy-rounded'}
		<path
			d={shape === 'classy'
				? 'M5 5H23Q31 5 31 13V31H13Q5 31 5 23Z'
				: 'M11 5H21Q31 5 31 15V25Q31 31 25 31H15Q5 31 5 21V11Q5 5 11 5Z'}
			fill={ring ? 'none' : 'currentColor'}
			stroke={ring ? 'currentColor' : 'none'}
			stroke-width="5"
		/>
	{:else}
		<rect
			x="5"
			y="5"
			width="26"
			height="26"
			rx={shape === 'square' ? 0 : shape === 'dot' ? 13 : shape === 'rounded' ? 4 : 9}
			fill={ring ? 'none' : 'currentColor'}
			stroke={ring ? 'currentColor' : 'none'}
			stroke-width="5"
		/>
	{/if}
</svg>
