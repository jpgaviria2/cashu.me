<template>
  <q-card flat bordered class="trails-identity-card">
    <q-card-section class="bg-gradient-primary text-white">
      <div class="row items-center">
        <div class="col">
          <div class="text-overline">Your Lightning Address</div>
          <div class="text-h6 text-weight-medium">
            {{ identityStore.lightningAddress }}
          </div>
          <div class="text-caption q-mt-xs">
            {{ identityStore.shortNpub }}
          </div>
        </div>
        <div class="col-auto">
          <q-btn
            flat
            round
            dense
            icon="content_copy"
            color="white"
            @click="copyAddress"
          >
            <q-tooltip>Copy Lightning Address</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="qr_code"
            color="white"
            @click="showQR = true"
          >
            <q-tooltip>Show QR Code</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card-section>

    <q-card-section>
      <div class="row q-gutter-sm">
        <q-chip
          v-if="identityStore.hasLightningAddress"
          icon="check_circle"
          color="positive"
          text-color="white"
          size="sm"
        >
          Active
        </q-chip>
        <q-chip
          v-else
          icon="pending"
          color="warning"
          text-color="white"
          size="sm"
          clickable
          @click="registerAddress"
        >
          Click to Activate
        </q-chip>
        <q-chip
          icon="bolt"
          color="primary"
          text-color="white"
          size="sm"
        >
          Lightning
        </q-chip>
      </div>

      <div class="q-mt-md text-body2 text-grey-7">
        <q-icon name="info" size="18px" class="q-mr-xs" />
        Share this address to receive payments even when offline!
      </div>
    </q-card-section>

    <q-card-actions v-if="hasPendingPayments">
      <q-btn
        flat
        color="primary"
        icon="download"
        label="Claim Pending Payments"
        @click="claimPending"
        :loading="claiming"
      />
    </q-card-actions>

    <!-- QR Code Dialog -->
    <q-dialog v-model="showQR">
      <q-card style="min-width: 300px">
        <q-card-section class="text-center">
          <div class="text-h6 q-mb-md">Lightning Address</div>
          <vue-qrcode
            :value="identityStore.lightningAddress"
            :options="{ width: 250, margin: 2 }"
            tag="img"
          />
          <div class="text-body2 q-mt-md text-weight-medium">
            {{ identityStore.lightningAddress }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTrailsIdentityStore } from "src/stores/trailsIdentity";
import { notifySuccess, notifyError } from "src/js/notify";
import { copyToClipboard } from "quasar";
import VueQrcode from "@chenfengyuan/vue-qrcode";

const identityStore = useTrailsIdentityStore();
const showQR = ref(false);
const claiming = ref(false);
const hasPendingPayments = ref(false);

async function copyAddress() {
  await copyToClipboard(identityStore.lightningAddress);
  notifySuccess("Lightning address copied!");
}

async function registerAddress() {
  const success = await identityStore.registerWithNpubCash();
  if (success) {
    notifySuccess("Lightning address activated!");
  }
}

async function claimPending() {
  claiming.value = true;
  try {
    const claimed = await identityStore.claimPendingEcash();
    if (!claimed) {
      notifyError("No pending payments found");
    }
    hasPendingPayments.value = false;
  } catch (error) {
    notifyError("Failed to claim payments");
  } finally {
    claiming.value = false;
  }
}

// Check for pending payments on mount
import { onMounted } from "vue";
onMounted(async () => {
  // This would require an API endpoint to check without claiming
  // For now, we'll just show the button if registered
  hasPendingPayments.value = identityStore.hasLightningAddress;
});
</script>

<style scoped lang="scss">
.trails-identity-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>

