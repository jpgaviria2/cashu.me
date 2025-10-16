<template>
  <div class="username-signup">
    <div class="signup-container">
      <!-- Header -->
      <div class="signup-header">
        <h2>Create Your Lightning Address</h2>
        <p class="signup-subtitle">
          Choose a unique username for your Lightning address
        </p>
      </div>

      <!-- Username Input -->
      <div class="username-section">
        <div class="input-group">
          <q-input
            v-model="username"
            label="Choose your username"
            placeholder="e.g., john, coffee_lover, trails_fan"
            :rules="usernameRules"
            :loading="checkingAvailability"
            @input="onUsernameInput"
            @keyup.enter="checkAvailability"
            outlined
            class="username-input"
            color="primary"
            bg-color="white"
          >
            <template #append>
              <q-btn
                v-if="username && !checkingAvailability"
                icon="search"
                flat
                round
                @click="checkAvailability"
                :disable="!isValidUsername"
                color="primary"
              />
            </template>
          </q-input>

          <div class="domain-suffix">@trailscoffee.com</div>
        </div>

        <!-- Availability Status -->
        <div v-if="availabilityMessage" class="availability-status" :class="availabilityClass">
          <q-icon :name="availabilityIcon" size="20px" />
          <span>{{ availabilityMessage }}</span>
        </div>

        <!-- Username Rules -->
        <div class="username-rules">
          <div class="rules-header">
            <q-icon name="info" color="primary" />
            <span><strong>Username Requirements</strong></span>
          </div>
          <div class="rules-list">
            <div class="rule-item">
              <q-icon name="check_circle" color="green" size="16px" />
              <span>3-20 characters long</span>
            </div>
            <div class="rule-item">
              <q-icon name="check_circle" color="green" size="16px" />
              <span>Letters, numbers, and underscores only</span>
            </div>
            <div class="rule-item">
              <q-icon name="check_circle" color="green" size="16px" />
              <span>Must be unique across all users</span>
            </div>
          </div>
        </div>
      </div>


      <!-- Action Buttons -->
      <div class="signup-actions">
        <q-btn
          label="Create Lightning Address"
          color="primary"
          size="lg"
          :loading="creating"
          :disable="!canCreate"
          @click="createLightningAddress"
          class="create-btn"
        />

        <q-btn
          label="Skip for now"
          flat
          @click="skipSignup"
          class="skip-btn"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTrailsIdentityStore } from '../stores/trailsIdentity';
import { useNostrStore } from '../stores/nostr';
import { notifySuccess, notifyError } from '../js/notify';

const trailsIdentityStore = useTrailsIdentityStore();
const nostrStore = useNostrStore();

// Reactive data
const username = ref('');
const checkingAvailability = ref(false);
const creating = ref(false);

// Computed properties

const isValidUsername = computed(() => {
  return username.value.length >= 3 &&
         username.value.length <= 20 &&
         /^[a-zA-Z0-9_]+$/.test(username.value);
});

const availabilityMessage = computed(() => {
  return trailsIdentityStore.usernameAvailability?.message || '';
});

const availabilityClass = computed(() => {
  return trailsIdentityStore.usernameAvailability?.available ? 'available' : 'unavailable';
});

const availabilityIcon = computed(() => {
  return trailsIdentityStore.usernameAvailability?.available ? 'check_circle' : 'cancel';
});

const canCreate = computed(() => {
  return isValidUsername.value &&
         trailsIdentityStore.usernameAvailability?.available === true;
});

// Username validation rules
const usernameRules = [
  (val: string) => !!val || 'Username is required',
  (val: string) => val.length >= 3 || 'Username must be at least 3 characters',
  (val: string) => val.length <= 20 || 'Username must be 20 characters or less',
  (val: string) => /^[a-zA-Z0-9_]+$/.test(val) || 'Only letters, numbers, and underscores allowed'
];

// Methods
const onUsernameInput = () => {
  // Clear availability status when user types
  if (trailsIdentityStore.usernameAvailability) {
    trailsIdentityStore.usernameAvailability = null;
  }
};

const checkAvailability = async () => {
  if (!isValidUsername.value) return;

  checkingAvailability.value = true;
  try {
    await trailsIdentityStore.checkUsernameAvailability(username.value);
  } catch (error) {
    console.error('Error checking username availability:', error);
    notifyError('Failed to check username availability');
  } finally {
    checkingAvailability.value = false;
  }
};

const createLightningAddress = async () => {
  if (!canCreate.value) return;

  creating.value = true;
  try {
    const success = await trailsIdentityStore.completeUsernameSignup(username.value);
    if (success) {
      notifySuccess(`Welcome to Trails Coffee, ${username.value}! ⚡`);
    }
  } catch (error) {
    console.error('Error creating Lightning address:', error);
    notifyError('Failed to create Lightning address');
  } finally {
    creating.value = false;
  }
};

const skipSignup = () => {
  // Create a default profile with npub-based address
  const npub = trailsIdentityStore.userNpub;
  const nsec = trailsIdentityStore.userNsec;
  const shortNpub = trailsIdentityStore.shortNpub;

  trailsIdentityStore.profile = {
    username: '',
    npub: npub,
    nsec: nsec,
    lightningAddress: `${shortNpub}@trailscoffee.com`,
    nip05: `${shortNpub}@trailscoffee.com`,
    registered: true, // Mark as registered
    registeredAt: Date.now(),
  };
  trailsIdentityStore.signupStep = 'complete';
  notifySuccess(`Lightning address created: ${shortNpub}@trailscoffee.com`);
};


// Auto-check availability when username is valid
watch(username, (newVal) => {
  if (isValidUsername.value && newVal.length >= 3) {
    const timeoutId = setTimeout(() => {
      checkAvailability();
    }, 500);
    return () => clearTimeout(timeoutId);
  }
});
</script>

<style scoped>
.username-signup {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.signup-container {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.signup-header {
  text-align: center;
  margin-bottom: 32px;
}

.signup-header h2 {
  color: #6B4423;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.signup-subtitle {
  color: #666;
  margin: 0;
  font-size: 16px;
}

.username-section {
  margin-bottom: 32px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.username-input {
  flex: 1;
}

.username-input .q-field__control {
  background: white !important;
  color: #333 !important;
}

.username-input .q-field__native {
  color: #333 !important;
  font-weight: 500;
  font-size: 16px;
}

.username-input .q-field__label {
  color: #666 !important;
  font-weight: 500;
}

.username-input .q-field__marginal {
  color: #666 !important;
}

.domain-suffix {
  font-size: 18px;
  color: #6B4423;
  font-weight: 600;
  white-space: nowrap;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.availability-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-weight: 500;
}

.availability-status.available {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.availability-status.unavailable {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #f44336;
}

.username-rules {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-top: 16px;
}

.rules-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #495057;
  font-size: 16px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #6c757d;
}

.rule-item span {
  line-height: 1.4;
}


.signup-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.create-btn {
  min-width: 200px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.skip-btn {
  color: #666;
  font-size: 14px;
}

@media (max-width: 600px) {
  .username-signup {
    padding: 16px;
  }

  .signup-container {
    padding: 24px;
  }

  .signup-header h2 {
    font-size: 24px;
  }

  .input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .domain-suffix {
    text-align: center;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 6px;
  }
}
</style>
