# Trails Coffee Rewards - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S PHONE (PWA)                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Onboarding  │  │   Identity   │  │    Wallet    │        │
│  │    Flow      │→ │   (npub)     │→ │   (Cashu)    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Bluetooth   │  │     NFC      │  │  Lightning   │        │
│  │    Mesh      │  │   Boltcard   │  │   Address    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVICES                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  npubcash-server │  │  boltcard-nwc    │  │  Cashu Mint  │ │
│  │  (Node/TS)       │  │  (Next.js)       │  │  (Rust CDK)  │ │
│  │                  │  │                  │  │              │ │
│  │ • Lightning Addr │  │ • Card Auth      │  │ • Mint Token │ │
│  │ • Token Custody  │  │ • Spend Limits   │  │ • Melt Token │ │
│  │ • NIP-05         │  │ • Transaction Log│  │ • Validate   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┴─────────────────────┘         │
│                                 │                               │
└─────────────────────────────────┼───────────────────────────────┘
                                  │
                                  ↓
                    ┌──────────────────────────┐
                    │   Lightning Network      │
                    │   (CLN / LND / LNbits)   │
                    └──────────────────────────┘
```

## Data Flow: User Onboarding

```
1. User Opens App
   │
   ↓
2. App.vue checks onboardingComplete
   │
   ↓ (false)
3. Redirect to /onboarding
   │
   ↓
4. User clicks "Get Started"
   │
   ↓
5. Generate BIP39 mnemonic (12 words)
   │
   ↓
6. Derive Nostr keypair from seed
   │  (first 32 bytes of seed)
   │
   ↓
7. npub = nip19.encode(pubkey)
   │
   ↓
8. Register with npubcash-server
   │  POST /api/register
   │  { npub, pubkey }
   │
   ↓
9. Server creates Lightning address
   │  npub1abc...@trailscoffee.com
   │
   ↓
10. Store profile locally
    │  { npub, lightningAddress, registered: true }
    │
    ↓
11. Show success screen
    │  "Your Lightning address: ..."
    │
    ↓
12. User continues to wallet
    │
    ↓
13. onboardingComplete = true
```

## Data Flow: Receiving Payment

```
Someone sends to: npub1abc...@trailscoffee.com
   │
   ↓
1. LNURL-pay request
   │  GET /.well-known/lnurlp/npub1abc...
   │
   ↓
2. npubcash-server returns callback
   │  { callback, minSendable, maxSendable }
   │
   ↓
3. Sender's wallet calls callback
   │  GET /callback?amount=1000
   │
   ↓
4. npubcash-server requests mint quote
   │  POST mint.trailscoffee.com/v1/mint/quote
   │
   ↓
5. Mint returns Lightning invoice
   │  { quote, request: "lnbc..." }
   │
   ↓
6. npubcash-server returns invoice
   │  { pr: "lnbc..." }
   │
   ↓
7. Sender pays invoice
   │  Lightning payment
   │
   ↓
8. Mint receives payment
   │  Invoice marked as PAID
   │
   ↓
9. npubcash-server mints tokens
   │  POST mint.trailscoffee.com/v1/mint/bolt11
   │  Returns: Cashu proofs
   │
   ↓
10. Store tokens in database
    │  pending_tokens table
    │  { npub, tokens, claimed: false }
    │
    ↓
11. User opens app
    │  App.vue → claimPendingEcash()
    │
    ↓
12. GET /api/claim?pubkey=...
    │  Returns: [token1, token2, ...]
    │
    ↓
13. PWA redeems tokens
    │  walletStore.redeem()
    │
    ↓
14. Tokens added to wallet
    │  User sees balance increase
```

## Data Flow: Bluetooth Mesh Payment

```
User A wants to send to User B (nearby)
   │
   ↓
1. User A enables Bluetooth mesh
   │  BluetoothMesh.start()
   │
   ↓
2. Discover nearby peers
   │  BLE scanning
   │  Find User B's device
   │
   ↓
3. User A selects amount
   │  "Send 100 sats to User B"
   │
   ↓
4. Create Cashu token
   │  walletStore.send(amount)
   │  Returns: sendProofs
   │
   ↓
5. Serialize token
   │  cashuAbc123... (base64)
   │
   ↓
6. Send via Bluetooth mesh
   │  BluetoothMesh.sendToken({ token, recipient: B })
   │
   ↓
7. BLE packet transmission
   │  May hop through intermediary devices
   │  Encrypted with Noise Protocol
   │
   ↓
8. User B receives packet
   │  'tokenReceived' event
   │
   ↓
9. Auto-redeem token
   │  walletStore.redeem()
   │
   ↓
10. User B sees balance increase
    │  Notification: "Received 100 sats via Bluetooth!"
```

## Data Flow: Boltcard Payment

```
User taps Boltcard at POS
   │
   ↓
1. NFC tag detected
   │  Phone reads NTAG424 DNA
   │
   ↓
2. Extract card data
   │  { uid, counter, signature }
   │
   ↓
3. Authenticate with backend
   │  POST cards.trailscoffee.com/api/auth
   │  { uid, counter, signature }
   │
   ↓
4. Backend validates signature
   │  NTAG424 cryptographic auth
   │  Check counter (replay protection)
   │
   ↓
5. Check spend limits
   │  Daily limit: 10,000 sats
   │  Per-tx limit: 1,000 sats
   │  Current tx: 500 sats ✓
   │
   ↓
6. Authorization granted
   │  { authorized: true, amount: 500 }
   │
   ↓
7. PWA spends Cashu tokens
   │  walletStore.send(amount, invalidate: true)
   │
   ↓
8. Log transaction
   │  POST /api/transactions
   │  { cardId, amount, proofs, timestamp }
   │
   ↓
9. Update spend limits
   │  dailySpent += 500
   │
   ↓
10. Show success
    │  "Paid 500 sats with Boltcard!"
```

## Security Architecture

### Identity Security

```
┌─────────────────────────────────────┐
│  BIP39 Mnemonic (12 words)          │
│  Stored: localStorage (encrypted)   │
│  Backup: Optional social/manual     │
└─────────────────────────────────────┘
              │
              ↓ (BIP39 → seed)
┌─────────────────────────────────────┐
│  Seed (64 bytes)                    │
│  Derived: mnemonicToSeedSync()      │
└─────────────────────────────────────┘
              │
              ↓ (first 32 bytes)
┌─────────────────────────────────────┐
│  Nostr Private Key                  │
│  Used for: Signing, encryption      │
└─────────────────────────────────────┘
              │
              ↓ (secp256k1)
┌─────────────────────────────────────┐
│  Nostr Public Key (npub)            │
│  Shared: Lightning address, NIP-05  │
└─────────────────────────────────────┘
```

### Token Security

```
Cashu Token (ecash)
   │
   ├─ Blinded Signature (mint)
   │  └─ Prevents mint from tracking
   │
   ├─ Deterministic Secrets (NUT-13)
   │  └─ Derived from wallet seed
   │
   ├─ P2PK Locks (optional)
   │  └─ Lock to specific pubkey
   │
   └─ DLEQ Proofs (NUT-12)
      └─ Verify mint signed correctly
```

### Communication Security

```
PWA ←→ Backend
   │
   ├─ HTTPS (TLS 1.3)
   │  └─ All API calls encrypted
   │
   ├─ WebSocket (WSS)
   │  └─ Real-time updates
   │
   └─ Nostr (NIP-17)
      └─ Gift-wrapped DMs

Bluetooth Mesh
   │
   └─ Noise Protocol
      ├─ XX handshake pattern
      ├─ Forward secrecy
      └─ Authenticated encryption

NFC Boltcard
   │
   └─ NTAG424 DNA
      ├─ AES-128 encryption
      ├─ CMAC authentication
      └─ Counter (replay protection)
```

## Database Schema

### npubcash-server (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    npub TEXT UNIQUE NOT NULL,
    pubkey TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    lightning_address TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pending tokens table
CREATE TABLE pending_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token TEXT NOT NULL,
    amount INTEGER NOT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    claimed_at TIMESTAMP
);

-- Transaction log
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL, -- 'receive' | 'claim'
    amount INTEGER NOT NULL,
    token TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### boltcard-nwc (PostgreSQL via Prisma)

```prisma
model Card {
  id            String   @id @default(cuid())
  uid           String   @unique
  name          String?
  npub          String
  authKey       String
  dailyLimit    Int      @default(10000)
  perTxLimit    Int      @default(1000)
  dailySpent    Int      @default(0)
  lastResetDate DateTime @default(now())
  active        Boolean  @default(true)
  transactions  Transaction[]
  createdAt     DateTime @default(now())
}

model Transaction {
  id        String   @id @default(cuid())
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id])
  amount    Int
  type      String   // 'payment' | 'receive'
  proofs    Json?
  createdAt DateTime @default(now())
}
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                           │
│                     (DNS + CDN + DDoS)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ↓           ↓           ↓
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │   PWA    │  │ npubcash │  │ boltcard │
        │ (Static) │  │  server  │  │   -nwc   │
        └──────────┘  └──────────┘  └──────────┘
                            │           │
                            └─────┬─────┘
                                  │
                                  ↓
                        ┌──────────────────┐
                        │   Cashu Mint     │
                        │   (CDK Rust)     │
                        └──────────────────┘
                                  │
                                  ↓
                        ┌──────────────────┐
                        │  Lightning Node  │
                        │  (CLN / LND)     │
                        └──────────────────┘
```

## Technology Stack

### Frontend (PWA)
- **Framework**: Vue 3 + Quasar
- **State**: Pinia stores
- **Storage**: IndexedDB (Dexie) + localStorage
- **Crypto**: @cashu/cashu-ts, @noble/secp256k1
- **Nostr**: @nostr-dev-kit/ndk, nostr-tools
- **Mobile**: Capacitor (iOS/Android)

### Backend Services
- **npubcash-server**: Node.js + TypeScript + Express
- **boltcard-nwc**: Next.js + Prisma + TypeScript
- **Cashu Mint**: Rust (CDK) + Axum

### Infrastructure
- **Web Server**: Nginx
- **Database**: PostgreSQL 15
- **SSL**: Let's Encrypt (Certbot)
- **Monitoring**: PM2 + logs

### Mobile Plugins
- **Bluetooth**: Capacitor plugin (Swift/Kotlin)
- **NFC**: Capacitor plugin (CoreNFC/Android NFC)
- **Biometrics**: @capacitor/biometric-auth

## Performance Considerations

### PWA Optimization
- Service Worker caching
- Code splitting by route
- Lazy loading components
- Image optimization
- Gzip compression

### Backend Optimization
- Connection pooling (PostgreSQL)
- Redis caching (optional)
- Rate limiting
- CDN for static assets
- WebSocket for real-time

### Mobile Optimization
- Battery-aware BLE duty cycling
- Background task limits
- Efficient NFC polling
- Local-first data sync

## Scalability

### Current (MVP)
- **Users**: 1,000-10,000
- **Transactions**: 100-1,000/day
- **Infrastructure**: Single VPS ($50/month)

### Growth (6-12 months)
- **Users**: 10,000-100,000
- **Transactions**: 1,000-10,000/day
- **Infrastructure**: Load balanced ($200-500/month)

### Scale (1-2 years)
- **Users**: 100,000+
- **Transactions**: 10,000+/day
- **Infrastructure**: Kubernetes cluster ($1,000+/month)

## Monitoring & Observability

### Metrics to Track
- User registrations/day
- Lightning address activations
- Pending token claims
- Boltcard transactions
- Bluetooth mesh transfers
- Error rates
- Response times

### Logging
- Application logs (PM2)
- Nginx access logs
- PostgreSQL query logs
- Error tracking (Sentry optional)

### Alerts
- Service down
- Database connection errors
- High error rate
- Pending tokens not claimed (>24h)
- Spend limit violations

## Disaster Recovery

### Backups
- **Database**: Daily automated backups
- **User data**: Encrypted, retained 30 days
- **Logs**: Retained 7 days

### Recovery Procedures
1. Database restore from backup
2. Redeploy services from git
3. Verify Lightning node connectivity
4. Test end-to-end flows

### User Recovery
- Social backup (encrypted to contacts)
- Manual seed backup (optional)
- New account (for small balances)

---

Ready to build the future of loyalty rewards! ☕⚡





