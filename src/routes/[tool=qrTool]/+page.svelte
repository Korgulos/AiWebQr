<script lang="ts">
	import Nav from '$lib/elements/nav/nav.svelte';
	import Generator from '$lib/elements/qr-generator.svelte';
	import { qrTools } from '$lib/qr-tools';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.tool.title}</title>
</svelte:head>
<Nav />
<main>
	<header class="border-b border-indigo-100 bg-indigo-50 px-4 py-12 sm:py-16">
		<div class="mx-auto max-w-5xl">
			<a href="/" class="text-sm font-semibold text-indigo-700 hover:underline"
				>QR Gen Me · All QR tools</a
			>
			<h1 class="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
				{data.tool.label}
			</h1>
			<p class="mt-5 max-w-3xl text-lg leading-8 text-slate-700">{data.tool.intro}</p>
			<p class="mt-4 text-sm font-medium text-indigo-800">
				Free PNG & SVG downloads · No account needed
			</p>
		</div>
	</header>
	<section aria-label={data.tool.label}>
		{#key data.tool.slug}
			<Generator
				initialContentType={data.tool.type}
				expandLogo={data.tool.slug === 'qr-code-with-logo'}
				hideIntro
			/>
		{/key}
	</section>
	<div class="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:py-16">
		<section aria-labelledby="how-to">
			<h2 id="how-to" class="text-2xl font-bold text-slate-900">
				How to create your {data.tool.type === 'wifi'
					? 'Wi-Fi'
					: data.tool.type === 'vcard'
						? 'vCard'
						: 'custom'} QR code
			</h2>
			<ol class="mt-5 list-decimal space-y-3 pl-6 leading-7 text-slate-700">
				{#each data.tool.steps as step}<li>{step}</li>{/each}
			</ol>
		</section>
		<section
			class="rounded-2xl border border-indigo-100 bg-indigo-50 p-6"
			aria-labelledby="example"
		>
			<h2 id="example" class="text-2xl font-bold text-slate-900">A practical example</h2>
			<p class="mt-4 leading-7 text-slate-700">{data.tool.example}</p>
		</section>
		<section aria-labelledby="before-sharing">
			<h2 id="before-sharing" class="text-2xl font-bold text-slate-900">
				Before you share or print
			</h2>
			<ul class="mt-5 list-disc space-y-3 pl-6 leading-7 text-slate-700">
				{#each data.tool.tips as tip}<li>{tip}</li>{/each}
			</ul>
		</section>
		<section aria-labelledby="questions">
			<h2 id="questions" class="text-2xl font-bold text-slate-900">Frequently asked questions</h2>
			<div class="mt-5 divide-y divide-slate-200">
				{#each data.tool.questions as item}
					<details class="py-5">
						<summary class="cursor-pointer font-semibold text-slate-900">{item.question}</summary>
						<p class="mt-3 leading-7 text-slate-700">{item.answer}</p>
					</details>
				{/each}
			</div>
		</section>
		<nav aria-label="More QR code tools" class="border-t border-slate-200 pt-8">
			<h2 class="text-xl font-bold text-slate-900">Explore more QR tools</h2>
			<div class="mt-4 flex flex-wrap gap-4">
				{#each qrTools.filter((tool) => tool.slug !== data.tool.slug) as tool}<a
						href={`/${tool.slug}`}
						class="font-medium text-indigo-700 underline underline-offset-4">{tool.label}</a
					>{/each}
				<a href="/arte-qr-gen" class="font-medium text-indigo-700 underline underline-offset-4"
					>Artistic QR code generator</a
				>
			</div>
		</nav>
	</div>
</main>
<footer class="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
	QR Gen Me <a href="/privacy" class="ml-3 underline">Privacy policy</a>
</footer>
