<script lang="ts">
	import {
		contentFields,
		emptyContent,
		type ContentType,
		type ContentValues
	} from '$lib/qr-content';
	let { type, values = $bindable(emptyContent()) }: { type: ContentType; values?: ContentValues } =
		$props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	{#each contentFields[type] as field (field.key)}
		<div class={field.wide ? 'sm:col-span-2' : ''}>
			<label for={`qr-content-${field.key}`} class="mb-1.5 block text-sm font-medium text-slate-700"
				>{field.label}</label
			>
			{#if field.type === 'textarea'}
				<textarea
					id={`qr-content-${field.key}`}
					bind:value={values[field.key]}
					rows="4"
					maxlength="2000"
					placeholder={field.placeholder || ''}
					class="w-full resize-y"
				></textarea>
			{:else if field.type === 'select'}
				<select id={`qr-content-${field.key}`} bind:value={values[field.key]} class="w-full">
					{#each field.options || [] as option}<option value={option.value}>{option.label}</option
						>{/each}
				</select>
			{:else}
				<input
					id={`qr-content-${field.key}`}
					type={field.type === 'number' ? 'text' : field.type || 'text'}
					inputmode={field.type === 'number' ? 'decimal' : undefined}
					bind:value={values[field.key]}
					maxlength="2000"
					placeholder={field.placeholder || ''}
					autocomplete="off"
					class="w-full"
				/>
			{/if}
		</div>
	{/each}
</div>
