<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6">
        <q-icon name="bluetooth" class="q-mr-sm" />
        Bluetooth Settings
      </div>
      <div class="text-caption text-grey-6">
        Configure your Bluetooth mesh networking
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <q-input
        v-model="localNickname"
        label="Bluetooth Name"
        hint="How you appear to nearby peers"
        outlined
        :rules="[
          val => val && val.length >= 3 || 'Minimum 3 characters',
          val => val && val.length <= 32 || 'Maximum 32 characters'
        ]"
      >
        <template #prepend>
          <q-icon name="person" />
        </template>
        <template #append>
          <q-btn
            v-if="nicknameChanged"
            flat
            dense
            round
            icon="check"
            color="primary"
            @click="saveNickname"
          >
            <q-tooltip>Apply changes</q-tooltip>
          </q-btn>
        </template>
      </q-input>

      <div class="text-caption text-grey-6 q-mt-xs">
        Current: <strong>{{ bluetoothStore.nickname }}</strong>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="text-subtitle2 q-mb-sm">Connection Status</div>
      
      <q-list dense>
        <q-item>
          <q-item-section avatar>
            <q-icon 
              :name="bluetoothStore.isActive ? 'bluetooth_connected' : 'bluetooth_disabled'" 
              :color="bluetoothStore.isActive ? 'positive' : 'grey'"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Bluetooth Mesh</q-item-label>
            <q-item-label caption>
              {{ bluetoothStore.isActive ? 'Active' : 'Disabled' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <!-- Desktop: Show button to connect to device -->
            <q-btn
              v-if="isDesktop && !bluetoothStore.isActive"
              outline
              color="primary"
              size="sm"
              icon="bluetooth_searching"
              label="Connect Device"
              @click="connectDesktopDevice"
              :disable="!isWebBluetoothSupported"
            />
            <!-- Desktop: Show disconnect button when active -->
            <q-btn
              v-else-if="isDesktop && bluetoothStore.isActive"
              flat
              color="negative"
              size="sm"
              icon="bluetooth_disabled"
              label="Disconnect"
              @click="toggleBluetooth(false)"
            />
            <!-- Mobile: Show toggle -->
            <q-toggle
              v-else
              :model-value="bluetoothStore.isActive"
              @update:model-value="toggleBluetooth"
              color="primary"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section avatar>
            <q-icon name="people" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Nearby Peers</q-item-label>
            <q-item-label caption>
              {{ bluetoothStore.nearbyPeers.length }} discovered
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="favoritesStore.mutualCount > 0">
          <q-item-section avatar>
            <q-icon name="favorite" color="pink" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Mutual Favorites</q-item-label>
            <q-item-label caption>
              {{ favoritesStore.mutualCount }} contacts
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="row q-gutter-sm">
        <q-btn
          outline
          color="primary"
          icon="people"
          label="Nearby Contacts"
          @click="showNearbyContacts"
        />
        <q-btn
          v-if="favoritesStore.mutualCount > 0"
          outline
          color="pink"
          icon="favorite"
          label="Favorites"
          @click="showFavorites"
        />
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pt-sm">
      <div class="text-caption text-grey-6">
        <q-icon name="info" size="xs" class="q-mr-xs" />
        <span v-if="isDesktop && !isWebBluetoothSupported">
          ⚠️ Web Bluetooth not available. Please use <strong>Chrome</strong> or <strong>Edge</strong> browser.
        </span>
        <span v-else-if="isDesktop">
          💡 Click "Enable" to connect to a nearby Bluetooth device. The browser will show a device picker.
        </span>
        <span v-else>
          Bluetooth mesh enables offline token transfers
        </span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBluetoothStore } from 'src/stores/bluetooth';
import { useFavoritesStore } from 'src/stores/favorites';
import { Capacitor } from '@capacitor/core';
import { notifySuccess } from 'src/js/notify';

const bluetoothStore = useBluetoothStore();
const favoritesStore = useFavoritesStore();

const localNickname = ref('');
const isDesktop = computed(() => !Capacitor.isNativePlatform());

const isWebBluetoothSupported = computed(() => {
  try {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  } catch (error) {
    console.error('Error checking Web Bluetooth support:', error);
    return false;
  }
});

const nicknameChanged = computed(() => {
  return localNickname.value !== bluetoothStore.nickname;
});

async function saveNickname() {
  if (!localNickname.value || localNickname.value.length < 3) {
    return;
  }

  try {
    // Update nickname in store
    await bluetoothStore.updateNickname(localNickname.value);
    notifySuccess('Bluetooth name updated!');
  } catch (error) {
    console.error('Failed to update nickname:', error);
  }
}

async function toggleBluetooth(enabled: boolean) {
  if (enabled) {
    await bluetoothStore.startService();
  } else {
    await bluetoothStore.stopService();
  }
}

async function connectDesktopDevice() {
  try {
    // For desktop, this will show the browser's device picker
    await bluetoothStore.startService();
  } catch (error) {
    console.error('Failed to connect to Bluetooth device:', error);
  }
}

function showNearbyContacts() {
  // Emit event or navigate to nearby contacts
  console.log('Show nearby contacts dialog');
}

function showFavorites() {
  // Emit event or navigate to favorites dialog
  console.log('Show favorites dialog');
}

onMounted(() => {
  localNickname.value = bluetoothStore.nickname;
});
</script>

<style scoped lang="scss">
.q-card {
  max-width: 600px;
}
</style>

