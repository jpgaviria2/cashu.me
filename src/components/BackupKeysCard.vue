<template>
  <q-card class="backup-keys-card">
    <q-card-section>
      <div class="card-header">
        <q-icon name="security" color="primary" size="24px" />
        <h3>Backup Keys</h3>
      </div>
      <p class="card-description">
        Your Nostr keys are derived from your wallet seed. Save these for backup:
      </p>
    </q-card-section>

    <q-card-section class="keys-section">
      <!-- Public Key (npub) -->
      <div class="key-item">
        <div class="key-label">
          <q-icon name="public" color="green" />
          <span>Public Key (npub)</span>
        </div>
        <div class="key-value">
          <code>{{ shortNpub }}</code>
          <q-btn
            icon="content_copy"
            flat
            round
            size="sm"
            @click="copyToClipboard(userNpub, 'Public key')"
            class="copy-btn"
          />
        </div>
        <q-btn
          label="Show Full Key"
          flat
          dense
          size="sm"
          @click="showFullKey = !showFullKey"
          class="toggle-btn"
        />
        <div v-if="showFullKey" class="full-key">
          <code>{{ userNpub }}</code>
        </div>
      </div>

      <!-- Private Key (nsec) -->
      <div class="key-item">
        <div class="key-label">
          <q-icon name="lock" color="red" />
          <span>Private Key (nsec)</span>
          <q-tooltip>Keep this secret! Anyone with this key can access your account.</q-tooltip>
        </div>
        <div class="key-value">
          <code>{{ shortNsec }}</code>
          <q-btn
            icon="content_copy"
            flat
            round
            size="sm"
            @click="copyToClipboard(userNsec, 'Private key')"
            class="copy-btn"
          />
        </div>
        <q-btn
          label="Show Full Key"
          flat
          dense
          size="sm"
          @click="showFullNsec = !showFullNsec"
          class="toggle-btn"
        />
        <div v-if="showFullNsec" class="full-key">
          <code>{{ userNsec }}</code>
        </div>
      </div>

      <!-- Lightning Address -->
      <div class="key-item">
        <div class="key-label">
          <q-icon name="bolt" color="orange" />
          <span>Lightning Address</span>
        </div>
        <div class="key-value">
          <code>{{ lightningAddress }}</code>
          <q-btn
            icon="content_copy"
            flat
            round
            size="sm"
            @click="copyToClipboard(lightningAddress, 'Lightning address')"
            class="copy-btn"
          />
        </div>
      </div>
    </q-card-section>

    <q-card-section class="warning-section">
      <q-banner class="warning-banner" rounded>
        <template #avatar>
          <q-icon name="warning" color="orange" />
        </template>
        <div class="warning-content">
          <strong>Important:</strong> Save these keys in a secure location.
          If you lose access to your device, you can restore your account using these keys.
        </div>
      </q-banner>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTrailsIdentityStore } from '../stores/trailsIdentity';
import { notifySuccess, notifyError } from '../js/notify';

const trailsIdentityStore = useTrailsIdentityStore();

// Reactive data
const showFullKey = ref(false);
const showFullNsec = ref(false);

// Computed properties
const userNpub = computed(() => trailsIdentityStore.userNpub);
const userNsec = computed(() => trailsIdentityStore.userNsec);
const lightningAddress = computed(() => trailsIdentityStore.lightningAddress);

const shortNpub = computed(() => {
  const npub = userNpub.value;
  return npub ? `${npub.slice(0, 10)}...${npub.slice(-4)}` : '';
});

const shortNsec = computed(() => {
  const nsec = userNsec.value;
  return nsec ? `${nsec.slice(0, 10)}...${nsec.slice(-4)}` : '';
});

// Methods
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    notifySuccess(`${label} copied to clipboard`);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    notifyError('Failed to copy to clipboard');
  }
};
</script>

<style scoped>
.backup-keys-card {
  margin: 16px 0;
  border: 1px solid #e0e0e0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  color: #6B4423;
  font-size: 18px;
  font-weight: 600;
}

.card-description {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.keys-section {
  padding-top: 0;
}

.key-item {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.key-item:last-child {
  margin-bottom: 0;
}

.key-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.key-value {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  margin-bottom: 8px;
}

.key-value code {
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #495057;
  word-break: break-all;
  line-height: 1.4;
}

.copy-btn {
  color: #6c757d;
  padding: 4px;
}

.copy-btn:hover {
  color: #6B4423;
  background: rgba(107, 68, 35, 0.1);
}

.toggle-btn {
  color: #6B4423;
  font-size: 12px;
  padding: 4px 8px;
}

.toggle-btn:hover {
  background: rgba(107, 68, 35, 0.1);
}

.full-key {
  margin-top: 8px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  word-break: break-all;
}

.full-key code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: #495057;
  line-height: 1.4;
}

.warning-section {
  padding-top: 0;
}

.warning-banner {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.warning-content {
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 600px) {
  .key-item {
    padding: 12px;
  }

  .key-value {
    padding: 8px;
  }

  .key-value code {
    font-size: 11px;
  }

  .full-key code {
    font-size: 10px;
  }
}
</style>
