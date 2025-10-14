<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTrailsIdentityStore } from "./stores/trailsIdentity";
import { useWalletStore } from "./stores/wallet";

export default defineComponent({
  name: "App",
  setup() {
    const router = useRouter();

    onMounted(async () => {
      try {
        // Initialize stores inside onMounted to ensure Pinia is ready
        const identityStore = useTrailsIdentityStore();
        const walletStore = useWalletStore();
        
        // Initialize wallet
        walletStore.initializeMnemonic();

        // Check if user needs onboarding
        if (!identityStore.onboardingComplete) {
          // Redirect to onboarding if not on that page already
          if (router.currentRoute.value.path !== "/onboarding" && 
              router.currentRoute.value.path !== "/restore") {
            router.push("/onboarding");
          }
        } else {
          // Initialize identity for existing users
          await identityStore.initializeIdentity();
          
          // Claim any pending ecash from npubcash server
          identityStore.claimPendingEcash().catch((error) => {
            console.error("Failed to claim pending ecash:", error);
          });
        }
      } catch (error) {
        console.error("Error during app initialization:", error);
      }
    });

    return {};
  },
});
</script>
