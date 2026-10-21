<script lang="ts">
	let { showSignup = true }: { showSignup?: boolean } = $props();
	import logo from '$lib/assets/qr-code-sm.png';
	import { authStore } from '$lib/stores/authStore';
	import { login, register, logout } from '$lib/auth';

	let mobileOpen = $state(false);
	function openDialog(node: HTMLDialogElement) {
		node.showModal();
		return { destroy: () => node.close() };
	}
	let showLoginForm = $state(false);
	let showRegisterForm = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Form data and validation states
	let loginEmail = $state('');
	let loginPassword = $state('');
	let registerName = $state('');
	let registerEmail = $state('');
	let registerPassword = $state('');
	let formErrors = $state({
		name: '',
		email: '',
		password: ''
	});

	function isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function isValidPassword(password: string): boolean {
		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
		return passwordRegex.test(password);
	}

	function validateRegistration(): boolean {
		formErrors = {
			name: '',
			email: '',
			password: ''
		};

		let isValid = true;

		if (registerName.length < 2 || registerName.length > 30) {
			formErrors.name = 'Name must be between 2 and 30 characters';
			isValid = false;
		}

		if (!registerEmail) {
			formErrors.email = 'Email is required';
			isValid = false;
		} else if (!isValidEmail(registerEmail)) {
			formErrors.email = 'Invalid email format';
			isValid = false;
		} else if (registerEmail.length > 60) {
			formErrors.email = 'Email must not exceed 60 characters';
			isValid = false;
		}

		if (!registerPassword) {
			formErrors.password = 'Password is required';
			isValid = false;
		} else if (!isValidPassword(registerPassword)) {
			formErrors.password =
				'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
			isValid = false;
		}

		return isValid;
	}

	function validateLogin(): boolean {
		formErrors = {
			name: '',
			email: '',
			password: ''
		};

		let isValid = true;

		if (!loginEmail) {
			formErrors.email = 'Email is required';
			isValid = false;
		} else if (!isValidEmail(loginEmail)) {
			formErrors.email = 'Invalid email format';
			isValid = false;
		}

		if (!loginPassword) {
			formErrors.password = 'Password is required';
			isValid = false;
		}

		return isValid;
	}

	async function handleLogin(event: Event) {
		event.preventDefault();

		if (!validateLogin()) {
			return;
		}

		const result = await login(loginEmail, loginPassword);
		if (result.error) {
			error = result.error;
		} else {
			showLoginForm = false;
			loginEmail = '';
			loginPassword = '';
			error = null;
			formErrors = { name: '', email: '', password: '' };
		}
	}

	async function handleRegister(event: Event) {
		event.preventDefault();

		if (!validateRegistration()) {
			return;
		}

		const result = await register(registerName, registerEmail, registerPassword);
		if (result.error) {
			error = result.error;
		} else {
			showRegisterForm = false;
			registerName = '';
			registerEmail = '';
			registerPassword = '';
			error = null;
			formErrors = { name: '', email: '', password: '' };
		}
	}

	function handleLogout() {
		logout();
		mobileOpen = false;
	}

	function showLogin() {
		showLoginForm = true;
		showRegisterForm = false;
	}

	export function showRegister() {
		showRegisterForm = true;
		showLoginForm = false;
	}

	function closeLoginForm() {
		error = null;
		showLoginForm = false;
	}

	function closeRegisterForm() {
		error = null;
		showRegisterForm = false;
	}
</script>

<nav class="border-b border-indigo-100 bg-white" aria-label="Main navigation">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex min-h-20 items-center justify-between gap-4">
			<a
				href="/"
				class="flex shrink-0 items-center gap-2 text-xl font-bold text-slate-900"
				aria-label="QR Gen Me home"
			>
				<img src={logo} alt="" width="36" height="36" class="size-9" />
				<span>QR<span class="text-indigo-600">Gen</span>Me</span>
			</a>
			<div class="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
				<a href="/qr-gen" class="hover:text-indigo-600">QR generator</a>
				<a href="/arte-qr-gen" class="hover:text-indigo-600">Artistic QR</a>
				{#if $authStore.user}<a href="/campaign" class="hover:text-indigo-600">My campaigns</a>{/if}
				<a href="/#help" class="hover:text-indigo-600">How it works</a>
			</div>
			<div class="flex items-center gap-3 text-sm">
				{#if $authStore.user}
					<button
						onclick={handleLogout}
						class="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">Sign out</button
					>
				{:else}
					<button onclick={showLogin} class="hidden text-slate-600 hover:text-indigo-600 sm:block"
						>Log in</button
					>
					{#if showSignup}
						<button
							onclick={showRegister}
							class="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700"
							>Sign up</button
						>
					{/if}
				{/if}
				<button
					type="button"
					class="rounded-lg border border-slate-200 p-2 md:hidden"
					aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
					aria-controls="mobile-menu"
					aria-expanded={mobileOpen}
					onclick={() => (mobileOpen = !mobileOpen)}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
						><path d={mobileOpen ? 'M6 6l12 12M6 18L18 6' : 'M3 6h18M3 12h18M3 18h18'} /></svg
					>
				</button>
			</div>
		</div>
		{#if mobileOpen}
			<div id="mobile-menu" class="space-y-1 border-t border-slate-100 py-3 md:hidden">
				<a
					href="/qr-gen"
					onclick={() => (mobileOpen = false)}
					class="block rounded-lg px-3 py-3 hover:bg-indigo-50">QR generator</a
				>
				<a
					href="/arte-qr-gen"
					onclick={() => (mobileOpen = false)}
					class="block rounded-lg px-3 py-3 hover:bg-indigo-50">Artistic QR</a
				>
				{#if $authStore.user}<a
						href="/campaign"
						class="block rounded-lg px-3 py-3 hover:bg-indigo-50">My campaigns</a
					>{/if}
				<a
					href="/#help"
					onclick={() => (mobileOpen = false)}
					class="block rounded-lg px-3 py-3 hover:bg-indigo-50">How it works</a
				>
				{#if !$authStore.user}<button
						onclick={showLogin}
						class="block w-full rounded-lg px-3 py-3 text-left hover:bg-indigo-50">Log in</button
					>{/if}
			</div>
		{/if}
	</div>
</nav>

<!-- Login Modal -->
{#if showLoginForm}
	<dialog
		use:openDialog
		oncancel={closeLoginForm}
		aria-labelledby="login-title"
		class="m-auto w-full max-w-md rounded-2xl bg-white p-0 shadow-xl"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-8">
			<h2 id="login-title" class="mb-6 text-2xl font-bold">Welcome back</h2>
			{#if error}
				<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
					{error}
				</div>
			{/if}
			<form onsubmit={handleLogin} class="space-y-4">
				<div>
					<label for="login-email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						type="email"
						autocomplete="email"
						id="login-email"
						bind:value={loginEmail}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
					{#if formErrors.email}
						<p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
					{/if}
				</div>
				<div>
					<label for="login-password" class="block text-sm font-medium text-gray-700"
						>Password</label
					>
					<input
						type="password"
						autocomplete="current-password"
						id="login-password"
						bind:value={loginPassword}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
					{#if formErrors.password}
						<p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
					{/if}
				</div>
				<div class="flex justify-end gap-4">
					<button
						type="button"
						onclick={closeLoginForm}
						class="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
						disabled={$authStore.loading}
					>
						{$authStore.loading ? 'Loading...' : 'Log in'}
					</button>
				</div>
			</form>
		</div>
	</dialog>
{/if}

<!-- Register Modal -->
{#if showRegisterForm}
	<dialog
		use:openDialog
		oncancel={closeRegisterForm}
		aria-labelledby="register-title"
		class="m-auto w-full max-w-md rounded-2xl bg-white p-0 shadow-xl"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-8">
			<h2 id="register-title" class="mb-6 text-2xl font-bold">Create an account</h2>
			{#if error}
				<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
					{error}
				</div>
			{/if}
			<form onsubmit={handleRegister} class="space-y-4">
				<div>
					<label for="register-name" class="block text-sm font-medium text-gray-700">Name</label>
					<input
						type="text"
						autocomplete="name"
						id="register-name"
						bind:value={registerName}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
					{#if formErrors.name}
						<p class="mt-1 text-sm text-red-600">{formErrors.name}</p>
					{/if}
				</div>
				<div>
					<label for="register-email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						type="email"
						autocomplete="email"
						id="register-email"
						bind:value={registerEmail}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
					{#if formErrors.email}
						<p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
					{/if}
				</div>
				<div>
					<label for="register-password" class="block text-sm font-medium text-gray-700"
						>Password</label
					>
					<input
						type="password"
						autocomplete="new-password"
						id="register-password"
						bind:value={registerPassword}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
					{#if formErrors.password}
						<p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
					{/if}
				</div>
				<div class="flex justify-end gap-4">
					<button
						type="button"
						onclick={closeRegisterForm}
						class="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
						disabled={$authStore.loading}
					>
						{$authStore.loading ? 'Loading...' : 'Sign up'}
					</button>
				</div>
			</form>
		</div>
	</dialog>
{/if}

<style>
	dialog::backdrop {
		background: rgb(15 23 42 / 55%);
		backdrop-filter: blur(3px);
	}
</style>
