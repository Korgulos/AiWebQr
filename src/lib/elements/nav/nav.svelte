<script lang="ts">
    import logo from '$lib/assets/qr-code-sm.png';
    import image_profile from '$lib/assets/dummy-profile.png';
    import { authStore, type AuthUser } from '$lib/stores/authStore';
    import { login, register, logout } from '$lib/auth';
  
    let userClicked = $state(false);
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
            formErrors.password = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
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
        userClicked = false;
    }

    function toggleUserMenu() {
        userClicked = !userClicked;
    }

    function showLogin() {
        showLoginForm = true;
        showRegisterForm = false;
    }

    function showRegister() {
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
            <a href="/">  
              <img class="h-12 w-auto" src="{logo}" alt="QR Code Generator">
            </a>
          </div>
          <div class="hidden sm:ml-8 sm:block">
            <div class="flex space-x-4">
              <a href="/" class="rounded-md px-4 py-2.5 text-xl font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Home</a>
              <a href="/qr-gen" class="rounded-md px-4 py-2.5 text-xl font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Pretty QR</a>
              <a href="/arte-qr-gen" class="rounded-md px-4 py-2.5 text-xl font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Artistic QR</a>
              <a href="/under-construction" class="rounded-md px-4 py-2.5 text-xl font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50">Contact</a>
            </div>
          </div>
        </div>
        {#if $authStore.user}
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
                <button type="button" onclick={toggleUserMenu} class="relative flex rounded-full text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 focus:outline-hidden" id="user-menu-button" aria-expanded="{userClicked}" aria-haspopup="true">
                  <span class="absolute -inset-1.5"></span>
                  <span class="sr-only">Open user menu</span>
                  <img class="size-10 rounded-full" src="{image_profile}" alt="">
                </button>
              </div>
  
              {#if userClicked}
              <div class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 focus:outline-hidden" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
                <a href="/under-construction" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50" role="menuitem">Your Profile</a>
                <a href="/under-construction" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50" role="menuitem">Settings</a>
                <button onclick={handleLogout} class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50" role="menuitem">Sign out</button>
              </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="flex items-center gap-4">
            <button onclick={showLogin} class="text-indigo-100 hover:text-white">Log in</button>
            <button onclick={showRegister} class="rounded bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400">Sign up</button>
          </div>
        {/if}
      </div>
    </div>
  
    <!-- Mobile menu -->
    <div class="sm:hidden" id="mobile-menu">
      <div class="space-y-1 px-2 pb-3 pt-2">
        <a href="/" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:" aria-current="page">Home</a>
        <a href="/qr-gen" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:">Pretty QR</a>
        <a href="/arte-qr-gen" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:">Artistic QR</a>
        <a href="/under-construction" class="block rounded-md px-3 py-2 text-base font-medium text-indigo-200 transition-colors duration-200 hover:bg-indigo-900 hover:text-slate-50hover:">Contact</a>
      </div>
    </div>
</nav>

<!-- Login Modal -->
{#if showLoginForm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 class="text-2xl font-bold mb-6">Log in</h2>
            {#if error}
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            {/if}
            <form onsubmit={handleLogin} class="space-y-4">
                <div>
                    <label for="login-email" class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="login-email" bind:value={loginEmail} required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    {#if formErrors.email}
                        <p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    {/if}
                </div>
                <div>
                    <label for="login-password" class="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="login-password" bind:value={loginPassword} required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    {#if formErrors.password}
                        <p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
                    {/if}
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" onclick={closeLoginForm}
                            class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                        Cancel
                    </button>
                    <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                            disabled={$authStore.loading}>
                        {$authStore.loading ? 'Loading...' : 'Log in'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!-- Register Modal -->
{#if showRegisterForm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 class="text-2xl font-bold mb-6">Create an account</h2>
            {#if error}
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            {/if}
            <form onsubmit={handleRegister} class="space-y-4">
                <div>
                    <label for="register-name" class="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" id="register-name" bind:value={registerName} required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    {#if formErrors.name}
                        <p class="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    {/if}
                </div>
                <div>
                    <label for="register-email" class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="register-email" bind:value={registerEmail} required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    {#if formErrors.email}
                        <p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    {/if}
                </div>
                <div>
                    <label for="register-password" class="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="register-password" bind:value={registerPassword} required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                    {#if formErrors.password}
                        <p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
                    {/if}
                </div>
                <div class="flex justify-end gap-4">
                    <button type="button" onclick={closeRegisterForm}
                            class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                        Cancel
                    </button>
                    <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                            disabled={$authStore.loading}>
                        {$authStore.loading ? 'Loading...' : 'Sign up'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
