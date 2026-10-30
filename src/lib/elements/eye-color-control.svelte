<script lang="ts">
	let {
		label,
		mode = $bindable('solid'),
		color = $bindable('#111827'),
		endColor = $bindable('#4338ca'),
		rotation = $bindable(90)
	}: {
		label: string;
		mode?: 'solid' | 'linear' | 'radial';
		color?: string;
		endColor?: string;
		rotation?: number;
	} = $props();
</script>

<fieldset class="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
	<legend class="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</legend>
	<label class="block text-xs text-slate-600 dark:text-slate-300">
		{label} color mode
		<select
			bind:value={mode}
			class="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800"
		>
			<option value="solid">Single color</option>
			<option value="linear">Linear gradient</option>
			<option value="radial">Radial gradient</option>
		</select>
	</label>
	<div class="grid grid-cols-2 gap-2">
		<label class="text-xs text-slate-600 dark:text-slate-300">
			{mode === 'solid' ? 'Color' : 'Start color'}
			<input
				aria-label={`${label} start color`}
				type="color"
				bind:value={color}
				class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300 dark:border-slate-600"
			/>
			<span class="mt-1 block">{color}</span>
		</label>
		{#if mode !== 'solid'}
			<label class="text-xs text-slate-600 dark:text-slate-300">
				End color
				<input
					aria-label={`${label} end color`}
					type="color"
					bind:value={endColor}
					class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300 dark:border-slate-600"
				/>
				<span class="mt-1 block">{endColor}</span>
			</label>
		{/if}
	</div>
	{#if mode === 'linear'}
		<label class="block text-xs text-slate-600 dark:text-slate-300">
			{label} rotation · {rotation}°
			<input
				aria-label={`${label} gradient rotation`}
				type="range"
				min="0"
				max="360"
				bind:value={rotation}
				class="mt-2 w-full"
			/>
		</label>
	{/if}
</fieldset>
