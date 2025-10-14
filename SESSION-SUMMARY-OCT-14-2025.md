# Session Summary: Lightning Address Fix - October 14, 2025

## 🎯 **Quick Status**

**ISSUE:** Lightning addresses showing `user@npubcash.trailscoffee.com` instead of `user@trailscoffee.com`  
**STATUS:** ✅ Frontend fixed | 🟡 Backend ready to deploy | 🟡 Proxy ready to deploy  
**COMPLETION:** ~90% - Waiting on server-side deployments

---

## 📝 **What Happened Today**

### **Problem Identified**
Strike wallet rejecting Lightning address payments with "invalid address format"
- Root cause: Backend generating addresses with subdomain `@npubcash.trailscoffee.com`
- Lightning addresses should use root domain `@trailscoffee.com`
- Root domain not configured to proxy LNURL requests

### **Solution Implemented**
Multi-layer fix across frontend, backend, and infrastructure:

1. **Frontend defensive coding** - Automatically corrects domain
2. **Backend configuration** - Update DOMAIN env var
3. **Caddy proxy** - Root domain routes LNURL to backend
4. **Hostinger proxy** - PHP proxy for Apache-based hosting

---

## ✅ **Frontend Changes (COMPLETED)**

**Repository:** `cashu.me`

### **File Modified:** `src/stores/trailsIdentity.ts`

**Line ~156 - Lightning Address Getter:**
```typescript
get lightningAddress(): string | undefined {
  let address = this.profile?.lightningAddress;
  // Defensive: always correct domain to root domain
  if (address && address.includes('@npubcash.trailscoffee.com')) {
    address = address.replace('@npubcash.trailscoffee.com', '@trailscoffee.com');
  }
  return address || (this.registered ? `${this.shortNpub}@trailscoffee.com` : undefined);
}
```

**Line ~180 - Registration Response Handler:**
```typescript
if (response.data.success) {
  // Fix Lightning address to use root domain (not subdomain)
  let lightningAddress = response.data.lightningAddress;
  if (lightningAddress && lightningAddress.includes('@npubcash.trailscoffee.com')) {
    lightningAddress = lightningAddress.replace('@npubcash.trailscoffee.com', '@trailscoffee.com');
  }
  
  this.profile = {
    ...this.profile,
    npub: npub,
    lightningAddress: lightningAddress || `${this.shortNpub}@trailscoffee.com`,
    nip05: response.data.nip05 || `${this.shortNpub}@trailscoffee.com`,
    registered: true,
    registeredAt: Date.now(),
  } as TrailsIdentityProfile;
}
```

**Status:** ✅ Committed & pushed to GitHub

---

## 🔧 **Backend Changes (PENDING DEPLOYMENT)**

**Server:** VPS at 203.161.49.19  
**Domain:** `npubcash.trailscoffee.com`  
**Repository:** `npubcash-server`

### **Changes Ready (4 commits):**
1. LND integration (11 files)
2. Lightning address config (3 files)
3. Proxied setup guide (2 files)
4. LND TLS fix (1 file) - Critical for invoice generation

### **Required Actions:**

**1. Push to GitHub:**
```bash
cd /home/ln/git/npubcash-server
git push origin main
```

**2. Update Environment:**
```bash
cd /home/ln/npubcash-server
nano .env

# Change this line:
DOMAIN=npubcash.trailscoffee.com
# To:
DOMAIN=trailscoffee.com
```

**3. Update Database:**
```sql
-- Connect to PostgreSQL
psql -U npubcash -d npubcash

-- Update existing Lightning addresses
UPDATE users 
SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com')
WHERE lightning_address LIKE '%@npubcash.trailscoffee.com';

-- Verify
SELECT npub, lightning_address FROM users;
```

**4. Restart Service:**
```bash
pm2 restart npubcash-server
pm2 logs npubcash-server --lines 50
```

---

## 🌐 **Caddy Configuration (PENDING DEPLOYMENT)**

**Server:** VPS at 203.161.49.19  
**File:** `/etc/caddy/Caddyfile`

### **Add Root Domain Block:**

```caddy
trailscoffee.com {
    # Proxy Lightning address LNURL requests to backend
    handle /.well-known/lnurlp/* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    # Proxy Nostr verification (optional)
    handle /.well-known/nostr.json* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    # Everything else redirects to PWA
    handle {
        redir https://points.trailscoffee.com{uri} permanent
    }
}

npubcash.trailscoffee.com {
    reverse_proxy localhost:3000
    header Access-Control-Allow-Origin *
}
```

### **Deploy:**
```bash
sudo nano /etc/caddy/Caddyfile
# Add the block above
sudo systemctl reload caddy
sudo systemctl status caddy
```

**Why This Works:**
- Root domain (`trailscoffee.com`) proxies LNURL paths to backend
- All other traffic redirects to PWA
- Backend subdomain still accessible for API calls

---

## 📄 **Hostinger Proxy (ALTERNATIVE/BACKUP)**

**Repository:** `trails_landing`  
**Hosting:** Hostinger (Apache)  
**Purpose:** PHP-based proxy if Caddy not available

### **Files Created:**

**`public_html/.well-known/lnurlp/index.php`**
```php
<?php
header('Content-Type: application/json');

$proxy_username = $_GET['user'] ?? null;

if (!$proxy_username) {
    echo json_encode(['status' => 'ERROR', 'reason' => 'Username required']);
    exit();
}

$backend_url = 'https://npubcash.trailscoffee.com/.well-known/lnurlp/' . urlencode($proxy_username);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $backend_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$backend_response = curl_exec($ch);
curl_close($ch);

echo $backend_response;
?>
```

**`public_html/.htaccess`** (add Lightning address routing)
```apache
RewriteEngine On

# Lightning Address LNURL proxy
RewriteRule ^\.well-known/lnurlp/([^/]+)/?$ /.well-known/lnurlp/index.php?user=$1 [L,QSA]
```

**Status:** ✅ Committed & pushed to GitHub - Ready to deploy

---

## 🧪 **Testing Guide**

### **Important: Backend Validates Users**

The backend correctly returns 404 for:
- Invalid npub formats (e.g., "test")
- Unregistered usernames

Valid responses require:
- Valid npub format, OR
- Registered username in database

### **Test Sequence:**

```bash
# 1. Get a valid npub (from PWA after registration)
# Look for: npub1abc... format

# 2. Test direct backend
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/VALID_NPUB

# 3. Test through root domain
curl https://trailscoffee.com/.well-known/lnurlp/VALID_NPUB

# 4. Test with registered username
curl https://trailscoffee.com/.well-known/lnurlp/YOUR_SHORT_NPUB
```

### **Expected Success Response:**
```json
{
  "callback": "https://npubcash.trailscoffee.com/api/v1/lnurlp/callback/USER",
  "maxSendable": 100000000,
  "minSendable": 1000,
  "metadata": "[[\"text/identifier\",\"USER@trailscoffee.com\"]]",
  "tag": "payRequest"
}
```

### **End-to-End Test:**
1. Open PWA: https://points.trailscoffee.com
2. Create/restore wallet
3. Verify Lightning address shows `@trailscoffee.com`
4. Copy Lightning address
5. Send payment from Strike/Zeus/Phoenix
6. Verify invoice received
7. Check payment appears in wallet

---

## 📚 **Documentation Created**

All files in `cashu.me/` repository:

1. **`HOTFIX-LIGHTNING-ADDRESS-DOMAIN.md`** - Frontend fix details
2. **`FIX-LIGHTNING-ADDRESS.md`** - Comprehensive debugging guide
3. **`CADDY-LIGHTNING-ADDRESS-SETUP.md`** - Caddy config guide
4. **`diagnose-lightning.sh`** - Automated diagnostic script
5. **`SESSION-SUMMARY-OCT-14-2025.md`** - This document

In `trails_landing/` repository:

1. **`LIGHTNING-ADDRESS-HOSTINGER-SETUP.md`** - Hostinger setup guide
2. **`SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md`** - Detailed session notes

---

## 🎯 **Tomorrow's Action Plan**

### **Priority 1: Backend Deployment** (15 min)
1. ✅ Push npubcash-server changes to GitHub
2. ✅ Update `.env` with `DOMAIN=trailscoffee.com`
3. ✅ Update database Lightning addresses
4. ✅ Restart pm2 service
5. ✅ Test with valid npub locally

### **Priority 2: Caddy Configuration** (5 min)
1. ✅ Add trailscoffee.com block to Caddyfile
2. ✅ Reload Caddy
3. ✅ Test root domain LNURL endpoint

### **Priority 3: End-to-End Testing** (10 min)
1. ✅ Test backend directly
2. ✅ Test through root domain
3. ✅ Test from Strike wallet
4. ✅ Verify invoice generation
5. ✅ Confirm payment received

### **Optional: Hostinger Backup** (if Caddy fails)
1. ⚪ Deploy PHP proxy to Hostinger
2. ⚪ Test Hostinger proxy
3. ⚪ Switch DNS if needed

---

## 🔗 **Quick Links**

| Service | URL | Status |
|---------|-----|--------|
| PWA | https://points.trailscoffee.com | ✅ Live |
| Backend API | https://npubcash.trailscoffee.com | ✅ Live |
| Main Site | https://trailscoffee.com | ✅ Live |
| Cashu Mint | https://ecash.trailscoffee.com | ✅ Live |
| Frontend Repo | https://github.com/jpgaviria2/cashu.me | ✅ |
| Hostinger Repo | https://github.com/jpgaviria2/trails_landing | ✅ |

---

## 💡 **Key Insights**

1. **Multi-layer defense:** Frontend corrects domain even if backend wrong
2. **Backend validation:** 404 for invalid users is correct behavior
3. **Root domain crucial:** Lightning addresses must use root, not subdomain
4. **Caddy preferred:** Simpler than PHP proxy, handles SSL automatically
5. **Test with real data:** "test" user won't work, need valid npub

---

## 🚀 **System Architecture**

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

## ✅ **Agent Resume Checklist**

For tomorrow's agent:

- [ ] Read this document first
- [ ] Check if backend changes were pushed
- [ ] Verify `.env` domain updated on server
- [ ] Confirm database addresses updated
- [ ] Check Caddy configuration deployed
- [ ] Test backend with valid npub
- [ ] Test root domain LNURL endpoint
- [ ] Perform end-to-end payment test
- [ ] Update this document with results

---

## 📊 **Session Statistics**

- **Duration:** ~3 hours
- **Repositories:** 2 (cashu.me, trails_landing)
- **Files Modified:** 8
- **Documentation Created:** 7 documents
- **Issue:** Lightning address domain mismatch
- **Resolution:** Multi-layer fix (frontend, backend, proxy)
- **Completion:** 90% (pending server deployment)
- **ETA to Full Production:** 30 minutes

---

**Generated:** October 14, 2025  
**Next Session:** October 15, 2025  
**Status:** 🟡 Ready for deployment  
**Agent Handoff:** ✅ Complete



