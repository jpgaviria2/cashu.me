# Bluetooth Mesh Ecash Integration Progress

## Completed

### Phase 1.1: Port Bluetooth Mesh Components ✅
- ✅ Created directory structure:
  - `/android/app/src/main/java/me/cashu/wallet/mesh/`
  - `/android/app/src/main/java/me/cashu/wallet/protocol/`
  - `/android/app/src/main/java/me/cashu/wallet/crypto/`
  - `/android/app/src/main/java/me/cashu/wallet/model/`
  - `/android/app/src/main/java/me/cashu/wallet/noise/`

- ✅ Copied 17 mesh component files from bitchat-android
- ✅ Copied 3 protocol files (BinaryProtocol, CompressionUtil, MessagePadding)
- ✅ Copied crypto directory (EncryptionService + dependencies)
- ✅ Copied noise directory (Noise protocol implementation including southernstorm Java library)
- ✅ Copied essential model files (BitchatMessage, RoutedPacket, IdentityAnnouncement)
- ✅ Updated all package declarations from `com.bitchat.android` to `me.cashu.wallet`

## In Progress / Next Steps

### Phase 1: Remaining Tasks
- ⏳ Copy missing dependencies:
  - sync/ directory (GossipSyncManager)
  - Additional model files (BitchatFilePacket, NoisePayload, FragmentPayload, NoiseEncrypted, RequestSyncPacket)
  - util/ directory
  - services/ directory (if needed)
  
- ⏳ Remove/stub out bitchat-specific UI dependencies:
  - Debug managers (DebugSettingsManager, DebugPreferenceManager)
  - Favorites/contacts service (FavoritesPersistenceService)
  - ChatState and UI references
  
- ⏳ Copy protocol files:
  - BitchatPacket.kt
  - MessageType.kt
  - SpecialRecipients.kt

### Phase 2: Ecash Token Message Model (Not Started)
- ⏸️ Create EcashMessage.kt model
- ⏸️ Implement binary payload serialization/deserialization
- ⏸️ Define DeliveryStatus enum for ecash

### Phase 3: Bluetooth Service Integration (Not Started)
- ⏸️ Create BluetoothEcashService.kt wrapper
- ⏸️ Update AndroidManifest.xml with permissions
- ⏸️ Update build.gradle with dependencies

### Phase 4: UI Integration (Not Started)
- ⏸️ Create NearbyContactsDialog.vue
- ⏸️ Modify SendTokenDialog.vue
- ⏸️ Create EcashClaimNotification.vue

### Phase 5: Capacitor Plugin Bridge (Not Started)
- ⏸️ Create BluetoothEcashPlugin.kt
- ⏸️ Create TypeScript interface
- ⏸️ Create Pinia store for Bluetooth

### Phase 6: Nostr Contact List Integration (Not Started)
- ⏸️ Create bluetoothContacts.ts store
- ⏸️ Implement automatic contact creation
- ⏸️ Implement contact list sync

### Phase 7: Offline Token Storage (Not Started)
- ⏸️ Create unclaimedTokens.ts store
- ⏸️ Implement auto-claim worker

### Phase 8: Testing & Polish (Not Started)
- ⏸️ Permission handling
- ⏸️ Battery optimization
- ⏸️ Error handling
- ⏸️ UI/UX polish

## Known Issues to Resolve

1. **Missing Dependencies**: Several bitchat-specific classes are referenced:
   - `com.bitchat.android.ui.debug.*` - Debug/diagnostic UI components
   - `com.bitchat.android.favorites.FavoritesPersistenceService` - Contact storage
   - `com.bitchat.android.sync.GossipSyncManager` - Gossip protocol sync
   - `com.bitchat.android.model.BitchatFilePacket` - File transfer model
   - `com.bitchat.android.model.NoisePayload` - Encrypted payload model

2. **Integration Points**: Need to connect to existing cashu.me infrastructure:
   - Nostr identity (currently uses separate wallet-derived keys)
   - Ecash token format and minting
   - Existing contact/peer management

3. **Build System**: Need to add Kotlin support and dependencies to gradle

## Files Copied So Far

### Mesh Components (17 files)
- BluetoothMeshService.kt
- BluetoothConnectionManager.kt
- BluetoothGattClientManager.kt
- BluetoothGattServerManager.kt
- BluetoothConnectionTracker.kt
- PeerManager.kt
- FragmentManager.kt
- PacketProcessor.kt
- PacketRelayManager.kt
- MessageHandler.kt
- SecurityManager.kt
- StoreForwardManager.kt
- BluetoothPermissionManager.kt
- PowerManager.kt
- PeerFingerprintManager.kt
- TransferProgressManager.kt
- BluetoothPacketBroadcaster.kt

### Protocol Components (3 files)
- BinaryProtocol.kt
- CompressionUtil.kt
- MessagePadding.kt

### Crypto/Noise Components
- crypto/EncryptionService.kt
- noise/NoiseChannelEncryption.kt
- noise/NoiseEncryptionService.kt
- noise/NoiseSession.kt
- noise/NoiseSessionManager.kt
- noise/southernstorm/*.java (29 Java files for Noise protocol)

### Model Components (3 files)
- BitchatMessage.kt
- RoutedPacket.kt
- IdentityAnnouncement.kt

## Next Session TODO

1. Copy remaining model files and dependencies
2. Create stub implementations for bitchat-specific services
3. Add necessary Kotlin/Android dependencies to build.gradle
4. Create Phase 2 EcashMessage model
5. Begin Phase 3 BluetoothEcashService wrapper

## Notes

- The bitchat mesh networking is production-tested and battle-hardened
- Full mesh relay with source routing is implemented
- Noise protocol provides end-to-end encryption
- Store-and-forward ensures offline message delivery
- Power-aware connection management optimizes battery life
- This is a substantial integration that will require multiple sessions to complete

