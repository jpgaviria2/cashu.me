<template>
  <q-page class="npub-page">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo-section">
          <q-icon name="bolt" color="warning" size="60px" class="logo-icon" />
          <h1 class="page-title">Lightning Address</h1>
        </div>
        <p class="subtitle">Receive Bitcoin payments to your @trailscoffee.com Lightning address</p>
      </div>

      <!-- Main Content -->
      <div class="content-section">
        <!-- Hero Section -->
        <div class="hero-card">
          <h2>Your Lightning Address</h2>
          <p class="hero-description">
            Get your personalized Lightning address and start receiving Bitcoin payments instantly.
            All payments are automatically converted to ecash tokens in your Trails Coffee Rewards wallet.
          </p>

          <!-- Username Registration -->
          <div v-if="!hasUsername" class="username-registration">
            <h3>Claim Your Custom Username</h3>
            <p class="username-description">
              Get a personalized Lightning address like <strong>yourname@trailscoffee.com</strong>
            </p>

            <div class="username-input-group">
              <q-input
                v-model="customUsername"
                outlined
                dense
                label="Choose your username"
                placeholder="username"
                :rules="[
                  val => val && val.length >= 3 || 'Minimum 3 characters',
                  val => /^[a-zA-Z0-9]+$/.test(val) || 'Only letters and numbers',
                  val => !val.toLowerCase().startsWith('npub') || 'Cannot start with npub'
                ]"
                @blur="checkUsernameAvailability"
                class="username-field"
              >
                <template v-slot:append>
                  <span class="domain-text">@trailscoffee.com</span>
                </template>
              </q-input>

              <div v-if="usernameCheckStatus" class="status-message">
                <q-icon
                  :name="usernameCheckStatus === 'available' ? 'check_circle' : 'error'"
                  :color="usernameCheckStatus === 'available' ? 'positive' : 'negative'"
                />
                <span>{{ usernameCheckMessage }}</span>
              </div>
            </div>

            <q-btn
              color="primary"
              label="Claim Username (5000 sats)"
              :loading="claimingUsername"
              :disable="!isUsernameValid || usernameCheckStatus !== 'available'"
              @click="claimUsername"
              class="q-mt-md claim-btn"
            />

            <p class="fee-note">
              One-time fee to reserve your custom Lightning address
            </p>
          </div>

          <!-- Lightning Address Display -->
          <div v-if="lightningAddress" class="address-display">
            <div class="address-box">
              <q-icon name="bolt" color="warning" size="md" class="q-mr-sm" />
              <span class="address-text">{{ lightningAddress }}</span>
              <q-btn
                flat
                dense
                round
                icon="content_copy"
                color="primary"
                @click="copyAddress"
                class="copy-btn"
              >
                <q-tooltip>Copy address</q-tooltip>
              </q-btn>
            </div>

            <!-- QR Code -->
            <div class="qr-section" v-if="lightningAddress">
              <div class="qr-container">
                <vue-qrcode
                  :value="lightningAddress"
                  :options="{ width: 250 }"
                  class="qr-code"
                />
              </div>
              <p class="qr-label">Scan to send Bitcoin</p>
            </div>
          </div>

          <!-- Setup Instructions -->
          <div v-else class="setup-instructions">
            <q-icon name="info" color="primary" size="lg" />
            <h3>Get Started</h3>
            <p>
              Enable your Lightning address in the wallet settings to start receiving Bitcoin payments.
            </p>
            <q-btn
              color="primary"
              label="Go to Settings"
              @click="goToSettings"
              class="q-mt-md"
            />
          </div>
        </div>

        <!-- Features Section -->
        <div class="features-grid">
          <div class="feature-card">
            <q-icon name="speed" color="primary" size="xl" />
            <h3>Instant Conversion</h3>
            <p>Lightning payments are automatically converted to ecash tokens</p>
          </div>

          <div class="feature-card">
            <q-icon name="account_balance_wallet" color="primary" size="xl" />
            <h3>Your Mint</h3>
            <p>Uses Trails Coffee mint (ecash.trailscoffee.com)</p>
          </div>

          <div class="feature-card">
            <q-icon name="security" color="primary" size="xl" />
            <h3>Privacy First</h3>
            <p>Your identity is protected with Nostr keys</p>
          </div>

          <div class="feature-card">
            <q-icon name="bolt" color="warning" size="xl" />
            <h3>Lightning Fast</h3>
            <p>Receive payments in seconds</p>
          </div>
        </div>

        <!-- How It Works -->
        <div class="how-it-works">
          <h2>How It Works</h2>
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4>Enable Lightning Address</h4>
                <p>Go to settings and enable your Lightning address feature</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4>Share Your Address</h4>
                <p>Share your @trailscoffee.com address or QR code</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4>Receive Payments</h4>
                <p>Bitcoin payments are automatically converted to ecash</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h4>Use Your Points</h4>
                <p>Spend your ecash tokens at Trails Coffee</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Technical Details -->
        <div class="technical-details">
          <h3>Configuration</h3>
          <div class="config-grid">
            <div class="config-item">
              <span class="config-label">Mint:</span>
              <span class="config-value">ecash.trailscoffee.com</span>
            </div>
            <div class="config-item">
              <span class="config-label">Backend:</span>
              <span class="config-value">npubcash.trailscoffee.com</span>
            </div>
            <div class="config-item">
              <span class="config-label">Domain:</span>
              <span class="config-value">@trailscoffee.com</span>
            </div>
            <div class="config-item">
              <span class="config-label">Protocol:</span>
              <span class="config-value">Lightning Address (LNURL)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Dialog -->
    <q-dialog v-model="showPaymentDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Complete Payment</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <p>Pay the invoice to claim your username: <strong>{{ customUsername }}@trailscoffee.com</strong></p>

          <div class="payment-invoice q-mt-md">
            <div class="qr-container">
              <vue-qrcode
                v-if="paymentInvoice"
                :value="paymentInvoice"
                :options="{ width: 200 }"
                class="qr-code"
              />
            </div>
            <q-input
              v-model="paymentInvoice"
              readonly
              outlined
              dense
              type="textarea"
              rows="3"
              class="q-mt-md"
            >
              <template v-slot:append>
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  @click="() => { copyToClipboard(paymentInvoice); notify('Invoice copied!', 'positive'); }"
                />
              </template>
            </q-input>
          </div>

          <div class="q-mt-md text-center">
            <q-spinner-dots v-if="claimingUsername" size="lg" color="primary" />
            <p v-if="claimingUsername" class="text-caption">
              Waiting for payment confirmation...
            </p>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            color="primary"
            @click="() => { showPaymentDialog = false; claimingUsername = false; }"
            :disable="claimingUsername"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useNPCStore } from "src/stores/npubcash";
import { useNostrStore } from "src/stores/nostr";
import { useWalletStore } from "src/stores/wallet";
import { copyToClipboard } from "quasar";
import { notify, notifyError, notifySuccess } from "src/js/notify";
import VueQrcode from "@chenfengyuan/vue-qrcode";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import NDK from "@nostr-dev-kit/ndk";

const NIP98Kind = 27235;

export default defineComponent({
  name: "NpubPage",
  components: {
    VueQrcode,
  },
  setup() {
    const router = useRouter();
    const npcStore = useNPCStore();
    const nostrStore = useNostrStore();
    const walletStore = useWalletStore();

    const customUsername = ref("");
    const usernameCheckStatus = ref<"available" | "taken" | "checking" | null>(null);
    const usernameCheckMessage = ref("");
    const claimingUsername = ref(false);
    const paymentInvoice = ref("");
    const paymentToken = ref("");
    const showPaymentDialog = ref(false);

    const lightningAddress = computed(() => {
      return npcStore.npcEnabled ? npcStore.npcAddress : null;
    });

    const hasUsername = computed(() => {
      return lightningAddress.value && !lightningAddress.value.startsWith("npub1");
    });

    const isUsernameValid = computed(() => {
      if (!customUsername.value || customUsername.value.length < 3) return false;
      if (!/^[a-zA-Z0-9]+$/.test(customUsername.value)) return false;
      if (customUsername.value.toLowerCase().startsWith("npub")) return false;
      return true;
    });

    const generateNip98Event = async (url: string, method: string, body?: string): Promise<string> => {
      await nostrStore.initSignerIfNotSet();
      const nip98Event = new NDKEvent(new NDK());
      nip98Event.kind = NIP98Kind;
      nip98Event.content = "";
      nip98Event.tags = [
        ["u", url],
        ["method", method],
      ];
      const sig = await nip98Event.sign(nostrStore.signer);
      const eventString = JSON.stringify(nip98Event.rawEvent());
      return btoa(eventString);
    };

    const checkUsernameAvailability = async () => {
      if (!isUsernameValid.value) {
        usernameCheckStatus.value = null;
        return;
      }

      usernameCheckStatus.value = "checking";
      usernameCheckMessage.value = "Checking availability...";

      try {
        const authHeader = await generateNip98Event(
          `${npcStore.baseURL}/api/v1/info/username`,
          "PUT"
        );

        const response = await fetch(`${npcStore.baseURL}/api/v1/info/username`, {
          method: "PUT",
          headers: {
            "Authorization": `Nostr ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: customUsername.value.toLowerCase() }),
        });

        const data = await response.json();

        if (response.status === 402 && data.data?.paymentRequest) {
          // Username is available, payment required
          usernameCheckStatus.value = "available";
          usernameCheckMessage.value = "✓ Username available!";
          paymentInvoice.value = data.data.paymentRequest;
          paymentToken.value = data.data.paymentToken;
        } else if (response.status === 400) {
          // Username taken or invalid
          usernameCheckStatus.value = "taken";
          usernameCheckMessage.value = data.message || "Username not available";
        } else if (response.status === 200) {
          // Username claimed successfully
          usernameCheckStatus.value = "taken";
          usernameCheckMessage.value = "Username already claimed";
          await npcStore.generateNPCConnection();
        }
      } catch (error) {
        console.error("Error checking username:", error);
        usernameCheckStatus.value = null;
        usernameCheckMessage.value = "Error checking availability";
      }
    };

    const claimUsername = async () => {
      if (!isUsernameValid.value || usernameCheckStatus.value !== "available") {
        return;
      }

      claimingUsername.value = true;

      try {
        // Show payment dialog
        showPaymentDialog.value = true;

        // Copy invoice to clipboard
        if (paymentInvoice.value) {
          copyToClipboard(paymentInvoice.value);
          notify("Payment invoice copied! Pay to claim your username.", "info");

          // Start checking for payment
          startPaymentCheck();
        }
      } catch (error) {
        console.error("Error claiming username:", error);
        notifyError("Failed to claim username");
        claimingUsername.value = false;
      }
    };

    const startPaymentCheck = () => {
      let attempts = 0;
      const maxAttempts = 60; // Check for 5 minutes (60 * 5s)

      const checkInterval = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          clearInterval(checkInterval);
          claimingUsername.value = false;
          showPaymentDialog.value = false;
          notifyError("Payment timeout. Please try again.");
          return;
        }

        try {
          const authHeader = await generateNip98Event(
            `${npcStore.baseURL}/api/v1/info/username`,
            "PUT"
          );

          const response = await fetch(`${npcStore.baseURL}/api/v1/info/username`, {
            method: "PUT",
            headers: {
              "Authorization": `Nostr ${authHeader}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: customUsername.value.toLowerCase(),
              paymentToken: paymentToken.value
            }),
          });

          if (response.status === 200) {
            clearInterval(checkInterval);
            notifySuccess(`Username claimed! Your address is now ${customUsername.value}@trailscoffee.com`);
            claimingUsername.value = false;
            showPaymentDialog.value = false;
            await npcStore.generateNPCConnection();
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 5000); // Check every 5 seconds
    };

    const copyAddress = () => {
      if (lightningAddress.value) {
        copyToClipboard(lightningAddress.value);
        notify("Lightning address copied to clipboard", "positive");
      }
    };

    const goToSettings = () => {
      router.push("/");
      // Wait for route to load, then navigate to settings tab
      setTimeout(() => {
        const settingsButton = document.querySelector('[aria-label="Settings"]');
        if (settingsButton) {
          (settingsButton as HTMLElement).click();
        }
      }, 100);
    };

    // Auto-check username when user types
    watch(customUsername, () => {
      usernameCheckStatus.value = null;
      usernameCheckMessage.value = "";
    });

    return {
      lightningAddress,
      hasUsername,
      customUsername,
      isUsernameValid,
      usernameCheckStatus,
      usernameCheckMessage,
      claimingUsername,
      showPaymentDialog,
      paymentInvoice,
      copyAddress,
      goToSettings,
      checkUsernameAvailability,
      claimUsername,
    };
  },
});
</script>

<style scoped>
.npub-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
  padding: 2rem 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 3rem;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.logo-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #6B4423;
  margin: 0;
}

.subtitle {
  font-size: 1.2rem;
  color: #666;
  margin: 0;
}

/* Hero Card */
.hero-card {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  text-align: center;
}

.hero-card h2 {
  font-size: 2rem;
  color: #6B4423;
  margin-bottom: 1rem;
}

.hero-description {
  font-size: 1.1rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* Address Display */
.address-display {
  margin-top: 2rem;
}

.address-box {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2px solid #6B4423;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.address-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #6B4423;
  word-break: break-all;
}

.copy-btn {
  margin-left: 0.5rem;
}

/* QR Section */
.qr-section {
  margin-top: 2rem;
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  border: 2px solid #e0e0e0;
  margin: 0 auto;
  width: fit-content;
}

.qr-code {
  border-radius: 8px;
}

.qr-label {
  margin-top: 1rem;
  font-size: 1rem;
  color: #666;
  font-weight: 500;
}

/* Username Registration */
.username-registration {
  padding: 2rem 0;
  text-align: center;
}

.username-registration h3 {
  font-size: 1.8rem;
  color: #6B4423;
  margin-bottom: 1rem;
}

.username-description {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.username-input-group {
  max-width: 500px;
  margin: 0 auto 1.5rem auto;
}

.username-field {
  font-size: 1.2rem;
}

.domain-text {
  font-weight: 600;
  color: #6B4423;
  font-size: 1.1rem;
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-weight: 500;
}

.claim-btn {
  font-size: 1.1rem;
  padding: 0.8rem 2rem;
}

.fee-note {
  font-size: 0.9rem;
  color: #999;
  margin-top: 1rem;
}

/* Payment Dialog */
.payment-invoice {
  text-align: center;
}

.payment-invoice .qr-container {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
}

/* Setup Instructions */
.setup-instructions {
  padding: 3rem 2rem;
  text-align: center;
}

.setup-instructions h3 {
  font-size: 1.8rem;
  color: #6B4423;
  margin: 1rem 0;
}

.setup-instructions p {
  font-size: 1.1rem;
  color: #666;
  line-height: 1.6;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-card h3 {
  font-size: 1.3rem;
  color: #6B4423;
  margin: 1rem 0 0.5rem 0;
}

.feature-card p {
  color: #666;
  line-height: 1.5;
  margin: 0;
}

/* How It Works */
.how-it-works {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.how-it-works h2 {
  font-size: 2rem;
  color: #6B4423;
  text-align: center;
  margin-bottom: 2rem;
}

.steps {
  display: grid;
  gap: 1.5rem;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
}

.step-number {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  background: #6B4423;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
}

.step-content h4 {
  font-size: 1.2rem;
  color: #6B4423;
  margin: 0 0 0.5rem 0;
}

.step-content p {
  color: #666;
  margin: 0;
  line-height: 1.5;
}

/* Technical Details */
.technical-details {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.technical-details h3 {
  font-size: 1.8rem;
  color: #6B4423;
  margin-bottom: 1.5rem;
  text-align: center;
}

.config-grid {
  display: grid;
  gap: 1rem;
}

.config-item {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.config-label {
  font-weight: 600;
  color: #6B4423;
}

.config-value {
  color: #666;
  font-family: monospace;
  word-break: break-all;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .hero-card {
    padding: 1.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .step {
    flex-direction: column;
    text-align: center;
  }

  .config-item {
    flex-direction: column;
    text-align: center;
  }
}
</style>

