# Boltcard NFC Integration for Trails Coffee Rewards

## Overview

Integrate Boltcard NFC functionality to enable:
- **Tap-to-Pay**: Pay with Cashu tokens via NFC card
- **Tap-to-Receive**: Receive rewards by tapping card
- **Card Management**: Link/unlink cards in PWA
- **Spend Limits**: Set daily/per-transaction limits

## Architecture

### Components

1. **boltcard-nwc Backend** (Next.js)
   - Card authentication and authorization
   - Spend limit enforcement
   - Transaction logging
   - Admin card management

2. **PWA NFC Integration** (Capacitor)
   - Read NFC tags (Web NFC API + Capacitor)
   - Write card configuration
   - Display card balance
   - Transaction history

3. **Cashu Wallet Bridge**
   - Convert NFC auth to Cashu token spend
   - Handle token minting for received payments
   - Sync balances

## Implementation Plan

### Phase 1: Boltcard-NWC Backend Setup

Deploy the boltcard-nwc service:

```bash
cd /opt
git clone https://github.com/your-org/boltcard-nwc.git
cd boltcard-nwc

# Configure environment
cp .env.example .env
```

Update `.env`:

```bash
# Database
DATABASE_URL="postgresql://boltcard:PASSWORD@localhost:5432/boltcard"

# NWC Configuration
NWC_RELAY=wss://relay.getalby.com
NWC_SECRET=your_secret_key

# Cashu Mint
MINT_URL=https://mint.trailscoffee.com

# Domain
NEXTAUTH_URL=https://cards.trailscoffee.com
NEXTAUTH_SECRET=your_nextauth_secret

# Admin
ADMIN_NPUB=npub1your_admin_key
```

Run migrations and start:

```bash
npx prisma migrate deploy
npm run build
npm start
```

### Phase 2: Capacitor NFC Plugin

Create `capacitor-nfc-cashu` plugin:

```typescript
// capacitor-nfc-cashu/src/definitions.ts
export interface NfcCashuPlugin {
  /**
   * Check if NFC is available
   */
  isAvailable(): Promise<{ available: boolean }>;

  /**
   * Start scanning for NFC tags
   */
  startScan(): Promise<{ success: boolean }>;

  /**
   * Stop scanning
   */
  stopScan(): Promise<{ success: boolean }>;

  /**
   * Read Boltcard data
   */
  readCard(): Promise<BoltcardData>;

  /**
   * Write card configuration
   */
  writeCard(options: {
    cardId: string;
    authKey: string;
    lnurlWithdraw?: string;
  }): Promise<{ success: boolean }>;

  /**
   * Listen for NFC tag detected
   */
  addListener(
    eventName: 'tagDetected',
    listenerFunc: (event: { tagId: string; data: BoltcardData }) => void
  ): Promise<PluginListenerHandle>;
}

export interface BoltcardData {
  uid: string;
  counter: number;
  signature: string;
  lnurlw?: string; // LNURL-withdraw for receiving
}
```

### Phase 3: iOS NFC Implementation

```swift
// ios/Plugin/NfcCashuPlugin.swift
import Foundation
import Capacitor
import CoreNFC

@objc(NfcCashuPlugin)
public class NfcCashuPlugin: CAPPlugin, NFCNDEFReaderSessionDelegate {
    private var nfcSession: NFCNDEFReaderSession?
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = NFCNDEFReaderSession.readingAvailable
        call.resolve(["available": available])
    }
    
    @objc func startScan(_ call: CAPPluginCall) {
        nfcSession = NFCNDEFReaderSession(
            delegate: self,
            queue: nil,
            invalidateAfterFirstRead: false
        )
        nfcSession?.alertMessage = "Hold your Boltcard near the device"
        nfcSession?.begin()
        
        call.resolve(["success": true])
    }
    
    @objc func stopScan(_ call: CAPPluginCall) {
        nfcSession?.invalidate()
        call.resolve(["success": true])
    }
    
    @objc func readCard(_ call: CAPPluginCall) {
        // Implement NTAG424 DNA reading
        // Parse Boltcard authentication data
        call.resolve([
            "uid": "card_uid",
            "counter": 123,
            "signature": "hex_signature"
        ])
    }
    
    public func readerSession(
        _ session: NFCNDEFReaderSession,
        didDetectNDEFs messages: [NFCNDEFMessage]
    ) {
        for message in messages {
            for record in message.records {
                if let payload = String(data: record.payload, encoding: .utf8) {
                    // Parse LNURL or Boltcard data
                    notifyListeners("tagDetected", data: [
                        "tagId": record.identifier.hexString,
                        "data": payload
                    ])
                }
            }
        }
    }
    
    public func readerSession(
        _ session: NFCNDEFReaderSession,
        didInvalidateWithError error: Error
    ) {
        print("NFC session error: \(error.localizedDescription)")
    }
}
```

### Phase 4: Android NFC Implementation

```kotlin
// android/src/main/java/com/trailscoffee/nfccashu/NfcCashuPlugin.kt
package com.trailscoffee.nfccashu

import android.app.PendingIntent
import android.content.Intent
import android.nfc.*
import android.nfc.tech.*
import com.getcapacitor.*
import com.getcapacitor.annotation.*

@CapacitorPlugin(name = "NfcCashu")
class NfcCashuPlugin : Plugin() {
    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null
    
    override fun load() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(context)
        
        val intent = Intent(context, activity.javaClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_MUTABLE
        )
    }
    
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val available = nfcAdapter != null && nfcAdapter!!.isEnabled
        call.resolve(JSObject().put("available", available))
    }
    
    @PluginMethod
    fun startScan(call: PluginCall) {
        activity.runOnUiThread {
            nfcAdapter?.enableForegroundDispatch(
                activity,
                pendingIntent,
                null,
                null
            )
        }
        call.resolve(JSObject().put("success", true))
    }
    
    @PluginMethod
    fun stopScan(call: PluginCall) {
        activity.runOnUiThread {
            nfcAdapter?.disableForegroundDispatch(activity)
        }
        call.resolve(JSObject().put("success", true))
    }
    
    @PluginMethod
    fun readCard(call: PluginCall) {
        // Read NTAG424 DNA card
        // Extract UID, counter, signature
        call.resolve(JSObject().apply {
            put("uid", "card_uid")
            put("counter", 123)
            put("signature", "hex_signature")
        })
    }
    
    override fun handleOnNewIntent(intent: Intent) {
        if (NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_TAG_DISCOVERED == intent.action) {
            
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            tag?.let { processTag(it) }
        }
    }
    
    private fun processTag(tag: Tag) {
        val ndef = Ndef.get(tag)
        ndef?.connect()
        
        val ndefMessage = ndef?.ndefMessage
        ndefMessage?.records?.forEach { record ->
            val payload = String(record.payload)
            
            notifyListeners("tagDetected", JSObject().apply {
                put("tagId", tag.id.toHexString())
                put("data", payload)
            })
        }
        
        ndef?.close()
    }
}

fun ByteArray.toHexString() = joinToString("") { "%02x".format(it) }
```

### Phase 5: PWA Integration

```typescript
// src/composables/useBoltcard.ts
import { ref } from 'vue';
import { NfcCashu } from 'capacitor-nfc-cashu';
import { useWalletStore } from 'src/stores/wallet';
import { notifySuccess, notifyError } from 'src/js/notify';
import axios from 'axios';

const BOLTCARD_API = 'https://cards.trailscoffee.com/api';

export function useBoltcard() {
  const scanning = ref(false);
  const linkedCards = ref<any[]>([]);
  const walletStore = useWalletStore();

  async function checkNfcAvailable() {
    const result = await NfcCashu.isAvailable();
    return result.available;
  }

  async function startScanning() {
    scanning.value = true;
    await NfcCashu.startScan();
    
    // Listen for tags
    NfcCashu.addListener('tagDetected', async (event) => {
      await handleCardDetected(event.data);
    });
  }

  async function stopScanning() {
    await NfcCashu.stopScan();
    scanning.value = false;
  }

  async function handleCardDetected(cardData: any) {
    try {
      // Authenticate card with backend
      const authResponse = await axios.post(`${BOLTCARD_API}/auth`, {
        uid: cardData.uid,
        counter: cardData.counter,
        signature: cardData.signature,
      });

      if (!authResponse.data.authorized) {
        notifyError('Card not authorized');
        return;
      }

      // Check if this is a payment or receive
      if (cardData.lnurlw) {
        // This is a receive - mint tokens for user
        await handleReceive(cardData.lnurlw);
      } else {
        // This is a payment - spend tokens
        await handlePayment(authResponse.data);
      }
    } catch (error: any) {
      console.error('Card processing error:', error);
      notifyError('Card error: ' + error.message);
    }
  }

  async function handlePayment(authData: any) {
    const amount = authData.amount || 100; // Default or from POS
    
    // Get spend limit
    const limitCheck = await axios.get(
      `${BOLTCARD_API}/limits/${authData.cardId}`
    );
    
    if (amount > limitCheck.data.remaining) {
      notifyError('Spend limit exceeded');
      return;
    }

    // Send tokens via Cashu
    const proofs = walletStore.wallet.proofs;
    const { sendProofs } = await walletStore.send(
      proofs,
      walletStore.wallet,
      amount,
      true // invalidate
    );

    // Log transaction
    await axios.post(`${BOLTCARD_API}/transactions`, {
      cardId: authData.cardId,
      amount: amount,
      proofs: sendProofs,
      type: 'payment',
    });

    notifySuccess(`Paid ${amount} sats with Boltcard!`);
  }

  async function handleReceive(lnurlw: string) {
    // Decode LNURL-withdraw
    const response = await axios.get(lnurlw);
    const { callback, k1, minWithdrawable, maxWithdrawable } = response.data;

    // Request mint quote
    const amount = maxWithdrawable / 1000; // Convert to sats
    const mintQuote = await walletStore.requestMint(
      amount,
      walletStore.wallet
    );

    // Complete LNURL-withdraw
    await axios.get(callback, {
      params: {
        k1: k1,
        pr: mintQuote.request, // Lightning invoice
      },
    });

    // Wait for payment and mint tokens
    await walletStore.mint(mintQuote);
    
    notifySuccess(`Received ${amount} sats to your card!`);
  }

  async function linkCard(cardUid: string) {
    try {
      const response = await axios.post(`${BOLTCARD_API}/cards/link`, {
        uid: cardUid,
        npub: useTrailsIdentityStore().userNpub,
      });

      linkedCards.value.push(response.data.card);
      notifySuccess('Card linked successfully!');
    } catch (error: any) {
      notifyError('Failed to link card: ' + error.message);
    }
  }

  async function setSpendLimit(cardId: string, dailyLimit: number) {
    await axios.post(`${BOLTCARD_API}/cards/${cardId}/limits`, {
      dailyLimit: dailyLimit,
    });
    notifySuccess('Spend limit updated');
  }

  return {
    scanning,
    linkedCards,
    checkNfcAvailable,
    startScanning,
    stopScanning,
    linkCard,
    setSpendLimit,
  };
}
```

### Phase 6: UI Components

```vue
<!-- src/components/BoltcardPanel.vue -->
<template>
  <q-card flat bordered class="boltcard-panel">
    <q-card-section>
      <div class="text-h6 q-mb-md">
        <q-icon name="credit_card" class="q-mr-sm" />
        Boltcard NFC
      </div>

      <!-- NFC Status -->
      <q-banner v-if="!nfcAvailable" class="bg-warning text-white q-mb-md">
        <template v-slot:avatar>
          <q-icon name="warning" />
        </template>
        NFC is not available on this device
      </q-banner>

      <!-- Scan Button -->
      <q-btn
        v-if="nfcAvailable"
        unelevated
        rounded
        :color="scanning ? 'negative' : 'primary'"
        :icon="scanning ? 'stop' : 'nfc'"
        :label="scanning ? 'Stop Scanning' : 'Tap to Pay'"
        class="full-width q-mb-md"
        @click="toggleScan"
      />

      <!-- Linked Cards -->
      <div v-if="linkedCards.length > 0" class="q-mt-lg">
        <div class="text-subtitle2 q-mb-sm">Your Cards</div>
        <q-list bordered separator>
          <q-item v-for="card in linkedCards" :key="card.id">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">
                <q-icon name="credit_card" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ card.name || 'Boltcard' }}</q-item-label>
              <q-item-label caption>
                UID: {{ card.uid.slice(0, 8) }}...
              </q-item-label>
              <q-item-label caption>
                Daily Limit: {{ card.dailyLimit }} sats
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                icon="settings"
                @click="editCard(card)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Link New Card -->
      <q-btn
        flat
        color="primary"
        icon="add"
        label="Link New Card"
        class="full-width q-mt-md"
        @click="showLinkDialog = true"
      />
    </q-card-section>

    <!-- Link Card Dialog -->
    <q-dialog v-model="showLinkDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Link Boltcard</div>
        </q-card-section>

        <q-card-section>
          <p class="text-body2 q-mb-md">
            Tap your Boltcard to link it to your account
          </p>
          <div class="text-center q-py-lg">
            <q-spinner-dots v-if="linking" color="primary" size="50px" />
            <q-icon v-else name="nfc" size="80px" color="primary" />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useBoltcard } from 'src/composables/useBoltcard';

const {
  scanning,
  linkedCards,
  checkNfcAvailable,
  startScanning,
  stopScanning,
  linkCard,
} = useBoltcard();

const nfcAvailable = ref(false);
const showLinkDialog = ref(false);
const linking = ref(false);

onMounted(async () => {
  nfcAvailable.value = await checkNfcAvailable();
});

async function toggleScan() {
  if (scanning.value) {
    await stopScanning();
  } else {
    await startScanning();
  }
}

function editCard(card: any) {
  // Open card settings dialog
  console.log('Edit card:', card);
}
</script>
```

## Use Cases for Trails Coffee

### 1. **Customer Payments**
- Tap Boltcard at POS to pay with rewards
- Instant, no phone needed
- Works offline with mesh

### 2. **Loyalty Card**
- Physical card = digital wallet
- Tap to check balance
- Tap to receive rewards after purchase

### 3. **Gift Cards**
- Pre-load Boltcards with value
- Sell as physical gift cards
- Reloadable

### 4. **Staff Cards**
- Employee discount cards
- Track usage
- Set spending limits

## Security

1. **NTAG424 DNA**: Cryptographic authentication
2. **Spend Limits**: Daily/per-transaction limits
3. **Card Locking**: Disable lost/stolen cards
4. **Transaction Log**: Full audit trail
5. **Backend Validation**: All transactions verified server-side

## Testing

1. Order NTAG424 DNA cards from NFC supplier
2. Configure cards with boltcard-nwc admin panel
3. Test tap-to-pay flow at POS
4. Test tap-to-receive after purchase
5. Verify spend limits work correctly

## Deployment

1. Deploy boltcard-nwc backend
2. Build and test Capacitor NFC plugin
3. Add UI components to PWA
4. Order and configure physical cards
5. Train staff on card usage
6. Launch with in-store promotion

## Next Steps

1. Set up boltcard-nwc backend at `cards.trailscoffee.com`
2. Build Capacitor NFC plugin
3. Order NTAG424 DNA cards (recommend: https://www.gototags.com/)
4. Create card design with Trails Coffee branding
5. Test with beta customers

## Resources

- boltcard-nwc: `c:\Users\JuanPabloGaviria\git\boltcard-nwc`
- Boltcard spec: https://github.com/boltcard/boltcard
- NTAG424 DNA: https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag/ntag-424-dna:NTAG424DNA
- Web NFC API: https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API



