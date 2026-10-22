<script lang="ts">
	import LocalDate from '$lib/elements/local-date.svelte';
	import Nav from '$lib/elements/nav/nav.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let first = $state(''),
		last = $state(''),
		username = $state(''),
		avatar = $state<string | null>(null);
	let editing = $state(false),
		busy = $state(false),
		message = $state(''),
		failed = $state(false);
	let currentPassword = $state(''),
		newPassword = $state(''),
		confirmPassword = $state('');
	let deletePassword = $state(''),
		confirmation = $state(''),
		deleting = $state(false);
	$effect(() => {
		if (!editing) {
			first = data.user.first_name || data.user.name.trim();
			last = data.user.last_name || '';
			username = data.user.username || '';
			avatar = data.user.avatar_data || null;
		}
	});
	async function call(path: string, method: string, body: unknown) {
		const response = await fetch(path, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Request failed');
	}
	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		message = '';
		failed = false;
		try {
			await call('/api/account', 'PATCH', {
				first_name: first,
				last_name: last,
				username,
				avatar_data: avatar
			});
			await invalidateAll();
			editing = false;
			message = 'Your profile has been updated.';
		} catch (e) {
			failed = true;
			message = e instanceof Error ? e.message : 'Could not save profile';
		} finally {
			busy = false;
		}
	}
	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (
			!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
			file.size > 5 * 1024 * 1024
		) {
			failed = true;
			message = 'Choose a PNG, JPEG or WebP up to 5 MB.';
			input.value = '';
			return;
		}
		busy = true;
		try {
			const bitmap = await createImageBitmap(file);
			const canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Image tools unavailable');
			const side = Math.min(bitmap.width, bitmap.height);
			context.drawImage(
				bitmap,
				(bitmap.width - side) / 2,
				(bitmap.height - side) / 2,
				side,
				side,
				0,
				0,
				128,
				128
			);
			bitmap.close();
			avatar = canvas.toDataURL('image/png');
			editing = true;
			failed = false;
			message = 'Avatar ready. Save changes to upload it.';
		} catch {
			failed = true;
			message = 'Could not read that image.';
		} finally {
			busy = false;
			input.value = '';
		}
	}
	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		failed = false;
		message = '';
		if (newPassword !== confirmPassword) {
			failed = true;
			message = 'New passwords do not match.';
			return;
		}
		busy = true;
		try {
			await call('/api/account/password', 'POST', {
				current_password: currentPassword,
				new_password: newPassword
			});
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			authStore.reset();
			await invalidateAll();
			await goto('/login?returnTo=%2Fsettings');
		} catch (e) {
			failed = true;
			message = e instanceof Error ? e.message : 'Could not change password';
		} finally {
			busy = false;
		}
	}
	async function deleteAccount(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		message = '';
		failed = false;
		try {
			await call('/api/account', 'DELETE', { password: deletePassword, confirmation });
			deletePassword = '';
			authStore.reset();
			await invalidateAll();
			await goto('/');
		} catch (e) {
			failed = true;
			message = e instanceof Error ? e.message : 'Could not delete account';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Account settings | QR Gen Me</title></svelte:head>
<Nav />
<main class="mx-auto max-w-3xl space-y-6 px-4 py-10">
	<a href="/" class="text-sm font-semibold text-indigo-600">← Back to dashboard</a>
	<h1 class="text-3xl font-bold">Account settings</h1>
	{#if message}<p
			role="status"
			class="rounded-xl border p-4 {failed
				? 'border-red-200 bg-red-50 text-red-700'
				: 'border-emerald-200 bg-emerald-50 text-emerald-700'}"
		>
			{message}
		</p>{/if}
	<section class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
		<h2 class="text-xl font-semibold">Appearance</h2>
		<p class="mt-2 text-sm text-slate-500">
			Automatic · follows your device’s light or dark appearance. Changes apply immediately.
		</p>
	</section>

	<section class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
		<h2 class="text-xl font-semibold">Your profile</h2>
		<form onsubmit={save} class="mt-6 space-y-5">
			<div class="flex flex-wrap items-center gap-5">
				{#if avatar}<img
						src={avatar}
						alt="Your avatar preview"
						width="80"
						height="80"
						class="size-20 rounded-full object-cover"
					/>{:else}<span
						class="flex size-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700"
						>{(first[0] || '?').toUpperCase()}{last[0]?.toUpperCase() || ''}</span
					>{/if}
				<div>
					<label for="avatar-upload" class="block text-sm font-medium">Upload avatar</label><input
						id="avatar-upload"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						onchange={upload}
						disabled={busy}
						class="mt-2 max-w-full text-sm"
					/>
					<p class="mt-2 text-xs text-slate-500">
						PNG, JPEG or WebP · up to 5 MB · cropped to a square.
					</p>
					{#if avatar}<button
							type="button"
							onclick={() => {
								avatar = null;
								editing = true;
							}}
							disabled={busy}
							class="mt-2 text-sm text-red-600">Remove avatar</button
						>{/if}
				</div>
			</div>
			<div class="grid gap-5 sm:grid-cols-2">
				<div>
					<label for="first-name" class="block text-sm font-medium">First name</label><input
						id="first-name"
						autocomplete="given-name"
						bind:value={first}
						oninput={() => (editing = true)}
						maxlength="60"
						required
						class="mt-2 w-full rounded-lg border px-3 py-2"
					/>
				</div>
				<div>
					<label for="last-name" class="block text-sm font-medium">Last name</label><input
						id="last-name"
						autocomplete="family-name"
						bind:value={last}
						oninput={() => (editing = true)}
						maxlength="60"
						class="mt-2 w-full rounded-lg border px-3 py-2"
					/>
				</div>
			</div>
			<div>
				<label for="username" class="block text-sm font-medium">Username</label><input
					id="username"
					autocomplete="username"
					bind:value={username}
					oninput={() => (editing = true)}
					minlength="3"
					maxlength="30"
					pattern={'[a-zA-Z0-9_]{3,30}'}
					class="mt-2 w-full rounded-lg border px-3 py-2"
				/>
				<p class="mt-2 text-xs text-slate-500">
					Optional · 3–30 letters, numbers or underscores. Sign in with your email.
				</p>
			</div>
			<div>
				<p class="text-sm font-medium">Email</p>
				<p class="mt-2 break-all text-slate-600">{data.user.email.trim()}</p>
			</div>
			<button
				disabled={busy}
				class="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
				>{busy ? 'Saving…' : 'Save changes'}</button
			>
		</form>
	</section>
	<section class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
		<h2 class="text-xl font-semibold">Change password</h2>
		<p class="mt-2 text-sm text-slate-500">
			Changing your password signs you out on all devices. Use 8+ characters, uppercase, lowercase
			and a number.
		</p>
		<form onsubmit={changePassword} class="mt-6 space-y-4">
			<div>
				<label for="current-password" class="block text-sm font-medium">Current password</label
				><input
					id="current-password"
					type="password"
					autocomplete="current-password"
					bind:value={currentPassword}
					required
					class="mt-2 w-full rounded-lg border px-3 py-2"
				/>
			</div>
			<div>
				<label for="new-password" class="block text-sm font-medium">New password</label><input
					id="new-password"
					type="password"
					autocomplete="new-password"
					bind:value={newPassword}
					minlength="8"
					required
					class="mt-2 w-full rounded-lg border px-3 py-2"
				/>
			</div>
			<div>
				<label for="confirm-password" class="block text-sm font-medium">Confirm new password</label
				><input
					id="confirm-password"
					type="password"
					autocomplete="new-password"
					bind:value={confirmPassword}
					minlength="8"
					required
					class="mt-2 w-full rounded-lg border px-3 py-2"
				/>
			</div>
			<button
				disabled={busy}
				class="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
				>Change password</button
			>
		</form>
	</section>
	<section class="rounded-2xl border border-red-200 bg-white p-6 sm:p-8">
		<h2 class="text-xl font-semibold text-red-700">Delete account</h2>
		<p class="mt-2 text-sm text-slate-600">
			Permanently delete your account, campaigns, saved QR codes and analytics. Printed campaign QR
			links will stop working. This cannot be undone.
		</p>
		{#if !deleting}<button
				onclick={() => (deleting = true)}
				class="mt-5 rounded-lg border border-red-300 px-5 py-3 font-semibold text-red-700"
				>Delete my account</button
			>{:else}
			<form onsubmit={deleteAccount} class="mt-6 space-y-4">
				<div>
					<label for="delete-password" class="block text-sm font-medium"
						>Confirm current password</label
					><input
						id="delete-password"
						type="password"
						autocomplete="current-password"
						bind:value={deletePassword}
						required
						class="mt-2 w-full rounded-lg border px-3 py-2"
					/>
				</div>
				<div>
					<label for="delete-confirmation" class="block text-sm font-medium"
						>Type DELETE to confirm</label
					><input
						id="delete-confirmation"
						bind:value={confirmation}
						autocomplete="off"
						required
						pattern="DELETE"
						class="mt-2 w-full rounded-lg border px-3 py-2"
					/>
				</div>
				<div class="flex flex-wrap gap-3">
					<button
						disabled={busy || confirmation !== 'DELETE'}
						class="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
						>Permanently delete account</button
					><button
						type="button"
						disabled={busy}
						onclick={() => {
							deleting = false;
							deletePassword = '';
							confirmation = '';
						}}
						class="rounded-lg border px-5 py-3">Cancel</button
					>
				</div>
			</form>
		{/if}
	</section>
</main>
