<script>
    import logo from '$lib/assets/qr-code.png';
    import image_profile from '$lib/assets/dummy-profile.png';
    import { SwitchState } from '$lib/elements/nav/switchState.svelte';
    import Counter from '$lib/elements/nav/counter.svelte';
    import TemperatureConverter from '$lib/elements/nav/temperatureConverter.svelte'; // Corrected import path for TemperatureConverter
    import FlightBooker from '$lib/elements/nav/flightBooker.svelte';
    import Timer from './timer.svelte';
  
      let userClicked = $state(false);
      
      const switchState = new SwitchState();
  
  
  </script>
<nav class="bg-gradient-to-r from-indigo-600 to-indigo-800">
    <div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
      <div class="relative flex h-20 items-center justify-between">
        <div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
          <!-- Mobile menu button-->
          <button type="button" class="relative inline-flex items-center justify-center rounded-md p-2 text-indigo-100 hover:bg-indigo-700 hover:text-white focus:ring-2 focus:ring-white focus:outline-hidden" aria-controls="mobile-menu" aria-expanded="false">
            <span class="absolute -inset-0.5"></span>
            <span class="sr-only">Open main menu</span>
            <svg class="block size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <svg class="hidden size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
          <div class="flex shrink-0 items-center">
            <img class="h-12 w-auto" src="{logo}" alt="QR Code Generator">
          </div>
          <div class="hidden sm:ml-8 sm:block">
            <div class="flex space-x-4">
              <a href="/" onclick={() => switchState.state(1)} class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Counter</a>
              <a href="/" onclick={() => switchState.state(2)} class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Team</a>
              <a href="/" onclick={() => switchState.state(3)} class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Flight Booker</a>
              <a href="/" onclick={() => switchState.state(4)} class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Timer</a>
              <a href="/" class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">CRUD</a>
              <a href="/" class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Circle Drawer</a>
              <a href="/" class="rounded-md px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Cells</a>
            </div>
          </div>
        </div>
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
          <button type="button" class="relative rounded-full p-1 text-indigo-100 hover:bg-indigo-700 hover:text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 focus:outline-hidden">
            <span class="absolute -inset-1.5"></span>
            <span class="sr-only">View notifications</span>
            <svg class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </button>
  
          <!-- Profile dropdown -->
          <div class="relative ml-3">
            <div>
              <button type="button" onclick={() => (userClicked = !userClicked)} class="relative flex rounded-full text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 focus:outline-hidden" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                <span class="absolute -inset-1.5"></span>
                <span class="sr-only">Open user menu</span>
                <img class="size-10 rounded-full" src="{image_profile}" alt="">
              </button>
            </div>
  
            {#if userClicked}
            <div class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 focus:outline-hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
              <a href="/" onclick={() => (userClicked = false)} class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600" role="menuitem" tabindex="-1" id="user-menu-item-0">Your Profile</a>
              <a href="/" onclick={() => (userClicked = false)} class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600" role="menuitem" tabindex="-1" id="user-menu-item-1">Settings</a>
              <a href="/" onclick={() => (userClicked = false)} class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600" role="menuitem" tabindex="-1" id="user-menu-item-2">Sign out</a>
            </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  
    <!-- Mobile menu -->
    <div class="sm:hidden" id="mobile-menu">
      <div class="space-y-1 px-2 pb-3 pt-2">
        <a href="/" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:" aria-current="page">Dashboard</a>
        <a href="/" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:">Team</a>
        <a href="/" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:">Projects</a>
        <a href="/" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:">Calendar</a>
      </div>
    </div>
</nav>
{#if (switchState.value === 1)}
<Counter />
{/if}

{#if (switchState.value === 2)}
<TemperatureConverter />
{/if}

{#if (switchState.value === 3)}
<FlightBooker />
{/if}

{#if (switchState.value === 4)}
<Timer />
{/if}