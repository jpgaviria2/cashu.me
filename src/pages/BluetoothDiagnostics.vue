<template>
  <q-page padding>
    <div class="q-pa-md">
      <h4 class="q-mt-none">🔍 Web Bluetooth Diagnostics</h4>
      
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Environment Information</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-list dense>
            <q-item>
              <q-item-section>
                <q-item-label>Current URL</q-item-label>
                <q-item-label caption>{{ currentUrl }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon :name="isHttps ? 'check_circle' : 'error'" :color="isHttps ? 'positive' : 'negative'" />
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>HTTPS Enabled</q-item-label>
                <q-item-label caption>{{ isHttps ? 'Yes ✅' : 'No ❌ (Required for Web Bluetooth)' }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Platform</q-item-label>
                <q-item-label caption>{{ platformInfo }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Browser</q-item-label>
                <q-item-label caption>{{ browserInfo }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Is Native Platform</q-item-label>
                <q-item-label caption>{{ isNativePlatform ? 'Yes (Mobile App)' : 'No (Web/PWA)' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Web Bluetooth API Check</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-list dense>
            <q-item>
              <q-item-section>
                <q-item-label>navigator.bluetooth exists</q-item-label>
                <q-item-label caption>{{ bluetoothApiExists ? 'Yes ✅' : 'No ❌' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon :name="bluetoothApiExists ? 'check_circle' : 'error'" :color="bluetoothApiExists ? 'positive' : 'negative'" />
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Web Bluetooth Supported</q-item-label>
                <q-item-label caption>{{ isWebBluetoothSupported ? 'Yes ✅' : 'No ❌' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon :name="isWebBluetoothSupported ? 'check_circle' : 'error'" :color="isWebBluetoothSupported ? 'positive' : 'negative'" />
              </q-item-section>
            </q-item>
            
            <q-item v-if="bluetoothApiExists">
              <q-item-section>
                <q-item-label>getAvailability() method</q-item-label>
                <q-item-label caption>{{ hasGetAvailability ? 'Supported' : 'Not supported' }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item v-if="availabilityChecked">
              <q-item-section>
                <q-item-label>Bluetooth Available</q-item-label>
                <q-item-label caption>{{ bluetoothAvailable ? 'Yes ✅' : 'No ❌ (Enable Bluetooth on your device)' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Store State</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-list dense>
            <q-item>
              <q-item-section>
                <q-item-label>Bluetooth Active</q-item-label>
                <q-item-label caption>{{ bluetoothStore.isActive }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Nickname</q-item-label>
                <q-item-label caption>{{ bluetoothStore.nickname }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Nearby Peers</q-item-label>
                <q-item-label caption>{{ bluetoothStore.nearbyPeers.length }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Is Desktop (Store)</q-item-label>
                <q-item-label caption>{{ bluetoothStore.isDesktop }}</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item>
              <q-item-section>
                <q-item-label>Is Web Bluetooth Available (Store)</q-item-label>
                <q-item-label caption>{{ bluetoothStore.isWebBluetoothAvailable }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Test Web Bluetooth</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-btn
            color="primary"
            icon="bluetooth_searching"
            label="Test Device Picker"
            @click="testDevicePicker"
            :disable="!bluetoothApiExists || !isHttps"
            class="q-mb-md"
          />
          
          <div v-if="testResult" class="q-mt-md">
            <div class="text-subtitle2">Test Result:</div>
            <pre class="bg-grey-2 q-pa-md" style="overflow-x: auto; white-space: pre-wrap;">{{ testResult }}</pre>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Console Logs</div>
          <div class="text-caption">Open browser DevTools (F12) to see detailed logs</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="logs.length === 0" class="text-grey-6">
            Click "Test Device Picker" to generate logs
          </div>
          <q-list v-else dense>
            <q-item v-for="(log, index) in logs" :key="index">
              <q-item-section>
                <q-item-label caption>{{ log }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Recommendations</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="!isHttps" class="text-negative q-mb-md">
            ❌ <strong>HTTPS Required:</strong> Web Bluetooth only works on HTTPS. Deploy to a domain with SSL certificate.
          </div>
          
          <div v-if="!bluetoothApiExists" class="text-negative q-mb-md">
            ❌ <strong>Browser Not Supported:</strong> Use Chrome, Edge, or another Chromium-based browser.
          </div>
          
          <div v-if="isHttps && bluetoothApiExists && !bluetoothAvailable && availabilityChecked" class="text-warning q-mb-md">
            ⚠️ <strong>Bluetooth Not Available:</strong> Enable Bluetooth on your device.
          </div>
          
          <div v-if="isHttps && bluetoothApiExists && bluetoothAvailable" class="text-positive q-mb-md">
            ✅ <strong>All Checks Passed!</strong> Web Bluetooth should work. Click "Test Device Picker" to try it.
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBluetoothStore } from 'src/stores/bluetooth';
import { Capacitor } from '@capacitor/core';

const bluetoothStore = useBluetoothStore();

const currentUrl = ref('');
const isHttps = ref(false);
const platformInfo = ref('');
const browserInfo = ref('');
const isNativePlatform = ref(false);
const bluetoothApiExists = ref(false);
const isWebBluetoothSupported = ref(false);
const hasGetAvailability = ref(false);
const bluetoothAvailable = ref(false);
const availabilityChecked = ref(false);
const testResult = ref('');
const logs = ref<string[]>([]);

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  logs.value.push(logMessage);
  console.log(logMessage);
}

async function testDevicePicker() {
  testResult.value = '';
  logs.value = [];
  
  try {
    addLog('🔍 Starting Web Bluetooth device picker test...');
    addLog(`📍 Current URL: ${window.location.href}`);
    addLog(`🔒 HTTPS: ${window.location.protocol === 'https:'}`);
    
    if (!navigator.bluetooth) {
      throw new Error('navigator.bluetooth not available');
    }
    
    addLog('✅ navigator.bluetooth exists');
    
    addLog('🎯 Attempting to request device with acceptAllDevices...');
    
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['0000180f-0000-1000-8000-00805f9b34fb'] // Battery service as example
    });
    
    addLog(`✅ Device selected: ${device.name || 'Unknown'}`);
    addLog(`   Device ID: ${device.id}`);
    
    testResult.value = JSON.stringify({
      success: true,
      deviceName: device.name,
      deviceId: device.id,
      message: 'Web Bluetooth device picker works! ✅'
    }, null, 2);
    
  } catch (error: any) {
    addLog(`❌ Error: ${error.message}`);
    
    if (error.name === 'NotFoundError') {
      testResult.value = 'User cancelled device selection or no devices found.';
      addLog('ℹ️ This is normal if you clicked "Cancel" in the device picker');
    } else if (error.name === 'SecurityError') {
      testResult.value = 'Security error: Web Bluetooth blocked. Check HTTPS and permissions.';
      addLog('❌ Security error - check HTTPS and browser permissions');
    } else {
      testResult.value = `Error: ${error.message}\n\nCheck console for details.`;
      addLog(`❌ Unexpected error: ${error.name}`);
    }
    
    console.error('Web Bluetooth test error:', error);
  }
}

onMounted(async () => {
  // Get environment info
  currentUrl.value = window.location.href;
  isHttps.value = window.location.protocol === 'https:';
  isNativePlatform.value = Capacitor.isNativePlatform();
  
  platformInfo.value = isNativePlatform.value 
    ? `Native (${Capacitor.getPlatform()})` 
    : 'Web/PWA';
  
  browserInfo.value = navigator.userAgent;
  
  // Check Web Bluetooth API
  bluetoothApiExists.value = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  isWebBluetoothSupported.value = bluetoothApiExists.value;
  
  if (bluetoothApiExists.value && navigator.bluetooth) {
    hasGetAvailability.value = 'getAvailability' in navigator.bluetooth;
    
    if (hasGetAvailability.value) {
      try {
        bluetoothAvailable.value = await navigator.bluetooth.getAvailability();
        availabilityChecked.value = true;
      } catch (error) {
        console.error('Failed to check Bluetooth availability:', error);
      }
    }
  }
  
  console.log('=== Web Bluetooth Diagnostics ===');
  console.log('URL:', currentUrl.value);
  console.log('HTTPS:', isHttps.value);
  console.log('Platform:', platformInfo.value);
  console.log('Bluetooth API exists:', bluetoothApiExists.value);
  console.log('Bluetooth available:', bluetoothAvailable.value);
  console.log('Store state:', {
    isActive: bluetoothStore.isActive,
    isDesktop: bluetoothStore.isDesktop,
    isWebBluetoothAvailable: bluetoothStore.isWebBluetoothAvailable
  });
});
</script>

<style scoped lang="scss">
pre {
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}
</style>

