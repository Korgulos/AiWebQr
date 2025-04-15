<script>
  import Nav from '$lib/elements/nav/nav.svelte';
</script>

<Nav />

<div class="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 py-16">
  <div class="mx-auto max-w-3xl text-center">
    <div class="mb-8 animate-bounce">
      <svg class="mx-auto size-24 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    </div>
    
    <h1 class="mb-4 text-4xl font-bold tracking-tight text-indigo-900 sm:text-5xl">Under Construction</h1>
    
    <div class="space-y-6 text-lg text-gray-600">
      <p>We're working hard to bring you something amazing!</p>
      <p class="text-sm">This page is currently under development. Our team is putting the finishing touches on this section.</p>
    </div>

    <div class="mt-10 flex flex-col items-center justify-center gap-4">
      <div class="h-2 w-32 rounded-full bg-indigo-200">
        <div class="h-2 w-2/3 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-indigo-600"></div>
      </div>
      
      <a href="/" class="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        Return to Homepage
      </a>
    </div>
  </div>
</div>