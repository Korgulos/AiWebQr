<script lang="ts">
	import Dashboard from '$lib/elements/dashboard.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	import Nav from '$lib/elements/nav/nav.svelte';
	import Generator from '$lib/elements/qr-generator.svelte';
	import { authStore } from '$lib/stores/authStore';
	let navigation: ReturnType<typeof Nav> | undefined = $state();
</script>

<svelte:head>
	<title>{data.user ? 'Dashboard | QR Gen Me' : 'QR Gen Me — Free Custom QR Codes'}</title>
	<meta property="og:title" content="QR Gen Me — Make every connection count" />
	<meta
		property="og:description"
		content="Turn a link into a custom QR code. Add your colors and logo, then download in PNG or SVG."
	/>
	<meta property="og:type" content="website" />
</svelte:head>
<Nav bind:this={navigation} />
{#if data.user}
	<Dashboard {data} />
{:else}
	<main>
		<h1 class="sr-only">Free custom QR code generator</h1>
		<section id="generator" aria-label="Create your QR code"><Generator /></section>
		<section
			class="relative overflow-hidden border-b border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50"
		>
			<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<p class="mb-5 text-sm font-semibold uppercase tracking-widest text-indigo-600">
					Small code. Endless possibilities.
				</p>
				<h2 class="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
					Make every<br />connection <span class="text-indigo-600">count.</span>
				</h2>
				<p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">
					Your link, your style. Create a custom QR code in seconds — ready for your next menu,
					business card or big idea.
				</p>
				<div class="mt-7 flex flex-wrap gap-3 text-sm text-slate-600">
					<span class="rounded-full border border-indigo-100 bg-white px-4 py-2"
						>No account needed</span
					>
					<span class="rounded-full border border-indigo-100 bg-white px-4 py-2"
						>Free PNG & SVG export</span
					>
					<span class="rounded-full border border-indigo-100 bg-white px-4 py-2"
						>Colors & custom logos</span
					>
				</div>
			</div>
		</section>
		<section id="help" class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
			<p class="text-sm font-semibold text-indigo-600">FROM LINK TO REAL LIFE</p>
			<h2 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">
				Three steps. One great connection.
			</h2>
			<div class="mt-8 grid gap-8 md:grid-cols-3">
				{#each [{ title: 'Add your content', text: 'Paste a website link or enter the text you want people to discover.' }, { title: 'Find your style', text: 'Choose colors, shapes and a logo. Keep a strong contrast so your code stays easy to scan.' }, { title: 'Download & share', text: 'Use PNG for everyday sharing or SVG for print. Always scan your finished design before printing.' }] as step, i}
					<article class="rounded-2xl border border-slate-200 p-6">
						<span
							class="flex size-10 items-center justify-center rounded-xl bg-indigo-50 font-semibold text-indigo-600"
							>0{i + 1}</span
						>
						<h3 class="mt-5 text-lg font-semibold">{step.title}</h3>
						<p class="mt-2 leading-7 text-slate-600">{step.text}</p>
					</article>
				{/each}
			</div>
			<div
				class="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-slate-900 p-8 text-white"
			>
				<div>
					<h3 class="text-xl font-semibold">A little more creative?</h3>
					<p class="mt-2 text-slate-300">
						Blend your QR code with an image — even an animated GIF.
					</p>
				</div>
				<a
					href="/arte-qr-gen"
					class="rounded-lg bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-indigo-50"
					>Try Artistic QR →</a
				>
			</div>
		</section>
		{#if !$authStore.user}
			<section
				class="border-t border-indigo-100 bg-indigo-50 px-4 py-12 text-center"
				aria-labelledby="signup-heading"
			>
				<h2 id="signup-heading" class="text-2xl font-bold text-slate-900">
					Keep your campaigns in one place
				</h2>
				<p class="mx-auto mt-3 max-w-lg text-slate-600">
					Create an account to manage your QR campaigns. You can always create and download standard
					QR codes without signing up.
				</p>
				<button
					onclick={() => navigation?.showRegister()}
					class="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
					>Create an account</button
				>
			</section>
		{/if}
	</main>
{/if}
<footer class="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
	QR Gen Me · Made for real-world connections.
	<a href="/privacy" class="ml-3 underline underline-offset-4">Privacy policy</a>
</footer>
