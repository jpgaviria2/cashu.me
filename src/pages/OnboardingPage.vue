<template>
  <q-page class="flex flex-center bg-gradient">
    <div class="onboarding-container">
      <!-- Step 1: Welcome -->
      <div v-if="currentStep === 1" class="onboarding-step fade-in">
        <div class="logo-container">
          <img src="/icons/icon-512x512.png" alt="Trails Coffee" class="app-logo" />
        </div>
        <h1 class="text-h3 text-weight-bold q-mb-md text-center">
          Welcome to<br />Trails Coffee Rewards
        </h1>
        <p class="text-body1 text-center q-mb-xl text-grey-7">
          Earn rewards with every purchase.<br />
          Powered by Bitcoin Lightning ⚡
        </p>
        <q-btn
          unelevated
          rounded
          color="primary"
          size="lg"
          class="full-width q-mb-md"
          @click="startOnboarding"
          :loading="loading"
        >
          Get Started
        </q-btn>
        <q-btn
          flat
          rounded
          color="grey-7"
          size="md"
          class="full-width"
          to="/restore"
        >
          I already have an account
        </q-btn>
      </div>

      <!-- Step 2: Identity Creation (Automatic) -->
      <div v-if="currentStep === 2" class="onboarding-step fade-in">
        <div class="text-center q-mb-xl">
          <q-spinner-dots color="primary" size="80px" />
          <h2 class="text-h5 q-mt-lg">Creating your account...</h2>
          <p class="text-body2 text-grey-7 q-mt-md">
            {{ creationStatus }}
          </p>
        </div>
      </div>

      <!-- Step 3: Identity Created -->
      <div v-if="currentStep === 3" class="onboarding-step fade-in">
        <div class="success-icon q-mb-lg">
          <q-icon name="check_circle" size="80px" color="positive" />
        </div>
        <h2 class="text-h4 text-weight-bold text-center q-mb-md">
          Account Created!
        </h2>
        <p class="text-body1 text-center q-mb-lg text-grey-7">
          Your Lightning address:
        </p>
        
        <q-card flat bordered class="identity-card q-mb-xl">
          <q-card-section>
            <div class="text-center">
              <div class="text-h6 text-weight-medium text-primary q-mb-sm">
                {{ identityStore.lightningAddress }}
              </div>
              <div class="text-caption text-grey-6 q-mb-md">
                {{ identityStore.shortNpub }}
              </div>
              <q-btn
                flat
                dense
                icon="content_copy"
                color="primary"
                size="sm"
                @click="copyLightningAddress"
              >
                Copy Address
              </q-btn>
            </div>
          </q-card-section>
        </q-card>

        <div class="info-box q-mb-xl">
          <q-icon name="info" color="primary" size="24px" class="q-mr-sm" />
          <div class="text-body2">
            <strong>No passwords to remember!</strong><br />
            Your account is secured by your device. You can optionally back it up with trusted contacts.
          </div>
        </div>

        <q-btn
          unelevated
          rounded
          color="primary"
          size="lg"
          class="full-width q-mb-md"
          @click="nextStep"
        >
          Continue
        </q-btn>
        <q-btn
          flat
          rounded
          color="grey-7"
          size="sm"
          class="full-width"
          @click="showBackupOptions = true"
        >
          Setup Backup (Optional)
        </q-btn>
      </div>

      <!-- Step 4: How It Works -->
      <div v-if="currentStep === 4" class="onboarding-step fade-in">
        <h2 class="text-h4 text-weight-bold text-center q-mb-xl">
          How It Works
        </h2>

        <div class="feature-list">
          <div class="feature-item q-mb-lg">
            <q-icon name="shopping_bag" color="primary" size="48px" class="q-mb-sm" />
            <h3 class="text-h6 text-weight-medium q-mb-sm">1. Shop</h3>
            <p class="text-body2 text-grey-7">
              Make purchases at Trails Coffee
            </p>
          </div>

          <div class="feature-item q-mb-lg">
            <q-icon name="stars" color="primary" size="48px" class="q-mb-sm" />
            <h3 class="text-h6 text-weight-medium q-mb-sm">2. Earn</h3>
            <p class="text-body2 text-grey-7">
              Automatically receive rewards in your wallet
            </p>
          </div>

          <div class="feature-item q-mb-lg">
            <q-icon name="redeem" color="primary" size="48px" class="q-mb-sm" />
            <h3 class="text-h6 text-weight-medium q-mb-sm">3. Redeem</h3>
            <p class="text-body2 text-grey-7">
              Use rewards for discounts or send to anyone
            </p>
          </div>
        </div>

        <q-btn
          unelevated
          rounded
          color="primary"
          size="lg"
          class="full-width q-mt-xl"
          @click="finishOnboarding"
        >
          Start Earning Rewards
        </q-btn>
      </div>
    </div>

    <!-- Backup Options Dialog -->
    <q-dialog v-model="showBackupOptions">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Backup Options</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <p class="text-body2 q-mb-md">
            Choose how you want to backup your account:
          </p>

          <q-list>
            <q-item clickable v-ripple @click="setupSocialBackup">
              <q-item-section avatar>
                <q-icon name="people" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Social Backup</q-item-label>
                <q-item-label caption>
                  Share encrypted backup with trusted contacts
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple @click="showSeedPhrase">
              <q-item-section avatar>
                <q-icon name="key" color="orange" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Manual Backup</q-item-label>
                <q-item-label caption>
                  Write down your recovery phrase
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item clickable v-ripple @click="skipBackup">
              <q-item-section avatar>
                <q-icon name="skip_next" color="grey" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Skip for Now</q-item-label>
                <q-item-label caption>
                  You can set this up later in settings
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTrailsIdentityStore } from "src/stores/trailsIdentity";
import { useWalletStore } from "src/stores/wallet";
import { useMintsStore } from "src/stores/mints";
import { notifySuccess, notifyError } from "src/js/notify";
import { copyToClipboard } from "quasar";

const router = useRouter();
const identityStore = useTrailsIdentityStore();
const walletStore = useWalletStore();
const mintsStore = useMintsStore();

const currentStep = ref(1);
const loading = ref(false);
const creationStatus = ref("Generating secure keys...");
const showBackupOptions = ref(false);

onMounted(async () => {
  // If already onboarded, redirect to wallet
  if (identityStore.onboardingComplete) {
    router.push("/");
  }
});

async function startOnboarding() {
  loading.value = true;
  currentStep.value = 2;

  try {
    // Step 1: Initialize wallet (generates mnemonic)
    creationStatus.value = "Generating secure keys...";
    await new Promise((resolve) => setTimeout(resolve, 800));
    walletStore.initializeMnemonic();

    // Step 2: Initialize identity (derives npub from seed)
    creationStatus.value = "Creating your Lightning address...";
    await new Promise((resolve) => setTimeout(resolve, 800));
    await identityStore.initializeIdentity();

    // Step 3: Register with npubcash server
    creationStatus.value = "Registering with Trails Coffee...";
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Note: This happens automatically in initializeIdentity if autoRegister is true

    // Step 4: Add default mint
    creationStatus.value = "Setting up your wallet...";
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (mintsStore.mints.length === 0) {
      // Add Trails Coffee default mint
      try {
        await mintsStore.addMint({
          url: "https://ecash.trailscoffee.com",
          nickname: "Trails Coffee",
        });
      } catch (error) {
        console.error("Failed to add default mint:", error);
        // Continue anyway - user can add mint later
      }
    }

    // Success!
    currentStep.value = 3;
  } catch (error: any) {
    console.error("Onboarding failed:", error);
    notifyError(`Setup failed: ${error.message}`);
    currentStep.value = 1;
  } finally {
    loading.value = false;
  }
}

function nextStep() {
  currentStep.value++;
}

function finishOnboarding() {
  identityStore.completeOnboarding();
  router.push("/");
}

function copyLightningAddress() {
  copyToClipboard(identityStore.lightningAddress);
  notifySuccess("Lightning address copied!");
}

function setupSocialBackup() {
  showBackupOptions.value = false;
  // Navigate to social backup setup
  router.push("/settings?tab=backup&mode=social");
}

function showSeedPhrase() {
  showBackupOptions.value = false;
  // Navigate to manual backup
  router.push("/settings?tab=backup&mode=manual");
}

function skipBackup() {
  showBackupOptions.value = false;
  nextStep();
}
</script>

<style scoped lang="scss">
.bg-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.onboarding-container {
  max-width: 480px;
  width: 100%;
  padding: 2rem;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.onboarding-step {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.app-logo {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.success-icon {
  display: flex;
  justify-content: center;
}

.identity-card {
  border-radius: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.info-box {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background: #e3f2fd;
  border-radius: 12px;
  border-left: 4px solid #2196f3;
}

.feature-list {
  text-align: center;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>

