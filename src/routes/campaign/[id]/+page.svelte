<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { page } from '$app/state';
	import Nav from '$lib/elements/nav/nav.svelte';
	import { authStore } from '$lib/stores/authStore';
	import { onMount } from 'svelte';

	let campaign: any = $state(null);
	let comments: any[] = $state([]);
	let newComment = $state('');
	let loading = $state(true);
	let error = $state('');

	async function loadCampaign() {
		try {
			const response = await fetch(`/api/campaigns?id=${page.params.id}`, {
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const data = await response.json();
			if (response.ok) {
				campaign = data.campaigns[0];
				if (campaign) await loadComments();
				else error = 'Campaign not found or unavailable for your account.';
			} else {
				error = data.error;
			}
		} catch (e) {
			error = 'Failed to load campaign';
		} finally {
			loading = false;
		}
	}

	async function loadComments() {
		try {
			const response = await fetch(`/api/campaigns/comments?campaign_id=${page.params.id}`, {
				headers: {
					'Content-Type': 'application/json'
				}
			});
			const data = await response.json();
			if (response.ok) {
				comments = data.comments;
			} else {
				error = data.error;
			}
		} catch (e) {
			error = 'Failed to load comments';
		}
	}

	async function addComment() {
		try {
			const response = await fetch('/api/campaigns/comments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					campaign_id: page.params.id,
					content: newComment
				})
			});
			const data = await response.json();
			if (response.ok) {
				comments = [...comments, data.comment];
				newComment = '';
				error = '';
			} else {
				error = data.error;
			}
		} catch (e) {
			error = 'Failed to add comment';
		}
	}

	onMount(() => {
		if ($authStore.user) {
			loadCampaign();
		} else {
			error = 'Please log in to view campaigns';
			loading = false;
		}
	});
</script>

<Nav></Nav>
<div class="mx-auto max-w-4xl p-4">
	{#if loading}
		<div class="py-8 text-center">Loading campaign...</div>
	{:else if campaign}
		<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
			<h1 class="mb-4 text-3xl font-bold">{campaign.title}</h1>
			<p class="mb-4 text-gray-600">{campaign.description}</p>
			<div class="flex justify-between text-sm text-gray-500">
				<span>By {campaign.author_name}</span>
				<span>{new Date(campaign.created_at).toLocaleDateString()}</span>
			</div>
		</div>

		<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-6 text-2xl font-semibold">Comments</h2>

			{#if $authStore.user}
				<div class="mb-8">
					<form onsubmit={preventDefault(addComment)} class="space-y-4">
						<div>
							<label for="comment" class="block text-sm font-medium text-gray-700"
								>Add a comment</label
							>
							<textarea
								id="comment"
								bind:value={newComment}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								rows="3"
								required
							></textarea>
						</div>
						<button
							type="submit"
							class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						>
							Post Comment
						</button>
					</form>
				</div>
			{/if}

			<div class="space-y-6">
				{#each comments as comment}
					<div class="border-b border-gray-200 pb-4 last:border-b-0">
						<p class="mb-2 text-gray-800">{comment.content}</p>
						<div class="flex justify-between text-sm text-gray-500">
							<span>By {comment.author_name}</span>
							<span>{new Date(comment.created_at).toLocaleDateString()}</span>
						</div>
					</div>
				{/each}

				{#if comments.length === 0}
					<p class="py-4 text-center text-gray-500">No comments yet</p>
				{/if}
			</div>
		</div>
	{:else if error}
		<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700" role="alert">
			<span class="block sm:inline">{error}</span>
		</div>
	{/if}
</div>
