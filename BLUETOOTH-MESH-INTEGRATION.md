# Bluetooth Mesh Integration for Trails Coffee Rewards

## Overview

Integrate BitChat's Bluetooth mesh networking into the Trails Coffee PWA to enable:
- **Offline Payments**: Send/receive rewards without internet
- **Local Discovery**: Find nearby Trails Coffee customers
- **Mesh Relay**: Multi-hop message routing through nearby devices
- **Event Mode**: Special promotions at coffee shop events

## Architecture

### BitChat Bluetooth Mesh (Swift/iOS)
- BLE-based mesh network
- Noise Protocol encryption
- Multi-hop relay (max 7 hops)
- Location-based channels via geohash

### Capacitor Plugin Bridge
- Expose BitChat functionality to JavaScript
- Handle BLE permissions
- Manage background operation
- Sync with Cashu wallet

## Implementation Plan

### Phase 1: Capacitor Plugin Foundation

Create `capacitor-bluetooth-mesh` plugin:

```typescript
// capacitor-bluetooth-mesh/src/definitions.ts
export interface BluetoothMeshPlugin {
  /**
   * Initialize Bluetooth mesh
   */
  initialize(options: { nickname: string }): Promise<{ success: boolean }>;

  /**
   * Start mesh networking
   */
  start(): Promise<{ success: boolean }>;

  /**
   * Stop mesh networking
   */
  stop(): Promise<{ success: boolean }>;

  /**
   * Send Cashu token via mesh
   */
  sendToken(options: {
    token: string;
    recipient?: string; // Optional: specific peer ID
    broadcast?: boolean; // Broadcast to local mesh
  }): Promise<{ success: boolean; messageId: string }>;

  /**
   * Listen for incoming tokens
   */
  addListener(
    eventName: 'tokenReceived',
    listenerFunc: (event: { token: string; sender: string }) => void
  ): Promise<PluginListenerHandle>;

  /**
   * Get nearby peers
   */
  getNearbyPeers(): Promise<{ peers: MeshPeer[] }>;

  /**
   * Join location channel
   */
  joinLocationChannel(options: {
    geohash: string;
    precision: number;
  }): Promise<{ success: boolean }>;
}

export interface MeshPeer {
  id: string;
  nickname: string;
  distance?: number; // RSSI-based estimate
  lastSeen: number;
}
```

### Phase 2: iOS Implementation

Port BitChat BLE code to Capacitor plugin:

```swift
// ios/Plugin/BluetoothMeshPlugin.swift
import Foundation
import Capacitor
import CoreBluetooth

@objc(BluetoothMeshPlugin)
public class BluetoothMeshPlugin: CAPPlugin {
    private var bleService: BLEService?
    private var messageRouter: MessageRouter?
    
    @objc func initialize(_ call: CAPPluginCall) {
        let nickname = call.getString("nickname") ?? "User"
        
        // Initialize BLE service (from BitChat)
        bleService = BLEService()
        messageRouter = MessageRouter()
        
        call.resolve(["success": true])
    }
    
    @objc func start(_ call: CAPPluginCall) {
        bleService?.startAdvertising()
        bleService?.startScanning()
        
        call.resolve(["success": true])
    }
    
    @objc func sendToken(_ call: CAPPluginCall) {
        guard let token = call.getString("token") else {
            call.reject("Token required")
            return
        }
        
        let broadcast = call.getBool("broadcast") ?? false
        
        // Create message packet
        let packet = CashuTokenPacket(token: token)
        
        if broadcast {
            messageRouter?.broadcast(packet)
        } else if let recipient = call.getString("recipient") {
            messageRouter?.send(packet, to: recipient)
        }
        
        call.resolve(["success": true, "messageId": packet.id])
    }
    
    @objc func getNearbyPeers(_ call: CAPPluginCall) {
        let peers = bleService?.discoveredPeers.map { peer in
            return [
                "id": peer.id,
                "nickname": peer.nickname,
                "distance": peer.rssi,
                "lastSeen": peer.lastSeen
            ]
        } ?? []
        
        call.resolve(["peers": peers])
    }
}

// Cashu Token Packet Format
struct CashuTokenPacket: Codable {
    let id: String
    let type: String = "cashu_token"
    let token: String
    let timestamp: Int
    let hops: Int
    
    init(token: String) {
        self.id = UUID().uuidString
        self.token = token
        self.timestamp = Int(Date().timeIntervalSince1970)
        self.hops = 0
    }
}
```

### Phase 3: Android Implementation

```kotlin
// android/src/main/java/com/trailscoffee/bluetoothmesh/BluetoothMeshPlugin.kt
package com.trailscoffee.bluetoothmesh

import android.bluetooth.*
import android.bluetooth.le.*
import com.getcapacitor.*
import com.getcapacitor.annotation.*

@CapacitorPlugin(name = "BluetoothMesh")
class BluetoothMeshPlugin : Plugin() {
    private var bleManager: BluetoothManager? = null
    private var bleAdapter: BluetoothAdapter? = null
    private var bleAdvertiser: BluetoothLeAdvertiser? = null
    private var bleScanner: BluetoothLeScanner? = null
    
    @PluginMethod
    fun initialize(call: PluginCall) {
        val nickname = call.getString("nickname") ?: "User"
        
        bleManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bleAdapter = bleManager?.adapter
        bleAdvertiser = bleAdapter?.bluetoothLeAdvertiser
        bleScanner = bleAdapter?.bluetoothLeScanner
        
        call.resolve(JSObject().put("success", true))
    }
    
    @PluginMethod
    fun start(call: PluginCall) {
        startAdvertising()
        startScanning()
        call.resolve(JSObject().put("success", true))
    }
    
    @PluginMethod
    fun sendToken(call: PluginCall) {
        val token = call.getString("token") ?: run {
            call.reject("Token required")
            return
        }
        
        val broadcast = call.getBoolean("broadcast") ?: false
        
        // Broadcast token via BLE
        broadcastCashuToken(token)
        
        call.resolve(JSObject().put("success", true))
    }
    
    private fun startAdvertising() {
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build()
        
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()
        
        bleAdvertiser?.startAdvertising(settings, data, advertiseCallback)
    }
    
    private fun startScanning() {
        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()
        
        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()
        
        bleScanner?.startScan(listOf(scanFilter), scanSettings, scanCallback)
    }
    
    companion object {
        val SERVICE_UUID = UUID.fromString("00000000-0000-1000-8000-00805F9B34FB")
    }
}
```

### Phase 4: PWA Integration

```typescript
// src/composables/useBluetoothMesh.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { BluetoothMesh } from 'capacitor-bluetooth-mesh';
import { useWalletStore } from 'src/stores/wallet';
import { notifySuccess } from 'src/js/notify';

export function useBluetoothMesh() {
  const enabled = ref(false);
  const nearbyPeers = ref<any[]>([]);
  const walletStore = useWalletStore();

  async function initialize() {
    try {
      await BluetoothMesh.initialize({
        nickname: 'Trails Customer',
      });
      enabled.value = true;
    } catch (error) {
      console.error('Failed to initialize Bluetooth mesh:', error);
    }
  }

  async function start() {
    await BluetoothMesh.start();
    startPeerDiscovery();
    listenForTokens();
  }

  async function stop() {
    await BluetoothMesh.stop();
    enabled.value = false;
  }

  async function sendTokenViaMesh(token: string, broadcast = true) {
    await BluetoothMesh.sendToken({
      token,
      broadcast,
    });
    notifySuccess('Sent via Bluetooth mesh!');
  }

  function startPeerDiscovery() {
    setInterval(async () => {
      const result = await BluetoothMesh.getNearbyPeers();
      nearbyPeers.value = result.peers;
    }, 5000);
  }

  function listenForTokens() {
    BluetoothMesh.addListener('tokenReceived', async (event) => {
      console.log('Received token via mesh:', event.token);
      
      // Auto-redeem received token
      const receiveStore = useReceiveTokensStore();
      receiveStore.receiveData.tokensBase64 = event.token;
      
      try {
        await walletStore.redeem();
        notifySuccess(`Received ${event.token.length} sats via Bluetooth!`);
      } catch (error) {
        console.error('Failed to redeem mesh token:', error);
      }
    });
  }

  onMounted(() => {
    initialize();
  });

  return {
    enabled,
    nearbyPeers,
    start,
    stop,
    sendTokenViaMesh,
  };
}
```

### Phase 5: UI Components

```vue
<!-- src/components/BluetoothMeshPanel.vue -->
<template>
  <q-card flat bordered class="mesh-panel">
    <q-card-section>
      <div class="row items-center">
        <div class="col">
          <div class="text-h6">Bluetooth Mesh</div>
          <div class="text-caption text-grey-6">
            Send rewards offline to nearby customers
          </div>
        </div>
        <div class="col-auto">
          <q-toggle
            v-model="meshEnabled"
            color="primary"
            @update:model-value="toggleMesh"
          />
        </div>
      </div>
    </q-card-section>

    <q-card-section v-if="meshEnabled">
      <div class="text-subtitle2 q-mb-sm">
        Nearby Peers ({{ nearbyPeers.length }})
      </div>
      <q-list bordered separator>
        <q-item v-for="peer in nearbyPeers" :key="peer.id">
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white">
              <q-icon name="person" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ peer.nickname }}</q-item-label>
            <q-item-label caption>
              {{ peer.distance }}m away
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              dense
              icon="send"
              color="primary"
              @click="sendToPeer(peer)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useBluetoothMesh } from 'src/composables/useBluetoothMesh';

const { enabled, nearbyPeers, start, stop } = useBluetoothMesh();
const meshEnabled = ref(false);

async function toggleMesh(value: boolean) {
  if (value) {
    await start();
  } else {
    await stop();
  }
}

function sendToPeer(peer: any) {
  // Open send dialog with peer pre-selected
  console.log('Send to peer:', peer);
}
</script>
```

## Use Cases for Trails Coffee

### 1. **Event Promotions**
- Enable mesh at coffee shop events
- Broadcast special reward tokens to all attendees
- No internet required

### 2. **Peer-to-Peer Gifting**
- Customers can gift rewards to friends nearby
- "Buy a coffee for the person behind you"

### 3. **Loyalty Multiplier**
- Extra rewards for customers who enable mesh
- Helps build local community network

### 4. **Emergency Backup**
- If internet/POS is down, still accept payments
- Tokens sync when connection restored

## Security Considerations

1. **Encryption**: All mesh messages use Noise Protocol (from BitChat)
2. **Token Validation**: Verify tokens with mint when online
3. **Rate Limiting**: Prevent spam/flooding attacks
4. **Battery**: Adaptive duty cycling to preserve battery
5. **Privacy**: Ephemeral peer IDs, no persistent tracking

## Testing Plan

1. **Unit Tests**: BLE packet encoding/decoding
2. **Integration Tests**: Multi-device token transfer
3. **Range Tests**: Maximum effective distance
4. **Battery Tests**: Power consumption over 8 hours
5. **Mesh Tests**: Multi-hop relay (3+ devices)

## Deployment

1. Build Capacitor plugin
2. Test on iOS/Android test devices
3. Submit to App Store / Play Store
4. Roll out to beta testers at Trails Coffee
5. Full launch with in-store signage

## Next Steps

1. Port BitChat BLE service to Capacitor plugin
2. Implement Android BLE equivalent
3. Create UI components for mesh panel
4. Test with 5+ devices in coffee shop
5. Add analytics for mesh usage

## Resources

- BitChat source: `c:\Users\JuanPabloGaviria\git\bitchat`
- Capacitor plugins: https://capacitorjs.com/docs/plugins
- BLE on iOS: https://developer.apple.com/bluetooth/
- BLE on Android: https://developer.android.com/guide/topics/connectivity/bluetooth-le



