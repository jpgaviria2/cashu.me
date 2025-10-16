# Bitpoints.me

**Bitcoin-backed rewards that increase in purchasing power over time**

Bitpoints.me is an open-source wallet merging proven privacy and interoperability protocols: Cashu ecash for private bearer tokens, Nostr for decentralized identity, and Bluetooth mesh networking (from BitChat) for offline peer-to-peer transfers.

## Why Bitpoints?

### Your Rewards Appreciate Over Time
Unlike traditional points that lose value to inflation, Bitpoints are denominated in Bitcoin (sats). As Bitcoin's purchasing power increases, so do your rewards. What buys a coffee today might buy lunch tomorrow.

### Universal Interoperability
Built on open protocols, Bitpoints work with **any merchant accepting Bitcoin or Lightning**. Your rewards aren't locked to one business—spend them anywhere in the global Bitcoin economy.

### Privacy by Default
- **Cashu ecash protocol**: Bearer tokens with no transaction history  
- **No accounts or tracking**: Your spending is your business
- **Offline-capable**: Send and receive without internet via Bluetooth mesh

### Open Source, No Lock-in
Every component is open source and based on established protocols:
- [Cashu](https://github.com/cashubtc): Chaumian ecash for Bitcoin
- [Nostr](https://github.com/nostr-protocol): Decentralized identity (NIP-05, NIP-60)
- [BitChat Mesh](https://github.com/jpgaviria2/bitchat): Noise Protocol-encrypted Bluetooth mesh networking

## Key Features

### 🔒 Privacy-First Design
- Bearer tokens with no transaction history
- End-to-end Noise Protocol encryption for all mesh transfers
- Ephemeral peer IDs prevent tracking
- No personal data collection

### 📡 Bluetooth Mesh Networking (from BitChat)
- **Offline transfers**: Send/receive without internet
- **Multi-hop relay**: Reach peers up to 7 hops away  
- **Peer discovery**: Find nearby Bitpoints users automatically
- **Broadcast mode**: Send rewards to all nearby users
- **Noise Protocol encryption**: Military-grade E2E encryption
- **Battery optimized**: Adaptive duty cycling

### ⚡ Lightning Integration  
- Receive via Lightning address: `npub@youridentity.com`
- Auto-claim tokens from Lightning payments
- NIP-05 verified identity
- LNURL-pay support

### 🔐 Self-Custodial Security
- Non-custodial: You control your keys
- Social backup options (NIP-60 encrypted to trusted contacts)
- Seed phrase derived from wallet (one backup for everything)
- Open source and auditable

## Installation

### Web App (PWA)
Visit [bitpoints.me](https://bitpoints.me) on your phone and add to home screen.

### Docker (Self-hosted)
```bash
docker-compose up -d
```
Access at http://localhost:3000

### Development
```bash
npm install
quasar dev
```

## Building for Mobile

### Android
```bash
quasar build
npx cap sync android
npx cap open android
```

### iOS  
```bash
quasar build
npx cap sync ios
npx cap open ios
```

## Bluetooth Mesh Implementation

Powered by BitChat's battle-tested mesh networking (ported to Android):

**Full Android Implementation**:
- ✅ `BluetoothMeshService.kt` - Core mesh service
- ✅ `BluetoothGattClientManager.kt` - BLE client
- ✅ `BluetoothGattServerManager.kt` - BLE server
- ✅ `NoiseEncryptionService.kt` - End-to-end encryption
- ✅ `MessageHandler.kt` - Token message processing
- ✅ `PacketRelayManager.kt` - Multi-hop relay
- ✅ `PeerManager.kt` - Peer discovery and tracking

**Features**:
- Noise Protocol (XX pattern) encryption
- Multi-hop routing (up to 7 hops, TTL-based)
- Fragment assembly for large tokens
- Battery-optimized scanning/advertising
- RSSI-based peer distance estimation
- Auto-redeem incoming tokens

## Use Cases

### For Users
- **Daily Rewards**: Earn Bitcoin-backed points that appreciate
- **Peer Gifting**: Send sats to friends via Bluetooth (no internet needed)
- **Privacy**: Spend without surveillance  
- **Portability**: Use your rewards anywhere Bitcoin is accepted

### For Merchants  
- **Customer Loyalty**: Issue Bitcoin-backed rewards
- **No Lock-in**: Customers can spend rewards anywhere (builds goodwill)
- **Event Promotions**: Broadcast rewards to attendees via Bluetooth mesh
- **Offline Operation**: Accept payments even without internet

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Bitpoints PWA (Quasar/Vue)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Cashu Wallet + Nostr Identity              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Bluetooth Mesh (BluetoothEcashPlugin)            │  │
│  │  - Noise Protocol Encryption                      │  │
│  │  - Multi-hop Relay                                │  │
│  │  - Auto-redeem Tokens                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐     ┌──────────┐
    │  Cashu   │      │  Nostr   │     │  Nearby  │
    │  Mint    │      │  Relays  │     │  Peers   │
    │(Lightning)│      │(NIP-05) │     │  (BLE)   │
    └──────────┘      └──────────┘     └──────────┘
```

## Documentation

- [ABOUT.md](./ABOUT.md) - Technical deep dive and protocol merger explanation
- [BLUETOOTH_DEVELOPMENT_SUMMARY.md](./BLUETOOTH_DEVELOPMENT_SUMMARY.md) - Complete Bluetooth implementation details
- [BLUETOOTH_TESTING_GUIDE.md](./BLUETOOTH_TESTING_GUIDE.md) - Testing procedures
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

## Contributing

Bitpoints.me is open source (Apache 2.0). Contributions welcome!

## License

Apache License 2.0

## Credits

Built on the shoulders of giants:

- **Cashu Protocol**: [@callebtc](https://github.com/callebtc) and the Cashu community
- **Nostr Protocol**: [@fiatjaf](https://github.com/fiatjaf) and Nostr contributors
- **BitChat Mesh**: Noise Protocol-based Bluetooth mesh networking
- **Quasar Framework**: [@rstoenescu](https://github.com/rstoenescu)
- **Capacitor**: [@ionic-team](https://github.com/ionic-team)

---

**Bitpoints.me** - Your rewards, your Bitcoin, your privacy.
