<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { formatCalendarDate } from '$lib/local-time';
	import type { PageData } from '../../routes/$types';
	let { data }: { data: PageData } = $props();
	let dashboard = $derived(data.dashboard);
	let peak = $derived(Math.max(1, ...(dashboard?.daily.map((d) => d.total) || [])));
	function openConfirmation(node: HTMLDialogElement) {
		node.showModal();
	}
	let busy = $state('');
	let actionError = $state('');
	let deleting = $state<{ campaign_id: string; title: string } | null>(null);
	async function updateCampaign(id: string, status?: string) {
		busy = id;
		actionError = '';
		try {
			const response = await fetch(status ? '/api/campaigns/field' : '/api/campaigns', {
				method: status ? 'PATCH' : 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					status ? { id, field: 'status', value: status } : { id, confirmation: 'DELETE' }
				)
			});
			if (!response.ok)
				throw new Error((await response.json()).error || 'Could not update campaign.');
			deleting = null;
			await invalidateAll();
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Could not update campaign.';
		} finally {
			busy = '';
		}
	}
</script>

<main class="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
	<div class="flex flex-wrap items-end justify-between gap-5">
		<div>
			<p class="text-sm font-semibold uppercase tracking-widest text-indigo-600">Your workspace</p>
			<h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-950">
				Welcome back, {data.user?.name.trim()}.
			</h1>
			<p class="mt-3 text-slate-600">Your campaigns and the connections they create.</p>
		</div>
		<div class="flex flex-wrap items-center gap-3 text-sm font-semibold">
			<a
				href="/qr-gen"
				class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-indigo-700"
				>Create a standard QR →</a
			><a
				href="/arte-qr-gen"
				class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-indigo-700"
				>Create an Artistic QR →</a
			>
			<a
				href="/campaign"
				class="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
				>+ Create campaign</a
			>
		</div>
	</div>
	{#if actionError}<p role="alert" class="text-red-600">{actionError}</p>{/if}
	{#if dashboard}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each [{ label: 'Your campaigns', value: dashboard.summary.campaigns, note: `${dashboard.summary.active} active` }, { label: 'Link openings', value: dashboard.summary.total, note: 'Last 30 days · includes bots' }, { label: 'Daily visitors (sum)', value: dashboard.summary.visitors, note: 'Per campaign · approximate' }, { label: 'Bots & previews', value: dashboard.summary.bots, note: 'Last 30 days · estimated' }] as stat}
				<section class="rounded-2xl border border-slate-200 bg-white p-6">
					<h2 class="text-sm font-medium text-slate-600">{stat.label}</h2>
					<p class="mt-3 text-4xl font-bold text-slate-950">{stat.value.toLocaleString()}</p>
					<p class="mt-3 text-xs text-slate-500">{stat.note}</p>
				</section>
			{/each}
		</div>
		<section class="rounded-2xl border border-slate-200 bg-white p-6">
			<h2 class="text-xl font-semibold">Activity over time</h2>
			<p class="mt-1 text-sm text-slate-500">Link openings · last 14 days · local time</p>
			<div
				class="mt-6 flex h-40 items-end gap-2"
				role="img"
				aria-label="Daily link openings over the last 14 days"
			>
				{#each dashboard.daily as day}<div
						class="flex h-full min-w-0 flex-1 items-end"
						title={`${formatCalendarDate(day.day)}: ${day.total} openings`}
					>
						<div
							class="w-full rounded-t-md bg-indigo-500"
							style:height={`${Math.max(2, (day.total / peak) * 100)}%`}
						></div>
					</div>{/each}
			</div>
			<div class="mt-2 flex justify-between text-xs text-slate-500">
				<span>{dashboard.daily[0] ? formatCalendarDate(dashboard.daily[0].day) : ''}</span><span
					>{dashboard.daily.at(-1) ? formatCalendarDate(dashboard.daily.at(-1)!.day) : ''}</span
				>
			</div>
			<details class="mt-4 text-sm">
				<summary class="cursor-pointer text-indigo-600">View daily numbers</summary>
				<div class="mt-3 grid gap-2 sm:grid-cols-2">
					{#each dashboard.daily as day}<p>
							{formatCalendarDate(day.day)}: {day.total} openings
						</p>{/each}
				</div>
			</details>
		</section>
		<section class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
			<div class="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
				<h2 class="text-xl font-semibold">Your campaigns</h2>
				<a href="/campaign" class="text-sm font-semibold text-indigo-600">View all →</a>
			</div>
			{#if dashboard.campaigns.length}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm">
						<thead class="bg-slate-50 text-slate-500"
							><tr
								><th class="px-6 py-3">Campaign</th><th class="px-6 py-3">Status</th><th
									class="px-6 py-3">Openings · 30d</th
								><th class="px-6 py-3">Daily visitors · 30d</th><th class="px-6 py-3">Actions</th
								></tr
							></thead
						><tbody
							>{#each dashboard.campaigns as campaign}<tr class="border-t border-slate-100"
									><td class="max-w-xs px-6 py-5"
										><a
											href={`/campaign/${campaign.campaign_id}`}
											class="font-semibold text-indigo-700 hover:underline">{campaign.title}</a
										>
										<p class="mt-1 truncate text-slate-500">
											{campaign.description || 'No description'}
										</p></td
									><td class="px-6 py-5"
										><select
											aria-label={`Status for ${campaign.title}`}
											class="rounded-lg border border-slate-200 bg-white px-3 py-2"
											value={campaign.status}
											disabled={busy === campaign.campaign_id}
											onchange={(event) =>
												updateCampaign(campaign.campaign_id, event.currentTarget.value)}
										>
											<option value="active">Active</option><option value="paused">Paused</option
											><option value="archived">Archived</option>
										</select></td
									><td class="px-6 py-5">{campaign.total}</td><td class="px-6 py-5"
										>{campaign.visitors}</td
									><td class="px-6 py-5"
										><button
											class="font-semibold text-red-600 hover:underline"
											disabled={!!busy}
											onclick={() => {
												actionError = '';
												deleting = campaign;
											}}>Delete</button
										></td
									></tr
								>{/each}</tbody
						>
					</table>
				</div>
			{:else}<div class="p-10 text-center">
					<h3 class="text-lg font-semibold">Your first campaign starts here</h3>
					<p class="mt-2 text-slate-500">
						Create a tracked QR link to see visits and activity in this dashboard.
					</p>
					<a href="/campaign" class="mt-5 inline-block font-semibold text-indigo-600"
						>Create your first campaign →</a
					>
				</div>{/if}
		</section>
		<p class="text-xs leading-6 text-slate-500">
			Visitors are estimated separately per campaign and day; this is not a count of unique people
			over a month. Static QR codes do not report scans. Activity includes openings of shared
			tracking links.
		</p>
	{:else}<section role="alert" class="rounded-2xl border border-amber-200 bg-amber-50 p-6">
			<h2 class="font-semibold">Dashboard temporarily unavailable</h2>
			<p class="mt-2">Please reload to try again. Your campaign tools are still available.</p>
			<a href="/campaign" class="mt-4 inline-block text-indigo-700">Open campaigns →</a>
		</section>{/if}
</main>

{#if deleting}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
		<dialog
			use:openConfirmation
			oncancel={(event) => {
				if (busy) event.preventDefault();
				else deleting = null;
			}}
			aria-modal="true"
			aria-labelledby="delete-campaign-title"
			aria-describedby="delete-campaign-description"
			tabindex="-1"
			class="m-auto w-full max-w-md rounded-2xl bg-white p-6 text-slate-950 shadow-xl backdrop:bg-black/60"
		>
			<h2 id="delete-campaign-title" class="text-xl font-semibold">Delete campaign?</h2>
			<p id="delete-campaign-description" class="mt-3">
				Delete “{deleting.title}” and its analytics, saved QR codes and files? This cannot be
				undone.
			</p>
			{#if actionError}<p role="alert" class="mt-3 text-red-600">{actionError}</p>{/if}
			<div class="mt-6 flex justify-end gap-3">
				<button
					class="rounded-lg border px-5 py-2"
					disabled={!!busy}
					onclick={() => {
						deleting = null;
					}}>No</button
				>
				<button
					class="rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700"
					disabled={!!busy}
					onclick={() => deleting && updateCampaign(deleting.campaign_id)}
					>{busy ? 'Deleting…' : 'Yes'}</button
				>
			</div>
		</dialog>
	</div>
{/if}
