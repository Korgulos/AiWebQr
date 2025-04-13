<script lang="ts">
    let count = $state(0);
</script>

<div class="mx-auto m-12 max-w-7xl px-2 sm:px-6 lg:px-8">
    <input type="text" bind:value={count} />
    <button onclick={()=>count++} type="button" class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-200 hover:bg-gray-700 hover:text-white focus:ring-2 bg-teal-950 focus:outline-hidden focus:ring-inset" aria-controls="mobile-menu" aria-expanded="false">Count</button>
</div>