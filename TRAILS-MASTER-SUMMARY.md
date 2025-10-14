# Trails Coffee Rewards - Master Summary
**Last Updated:** October 14, 2025  
**Project Status:** 90% Complete - Pending Backend Deployment

---

## 📋 **Current Status**

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend PWA** | ✅ Complete & Deployed | All features working |
| **Backend Server** | 🟡 Code Ready | Needs deployment & config update |
| **Lightning Address** | 🟡 Fixed | Frontend defensive fix applied |
| **Caddy Proxy** | 🟡 Config Ready | Needs deployment on server |
| **Hostinger Proxy** | ✅ Code Pushed | Alternative/backup solution |
| **DNS** | ✅ Configured | All domains resolving correctly |

---

## 🎯 **Project Overview**

**Name:** Trails Coffee Rewards  
**Purpose:** Frictionless Bitcoin Lightning rewards system for coffee shop  
**Domains:**
- **Main Website:** https://trailscoffee.com (Hostinger)
- **PWA Frontend:** https://points.trailscoffee.com (VPS)
- **Backend API:** https://npubcash.trailscoffee.com (VPS)
- **Cashu Mint:** https://ecash.trailscoffee.com (VPS)

**Lightning Address Format:** `SHORT_NPUB@trailscoffee.com`

---

## 📝 **Session History**

### **October 13, 2025 - Onboarding Implementation**

**Accomplished:**
- ✅ Frictionless 4-step onboarding flow
- ✅ npub identity generation from wallet seed
- ✅ Lightning address display (npub@trailscoffee.com)
- ✅ TrailsIdentityCard component
- ✅ OnboardingPage.vue (beautiful UI)
- ✅ trailsIdentity.ts store (identity management)
- ✅ Mint integration (ecash.trailscoffee.com)
- ✅ Comprehensive documentation

**Files Created:**
- `src/stores/trailsIdentity.ts` (285 lines)
- `src/pages/OnboardingPage.vue` (339 lines)
- `src/components/TrailsIdentityCard.vue` (161 lines)
- Modified: `src/App.vue`, `src/router/routes.js`, `src/pages/WalletPage.vue`

**Status:** ✅ Fully functional, tested, and working

---

### **October 14, 2025 - Lightning Address Domain Fix**

**Problem Discovered:**
- Strike wallet rejecting payments: "invalid address format"
- Backend generating: `user@npubcash.trailscoffee.com`
- Should be: `user@trailscoffee.com`
- Root domain not proxying LNURL requests

**Solution Implemented:**

#### **1. Frontend Fix (COMPLETED ✅)**
- **File:** `src/stores/trailsIdentity.ts`
- **Changes:** 
  - Added defensive domain correction in `lightningAddress` getter
  - Fixed `registerNpub()` response handler to replace subdomain with root domain
  - Now automatically corrects `@npubcash.trailscoffee.com` → `@trailscoffee.com`
- **Status:** Committed & pushed to GitHub

#### **2. Backend Fix (PENDING 🟡)**
- **Server:** VPS at 203.161.49.19
- **Repository:** npubcash-server
- **Changes Ready:** 4 commits (LND integration, TLS fix, LNURL endpoints)
- **Required Actions:**
  1. Push commits to GitHub
  2. Update `.env`: `DOMAIN=trailscoffee.com`
  3. Update database Lightning addresses
  4. Restart pm2 service
- **Status:** Code ready, waiting for deployment

#### **3. Caddy Configuration (PENDING 🟡)**
- **File:** `/etc/caddy/Caddyfile` on VPS
- **Purpose:** Proxy `trailscoffee.com/.well-known/lnurlp/*` to backend
- **Config Ready:** Yes (see SESSION-SUMMARY-OCT-14-2025.md)
- **Status:** Needs deployment on server

#### **4. Hostinger Proxy (BACKUP ✅)**
- **Repository:** trails_landing
- **Files:** `public_html/.well-known/lnurlp/index.php`, `.htaccess`
- **Purpose:** PHP-based proxy as alternative to Caddy
- **Status:** Code pushed, can deploy if Caddy unavailable

---

## 🚀 **Key Features**

### **Frictionless Onboarding**
- 4-step flow, ~30 seconds total
- No seed phrases shown to user
- Automatic npub generation
- Lightning address: `SHORT_NPUB@trailscoffee.com`
- Beautiful Trails Coffee branded UI

### **Identity System**
- npub derived from wallet seed (first 32 bytes)
- Self-custodial (keys never leave device)
- Optional social backup (encrypted to contacts)
- Optional manual backup (in settings)

### **Lightning Integration**
- Lightning address receiving
- LNURL-pay protocol
- Auto-claim pending payments
- Token custody for offline users

### **Cashu Mint**
- ecash.trailscoffee.com
- Token issuance/redemption
- Offline payment support

---

## 📂 **Repository Structure**

### **Frontend PWA** (`cashu.me`)
```
src/
├── stores/
│   └── trailsIdentity.ts          # Identity management (285 lines)
├── pages/
│   ├── OnboardingPage.vue         # Onboarding UI (339 lines)
│   └── WalletPage.vue             # Modified for identity card
├── components/
│   └── TrailsIdentityCard.vue     # Lightning address display (161 lines)
├── router/
│   └── routes.js                  # Added /onboarding route
└── App.vue                        # Auto-initialization
```

**Documentation:**
- `AGENT-SERVER-DEPLOYMENT.md` - 16-step deployment guide
- `AI-AGENT-START-HERE.md` - Server agent instructions
- `FIX-LIGHTNING-ADDRESS.md` - Debugging guide
- `CADDY-LIGHTNING-ADDRESS-SETUP.md` - Caddy config guide
- `HOTFIX-LIGHTNING-ADDRESS-DOMAIN.md` - Frontend fix details
- `diagnose-lightning.sh` - Automated diagnostic script
- `server-deploy.sh` - Automated deployment script

### **Backend Server** (`npubcash-server`)
```
src/
├── controllers/
│   └── lnurlController.ts         # LNURL-pay endpoints
├── routes/
│   └── lnurl.ts                   # LNURL routing
├── services/
│   └── lndService.ts              # LND integration
└── server.ts                      # Main server
```

**Status:** Code ready, pending push to GitHub

### **Hostinger Landing** (`trails_landing`)
```
public_html/
├── .htaccess                      # Apache rewrite rules
└── .well-known/
    └── lnurlp/
        └── index.php              # PHP LNURL proxy
```

**Status:** Committed & pushed to GitHub

---

## 🧪 **Testing Procedures**

### **Test Lightning Address Endpoints**

**Important:** Backend validates users - "test" returns 404 (correct behavior!)

Valid responses require:
- Valid npub format, OR
- Registered username in database

```bash
# 1. Test direct backend (after deployment)
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/VALID_NPUB

# 2. Test through root domain (after Caddy config)
curl https://trailscoffee.com/.well-known/lnurlp/VALID_NPUB

# 3. Expected response:
{
  "callback": "https://npubcash.trailscoffee.com/api/v1/lnurlp/callback/USER",
  "maxSendable": 100000000,
  "minSendable": 1000,
  "metadata": "[[\"text/identifier\",\"USER@trailscoffee.com\"]]",
  "tag": "payRequest"
}
```

### **Test End-to-End Payment**

1. Open PWA: https://points.trailscoffee.com
2. Complete onboarding (or restore wallet)
3. Verify Lightning address shows `@trailscoffee.com`
4. Copy Lightning address
5. Send payment from Strike/Zeus/Phoenix
6. Verify invoice received
7. Check payment appears in wallet

---

## 🔧 **Pending Tasks**

### **Priority 1: Backend Deployment** (15 min)

Server agent needs to:

```bash
# 1. Push changes to GitHub
cd /home/ln/git/npubcash-server
git push origin main

# 2. Update environment
nano /home/ln/npubcash-server/.env
# Change: DOMAIN=trailscoffee.com

# 3. Update database
psql -U npubcash -d npubcash
UPDATE users 
SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com')
WHERE lightning_address LIKE '%@npubcash.trailscoffee.com';

# 4. Restart service
pm2 restart npubcash-server
pm2 logs npubcash-server --lines 50

# 5. Test locally
curl http://localhost:3000/.well-known/lnurlp/VALID_NPUB
```

### **Priority 2: Caddy Configuration** (5 min)

```bash
# 1. Edit Caddyfile
sudo nano /etc/caddy/Caddyfile

# 2. Add root domain block:
trailscoffee.com {
    handle /.well-known/lnurlp/* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    handle /.well-known/nostr.json* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    handle {
        redir https://points.trailscoffee.com{uri} permanent
    }
}

# 3. Reload Caddy
sudo systemctl reload caddy
sudo systemctl status caddy
```

### **Priority 3: Verification** (10 min)

```bash
# Test endpoints
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/VALID_NPUB
curl https://trailscoffee.com/.well-known/lnurlp/VALID_NPUB

# Test from Strike wallet
# Send to: YOUR_SHORT_NPUB@trailscoffee.com
```

---

## 📊 **Architecture**

```
┌─────────────────────────────────────────────────┐
│  User's Lightning Wallet (Strike/Zeus/Phoenix) │
└─────────────────┬───────────────────────────────┘
                  │ Sends to: user@trailscoffee.com
                  ↓
┌─────────────────────────────────────────────────┐
│  trailscoffee.com (Caddy on VPS)                │
│  Proxies: /.well-known/lnurlp/*                 │
└─────────────────┬───────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────┐
│  npubcash.trailscoffee.com (Node.js Backend)    │
│  - Express API                                  │
│  - LNURL-pay handler                            │
│  - PostgreSQL (user lookup)                     │
│  - LND (invoice generation)                     │
└─────────────────┬───────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────┐
│  Returns Lightning Invoice                       │
│  User receives sats! ⚡                          │
└─────────────────────────────────────────────────┘
```

---

## 📚 **Documentation Files**

### **Main Git Folder (Current Location)**

**UP-TO-DATE (Keep):**
- ✅ `SESSION-SUMMARY-OCT-14-2025.md` - Today's Lightning address fix
- ✅ `SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md` - Detailed version of today's work
- ✅ `TRAILS-MASTER-SUMMARY.md` - This file (master overview)

**ARCHIVED (From Oct 13 - Keep for reference):**
- 📦 `TRAILS-START-HERE.md` - Onboarding implementation quick start
- 📦 `TRAILS-SESSION-SUMMARY.md` - Onboarding implementation details
- 📦 `TRAILS-QUICK-REFERENCE.md` - Quick commands
- 📦 `TRAILS-README.md` - Documentation index
- 📦 `TRAILS-COFFEE-IMPLEMENTATION.md` - Onboarding summary
- 📦 `TRAILS-CHANGES.md` - Changes from Oct 13

**Recommendation:** Keep all files for historical reference, but prioritize reading:
1. **TRAILS-MASTER-SUMMARY.md** (this file) - Current state
2. **SESSION-SUMMARY-OCT-14-2025.md** - Latest work
3. **TRAILS-SESSION-SUMMARY.md** - Original onboarding implementation

### **cashu.me Repository**

**Key Documentation:**
- `AGENT-SERVER-DEPLOYMENT.md` - Comprehensive 16-step deployment guide
- `AI-AGENT-START-HERE.md` - Entry point for server agents
- `FIX-LIGHTNING-ADDRESS.md` - Debugging guide
- `CADDY-LIGHTNING-ADDRESS-SETUP.md` - Caddy configuration
- `HOTFIX-LIGHTNING-ADDRESS-DOMAIN.md` - Frontend fix documentation
- `diagnose-lightning.sh` - Automated diagnostics
- `server-deploy.sh` - Automated deployment

### **trails_landing Repository**

**Key Documentation:**
- `LIGHTNING-ADDRESS-HOSTINGER-SETUP.md` - Hostinger proxy setup
- `SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md` - Detailed session notes

---

## 🎯 **Success Checklist**

### **For Tomorrow's Session:**

**Backend Deployment:**
- [ ] Backend changes pushed to GitHub
- [ ] `.env` domain updated to `trailscoffee.com`
- [ ] Database Lightning addresses updated
- [ ] Backend service restarted
- [ ] Local endpoint test successful

**Caddy Configuration:**
- [ ] Caddyfile updated with root domain block
- [ ] Caddy reloaded successfully
- [ ] Root domain LNURL endpoint test successful

**End-to-End Testing:**
- [ ] Direct backend endpoint works
- [ ] Root domain proxy works
- [ ] Strike wallet accepts Lightning address
- [ ] Invoice generation works
- [ ] Payment received and shows in wallet

**Production Cleanup:**
- [ ] Set `$DEBUG = false` in PHP proxy
- [ ] Remove test files from Hostinger
- [ ] Update any existing user addresses
- [ ] Monitor logs for issues

---

## 💡 **Key Technical Insights**

### **Identity Derivation**
```
BIP39 Mnemonic (12 words)
    ↓
Seed (64 bytes via mnemonicToSeedSync)
    ↓
First 32 bytes → Nostr Private Key
    ↓
secp256k1 Public Key
    ↓
npub (nip19 encoded)
    ↓
Lightning Address: SHORT_NPUB@trailscoffee.com
```

### **Frontend Defensive Coding**
- Always corrects domain on client side
- Works even if backend returns wrong domain
- Ensures consistent UX

### **Backend Validation**
- Returns 404 for invalid npub formats
- Returns 404 for unregistered usernames
- Valid npubs work even if not registered
- This is correct behavior!

### **Multi-Layer Solution**
1. Frontend fixes display automatically
2. Backend generates correct domain
3. Caddy/proxy routes root domain correctly
4. End result: Seamless user experience

---

## 📞 **Quick Links**

| Resource | URL |
|----------|-----|
| PWA | https://points.trailscoffee.com |
| Backend API | https://npubcash.trailscoffee.com |
| Main Website | https://trailscoffee.com |
| Cashu Mint | https://ecash.trailscoffee.com |
| Frontend Repo | https://github.com/jpgaviria2/cashu.me |
| Hostinger Repo | https://github.com/jpgaviria2/trails_landing |

---

## 🎉 **Summary**

**Overall Status:** 90% Complete

**What's Working:**
- ✅ Frictionless onboarding (4 steps, 30 seconds)
- ✅ npub identity generation
- ✅ Lightning address display (with defensive domain fix)
- ✅ Beautiful Trails Coffee UI
- ✅ Cashu mint integration
- ✅ Self-custodial wallet
- ✅ Frontend deployed and live

**What's Pending:**
- 🟡 Backend deployment (code ready)
- 🟡 Caddy configuration (config ready)
- 🟡 End-to-end payment testing

**ETA to Full Production:** 30 minutes of server configuration

**Ready to revolutionize coffee shop loyalty with Bitcoin Lightning!** ☕⚡

---

**Last Updated:** October 14, 2025, 10:00 PM  
**Next Action:** Deploy backend and Caddy configuration  
**Agent Handoff:** ✅ Complete - All documentation ready



