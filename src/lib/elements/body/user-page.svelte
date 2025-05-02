<script lang="ts">
    import { authStore } from '$lib/stores/authStore';

    function formatDate(dateString: string | null) {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    }
</script>

<div class="container mx-auto px-4 py-8">
    {#if $authStore.user}
        <div class="max-w-4xl mx-auto">
            <div class="bg-white shadow rounded-lg overflow-hidden">
                <!-- Header Section -->
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-8">
                    <div class="flex items-center">
                        <div class="relative">
                            <div class="size-24 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 text-4xl font-bold">
                                {$authStore.user.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="ml-6">
                            <h1 class="text-3xl font-bold text-white">{$authStore.user.name}</h1>
                            <p class="text-indigo-200 mt-1">{$authStore.user.email}</p>
                            <div class="mt-2">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {$authStore.user.subscription ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                    {$authStore.user.subscription ? 'Premium User' : 'Free User'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- User Details Section -->
                <div class="px-6 py-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Account Information -->
                        <div class="space-y-4">
                            <h2 class="text-xl font-semibold text-gray-900">Account Information</h2>
                            <div class="space-y-3">
                                <div>
                                    <p class="text-sm font-medium text-gray-500">Member Since</p>
                                    <p class="mt-1 text-gray-900">{formatDate($authStore.user.signup)}</p>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-500">Last Login</p>
                                    <p class="mt-1 text-gray-900">{formatDate($authStore.user.login)}</p>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-500">Last Logout</p>
                                    <p class="mt-1 text-gray-900">{formatDate($authStore.user.logout)}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="space-y-4">
                            <h2 class="text-xl font-semibold text-gray-900">Quick Actions</h2>
                            <div class="grid grid-cols-2 gap-4">
                                <a href="/qr-gen" class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Create QR Code
                                </a>
                                <a href="/arte-qr-gen" class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Create Artistic QR
                                </a>
                                <a href="/campaign" class="col-span-2 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Create Campaign QR 
                                </a>
                                {#if !$authStore.user.subscription}
                                    <button class="col-span-2 inline-flex items-center justify-center mt-10 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                                        Upgrade to Premium
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>