<template>
  <q-page padding>
    <div class="q-pa-md">
      <h4 class="q-mt-none">🔬 Simple Bluetooth Test</h4>
      
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Step-by-Step Bluetooth Test</div>
          <div class="text-caption">This will help us identify exactly where the issue is</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="q-gutter-md">
            <!-- Step 1: Check API -->
            <div>
              <div class="text-subtitle2">1. Check Web Bluetooth API</div>
              <q-btn
                color="primary"
                label="Test API Availability"
                @click="testAPI"
                class="q-mt-sm"
              />
              <div v-if="apiResult" class="q-mt-sm q-pa-sm bg-grey-2">
                {{ apiResult }}
              </div>
            </div>

            <q-separator />

            <!-- Step 2: Request Any Device -->
            <div>
              <div class="text-subtitle2">2. Request ANY Bluetooth Device (No Filters)</div>
              <q-btn
                color="secondary"
                label="Show All Devices"
                @click="requestAnyDevice"
                class="q-mt-sm"
                :disable="!apiAvailable"
              />
              <div v-if="anyDeviceResult" class="q-mt-sm q-pa-sm bg-grey-2">
                <pre style="white-space: pre-wrap; margin: 0;">{{ anyDeviceResult }}</pre>
              </div>
            </div>

            <q-separator />

            <!-- Step 3: Request with Filter -->
            <div>
              <div class="text-subtitle2">3. Request with Bitpoints Service Filter</div>
              <q-btn
                color="accent"
                label="Show Bitpoints Devices"
                @click="requestWithFilter"
                class="q-mt-sm"
                :disable="!apiAvailable"
              />
              <div v-if="filterResult" class="q-mt-sm q-pa-sm bg-grey-2">
                <pre style="white-space: pre-wrap; margin: 0;">{{ filterResult }}</pre>
              </div>
            </div>

            <q-separator />

            <!-- Step 4: Try to Connect -->
            <div>
              <div class="text-subtitle2">4. Try to Connect to Selected Device</div>
              <q-btn
                color="positive"
                label="Connect to Device"
                @click="connectToDevice"
                class="q-mt-sm"
                :disable="!selectedDevice"
              />
              <div v-if="connectionResult" class="q-mt-sm q-pa-sm bg-grey-2">
                <pre style="white-space: pre-wrap; margin: 0;">{{ connectionResult }}</pre>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Console Logs</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="text-caption text-grey-6 q-mb-md">
            Open DevTools (F12) → Console to see detailed logs
          </div>
          <q-list dense bordered v-if="logs.length > 0">
            <q-item v-for="(log, index) in logs" :key="index">
              <q-item-section>
                <q-item-label caption style="white-space: pre-wrap;">{{ log }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// UUIDs must be lowercase for Web Bluetooth API
const SERVICE_UUID = 'f47b5e2d-4a9e-4c5a-9b3f-8e1d2c3a4b5c';
const CHARACTERISTIC_UUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

const apiAvailable = ref(false);
const apiResult = ref('');
const anyDeviceResult = ref('');
const filterResult = ref('');
const connectionResult = ref('');
const selectedDevice = ref<BluetoothDevice | null>(null);
const logs = ref<string[]>([]);

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  logs.value.unshift(logMessage);
  console.log(logMessage);
}

function testAPI() {
  addLog('Testing Web Bluetooth API availability...');
  
  try {
    if (typeof navigator === 'undefined') {
      apiResult.value = '❌ Navigator not available';
      addLog('ERROR: Navigator not available');
      return;
    }
    
    if (!('bluetooth' in navigator)) {
      apiResult.value = '❌ Web Bluetooth API not available in this browser';
      addLog('ERROR: Web Bluetooth not available');
      return;
    }
    
    apiAvailable.value = true;
    apiResult.value = '✅ Web Bluetooth API is available!';
    addLog('SUCCESS: Web Bluetooth API available');
    
    // Check for getAvailability
    if ('getAvailability' in navigator.bluetooth) {
      navigator.bluetooth.getAvailability().then(available => {
        const msg = available ? '✅ Bluetooth is enabled on your device' : '❌ Bluetooth is disabled';
        apiResult.value += '\n' + msg;
        addLog(`Bluetooth hardware: ${available ? 'enabled' : 'disabled'}`);
      });
    }
  } catch (error: any) {
    apiResult.value = `❌ Error: ${error.message}`;
    addLog(`ERROR: ${error.message}`);
  }
}

async function requestAnyDevice() {
  addLog('Requesting ANY Bluetooth device (no filters)...');
  anyDeviceResult.value = '⏳ Waiting for device selection...';
  
  try {
    addLog('Calling navigator.bluetooth.requestDevice with acceptAllDevices: true');
    
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    });
    
    selectedDevice.value = device;
    
    const result = {
      name: device.name || 'Unknown',
      id: device.id,
      paired: device.gatt?.connected || false
    };
    
    anyDeviceResult.value = `✅ Device Selected!\n${JSON.stringify(result, null, 2)}`;
    addLog(`SUCCESS: Selected device: ${device.name || 'Unknown'} (${device.id})`);
    
  } catch (error: any) {
    const msg = error.name === 'NotFoundError' 
      ? '⚠️ User cancelled device selection' 
      : `❌ Error: ${error.message}`;
    anyDeviceResult.value = msg;
    addLog(`ERROR: ${error.name} - ${error.message}`);
  }
}

async function requestWithFilter() {
  addLog(`Requesting device with service filter: ${SERVICE_UUID}`);
  filterResult.value = '⏳ Waiting for device selection...';
  
  try {
    addLog('Calling navigator.bluetooth.requestDevice with service filters');
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });
    
    selectedDevice.value = device;
    
    const result = {
      name: device.name || 'Unknown',
      id: device.id,
      paired: device.gatt?.connected || false
    };
    
    filterResult.value = `✅ Bitpoints Device Found!\n${JSON.stringify(result, null, 2)}`;
    addLog(`SUCCESS: Found Bitpoints device: ${device.name || 'Unknown'}`);
    
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      filterResult.value = '❌ No Bitpoints devices found\n\nThis means:\n- No nearby devices advertising the Bitpoints service\n- Or user cancelled selection\n\nTry "Show All Devices" to see if your Android phone appears';
      addLog('ERROR: No devices advertising Bitpoints service found');
    } else {
      filterResult.value = `❌ Error: ${error.message}`;
      addLog(`ERROR: ${error.name} - ${error.message}`);
    }
  }
}

async function connectToDevice() {
  if (!selectedDevice.value) {
    connectionResult.value = '❌ No device selected';
    return;
  }
  
  addLog(`Attempting to connect to: ${selectedDevice.value.name || 'Unknown'}`);
  connectionResult.value = '⏳ Connecting...';
  
  try {
    if (!selectedDevice.value.gatt) {
      throw new Error('Device has no GATT server');
    }
    
    addLog('Connecting to GATT server...');
    const server = await selectedDevice.value.gatt.connect();
    addLog('✅ Connected to GATT server');
    
    addLog(`Looking for service: ${SERVICE_UUID}`);
    const service = await server.getPrimaryService(SERVICE_UUID);
    addLog('✅ Found Bitpoints service');
    
    addLog(`Looking for characteristic: ${CHARACTERISTIC_UUID}`);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    addLog('✅ Found characteristic');
    
    connectionResult.value = `✅ Successfully connected!\n\nDevice: ${selectedDevice.value.name}\nService: Found\nCharacteristic: Found\nStatus: Ready for token transfer`;
    addLog('SUCCESS: Full connection established');
    
  } catch (error: any) {
    connectionResult.value = `❌ Connection failed: ${error.message}\n\nThis could mean:\n- Device doesn't support Bitpoints service\n- Device is out of range\n- Bluetooth pairing required`;
    addLog(`ERROR during connection: ${error.message}`);
  }
}
</script>

<style scoped lang="scss">
pre {
  font-size: 12px;
  line-height: 1.4;
}
</style>

