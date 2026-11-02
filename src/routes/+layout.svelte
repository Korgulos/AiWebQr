<script lang="ts">
	import '../app.css';
	import { qrTools } from '$lib/qr-tools';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/authStore';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	let { children, data } = $props();
	const publicDescriptions: Record<string, string> = {
		...Object.fromEntries(qrTools.map((tool) => [`/${tool.slug}`, tool.description])),
		'/': 'Free QR code generator with custom colors, logos and shapes. Create QR codes online and download PNG or SVG files without signing up.',
		'/arte-qr-gen':
			'Free artistic and animated QR code generator. Create a QR code with a GIF background or photo, then download GIF or PNG without signing up.',
		'/privacy':
			'Read how QR Gen Me handles account information, QR campaigns and sign-in data, and how to contact us about your privacy.'
	};
	const socialPages: Record<string, { title: string; image: string; alt: string }> = {
		'/privacy': {
			title: 'Privacy Policy | QR Gen Me',
			image: 'home',
			alt: 'QR Gen Me — Custom QR codes with artistic designs.'
		},
		'/': {
			title: 'Free QR Code Generator with Logo | QR Gen Me',
			image: 'home',
			alt: 'QR Gen Me — Small code. Endless possibilities. Custom QR codes with artistic designs.'
		},
		'/arte-qr-gen': {
			title: 'Free Artistic & Animated QR Code Generator | QR Gen Me',
			image: 'artistic',
			alt: 'QR Gen Me Artistic QR — Make a code. Make it art. Images and animated GIFs.'
		},
		'/wifi-qr-code-generator': {
			title: 'Free WiFi QR Code Generator | QR Gen Me',
			image: 'wifi',
			alt: 'QR Gen Me Wi-Fi QR — One scan. You’re connected.'
		},
		'/vcard-qr-code-generator': {
			title: 'Free vCard QR Code Generator for Contacts | QR Gen Me',
			image: 'vcard',
			alt: 'QR Gen Me vCard QR — One scan. A new connection.'
		},
		'/qr-code-with-logo': {
			title: 'Free QR Code Generator with Logo — PNG & SVG | QR Gen Me',
			image: 'logo',
			alt: 'QR Gen Me — Your code. Your signature. Custom logos, colors and frames.'
		}
	};
	const social = $derived(socialPages[page.url.pathname] || socialPages['/']);
	const socialImage = $derived(`https://www.qr-gen-me.com/og/${social.image}.png`);

	const indexable = $derived(!data.user && Object.hasOwn(publicDescriptions, page.url.pathname));
	const description = $derived(
		publicDescriptions[page.url.pathname] || 'Manage your QR Gen Me account and QR code campaigns.'
	);
	const canonical = $derived(`https://www.qr-gen-me.com${page.url.pathname}`);
	$effect(() => {
		authStore.setUser(data.user);
	});
	onMount(() => {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const current = document.cookie
			.split('; ')
			.find((row) => row.startsWith('qr_timezone='))
			?.slice('qr_timezone='.length);
		if (zone && current !== encodeURIComponent(zone)) {
			document.cookie = `qr_timezone=${encodeURIComponent(zone)}; Path=/; SameSite=Lax; Max-Age=31536000`;
			void invalidateAll();
		}
		try {
			localStorage.removeItem('user');
		} catch {
			/* Storage may be disabled. Sessions use cookies. */
		}
	});
</script>

<svelte:head>
	<meta name="description" content={description} />
	{#if indexable}
		<link rel="canonical" href={canonical} />
		<meta property="og:url" content={canonical} />
		<meta property="og:site_name" content="QR Gen Me" />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={social.title} />
		<meta property="og:description" content={description} />
		<meta property="og:image" content={socialImage} />
		<meta property="og:image:secure_url" content={socialImage} />
		<meta property="og:image:type" content="image/png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content={social.alt} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={social.title} />
		<meta name="twitter:description" content={description} />
		<meta name="twitter:image" content={socialImage} />
		<meta name="twitter:image:alt" content={social.alt} />
	{:else}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
	<meta name="color-scheme" content="light dark" />
	<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
	<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b1220" />
</svelte:head>
{@render children()}
