<script lang="ts">
    import { page } from '$app/stores';
    import { authStore } from '$lib/stores/authStore';
    import { onMount } from 'svelte';

    let campaign: any = null;
    let comments: any[] = [];
    let newComment = '';
    let loading = true;
    let error = '';

    async function loadCampaign() {
        try {
            const response = await fetch(`/api/campaigns?id=${$page.params.id}`, {
                headers: {
                    'Authorization': `Bearer ${$authStore.user?.token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok) {
                campaign = data.campaigns[0];
                await loadComments();
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
            const response = await fetch(`/api/campaigns/comments?campaign_id=${$page.params.id}`, {
                headers: {
                    'Authorization': `Bearer ${$authStore.user?.token}`,
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
                    'Authorization': `Bearer ${$authStore.user?.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    campaign_id: $page.params.id,
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

<div class="max-w-4xl mx-auto p-4">
    {#if loading}
        <div class="text-center py-8">Loading campaign...</div>
    {:else if campaign}
        <div class="bg-white shadow-md rounded-lg p-6 mb-8">
            <h1 class="text-3xl font-bold mb-4">{campaign.title}</h1>
            <p class="text-gray-600 mb-4">{campaign.description}</p>
            <div class="flex justify-between text-sm text-gray-500">
                <span>By {campaign.author_name}</span>
                <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>
        </div>

        <div class="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 class="text-2xl font-semibold mb-6">Comments</h2>
            
            {#if $authStore.user}
                <div class="mb-8">
                    <form on:submit|preventDefault={addComment} class="space-y-4">
                        <div>
                            <label for="comment" class="block text-sm font-medium text-gray-700">Add a comment</label>
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
                            class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Post Comment
                        </button>
                    </form>
                </div>
            {/if}

            <div class="space-y-6">
                {#each comments as comment}
                    <div class="border-b border-gray-200 pb-4 last:border-b-0">
                        <p class="text-gray-800 mb-2">{comment.content}</p>
                        <div class="flex justify-between text-sm text-gray-500">
                            <span>By {comment.author_name}</span>
                            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                {/each}
                
                {#if comments.length === 0}
                    <p class="text-gray-500 text-center py-4">No comments yet</p>
                {/if}
            </div>
        </div>
    {:else if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
            <span class="block sm:inline">{error}</span>
        </div>
    {/if}
</div>