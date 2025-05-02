<script lang="ts">
  import Nav from '$lib/elements/nav/nav.svelte'; 
  import Hero from '$lib/elements/body/hero.svelte';
  import  UserPage  from '$lib/elements/body/user-page.svelte';
  import { authStore, type AuthUser } from '$lib/stores/authStore';
  let data: Array<{ user_id: number; name: string }> = [];
   // Corrected import path for Hero component
  async function loadData() {
    const response = await fetch('/api/data');
    data = await response.json();
  }
</script>

<Nav />
{#if $authStore.user}
<UserPage />
{:else}
<Hero />
{/if}