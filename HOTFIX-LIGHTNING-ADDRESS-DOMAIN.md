# HOTFIX: Lightning Address Domain Issue

**Problem**: Lightning addresses showing `@npubcash.trailscoffee.com` instead of `@trailscoffee.com`

**Root Cause**: Backend `.env` file has wrong `DOMAIN` configuration

---

## ✅ **Frontend Fix (Already Applied)**

The PWA now automatically corrects the domain if the backend returns the wrong one.

**What changed in `src/stores/trailsIdentity.ts`:**
```typescript
// Added domain correction after backend registration
let lightningAddress = response.data.lightningAddress;
if (lightningAddress && lightningAddress.includes('@npubcash.trailscoffee.com')) {
  lightningAddress = lightningAddress.replace('@npubcash.trailscoffee.com', '@trailscoffee.com');
}
```

This is a **defensive fix** so the PWA works correctly even if the backend is misconfigured.

---

## 🔧 **Backend Fix (REQUIRED for payments to work)**

The backend **must** be configured with the root domain, not the subdomain.

### **On the Server:**

```bash
# 1. Edit the .env file
cd /var/www/npubcash-server
nano .env

# 2. Change this line:
DOMAIN=npubcash.trailscoffee.com   ❌ WRONG

# To this:
DOMAIN=trailscoffee.com            ✅ CORRECT

# 3. Update existing users in database
sudo -u postgres psql -d npubcash << 'EOF'
UPDATE users 
SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com');
EOF

# 4. Rebuild and restart backend
npm run build
pm2 restart npubcash-server

# 5. Verify
sudo -u postgres psql -d npubcash -c "SELECT lightning_address FROM users LIMIT 3;"
# Should now show: npub...@trailscoffee.com
```

---

## 🎯 **Why This Matters**

Lightning addresses **must** use the **root domain** because:

1. **LNURL-pay standard**: Wallets look for `https://DOMAIN/.well-known/lnurlp/username`
2. **DNS requirement**: Root domain needs to be configured (not subdomain)
3. **Wallet compatibility**: Strike, Zeus, etc. expect standard format

**Correct flow:**
```
User: npub1abc...@trailscoffee.com
  ↓
Wallet queries: https://trailscoffee.com/.well-known/lnurlp/npub1abc...
  ↓
Nginx proxies to: http://localhost:3000/.well-known/lnurlp/npub1abc...
  ↓
Backend returns: Lightning invoice
  ↓
Payment succeeds ✅
```

**Incorrect flow (what was happening):**
```
User: npub1abc...@npubcash.trailscoffee.com
  ↓
Wallet queries: https://npubcash.trailscoffee.com/.well-known/lnurlp/npub1abc...
  ↓
404 Not Found (no Nginx config for .well-known on subdomain)
  ↓
Payment fails ❌
```

---

## 📋 **Update Checklist**

### Frontend (PWA)
- [x] Pull latest code from GitHub
- [x] Rebuild: `npm run build:pwa`
- [x] Deploy updated PWA
- [x] Clear browser cache or hard refresh
- [x] Existing users: Clear localStorage and re-register

### Backend (npubcash-server)
- [ ] Fix `DOMAIN` in `.env` file
- [ ] Update database records
- [ ] Rebuild backend
- [ ] Restart PM2 service
- [ ] Test LNURL endpoint
- [ ] Configure root domain Nginx (see FIX-LIGHTNING-ADDRESS.md)

### Testing
- [ ] New registration creates `@trailscoffee.com` address
- [ ] Existing users see corrected address in PWA
- [ ] Can send payment from Strike
- [ ] Payment generates invoice successfully
- [ ] User receives tokens

---

## 🧪 **Test Commands**

```bash
# After fixes, test on server:

# 1. Check database
sudo -u postgres psql -d npubcash -c "SELECT lightning_address FROM users LIMIT 3;"
# Should show: @trailscoffee.com

# 2. Test LNURL endpoint
curl https://trailscoffee.com/.well-known/lnurlp/$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | cut -d'@' -f1 | xargs)
# Should return: JSON with callback, maxSendable, etc.

# 3. Test in Strike
# Enter Lightning address shown in PWA
# Should work! ✅
```

---

## 🚀 **Deployment Steps**

### Step 1: Deploy Frontend Fix
```bash
# On development machine
cd C:\Users\JuanPabloGaviria\git\cashu.me
git pull origin trails-coffee-deployment
npm install
npm run build:pwa

# Deploy to server (copy dist/pwa/ to /var/www/trails-coffee/dist/pwa/)
```

### Step 2: Fix Backend Configuration
```bash
# On server
cd /var/www/npubcash-server
nano .env
# Change DOMAIN=trailscoffee.com

# Update database
sudo -u postgres psql -d npubcash -c "UPDATE users SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com');"

# Rebuild and restart
npm run build
pm2 restart npubcash-server
```

### Step 3: Test
```bash
# New user in PWA
# Should show: npub...@trailscoffee.com ✅

# Send payment from Strike
# Should work! ✅
```

---

## ⚠️ **Important Notes**

1. **Existing users**: Will need to clear localStorage and re-register, OR the frontend fix will automatically correct their addresses on next load.

2. **Database migration**: The SQL command updates all existing Lightning addresses in one go.

3. **Nginx configuration**: Make sure root domain is configured (see FIX-LIGHTNING-ADDRESS.md Step 3).

4. **DNS records**: Ensure `trailscoffee.com` points to your server.

---

## 📊 **Before/After**

### Before (Wrong ❌)
```
Lightning Address: npub1fzxkc...hwjh@npubcash.trailscoffee.com
Backend DOMAIN: npubcash.trailscoffee.com
LNURL Endpoint: https://npubcash.trailscoffee.com/.well-known/lnurlp/...
Result: Payment fails (404)
```

### After (Correct ✅)
```
Lightning Address: npub1fzxkc...hwjh@trailscoffee.com
Backend DOMAIN: trailscoffee.com
LNURL Endpoint: https://trailscoffee.com/.well-known/lnurlp/...
Result: Payment succeeds!
```

---

## 🎉 **Summary**

- **Frontend**: Fixed to auto-correct wrong domains (defensive)
- **Backend**: Needs `.env` update (root cause)
- **Database**: Needs migration to fix existing records
- **Nginx**: Needs root domain configuration
- **DNS**: Must point root domain to server

**After all fixes**, Lightning addresses will work correctly with Strike and other wallets! ⚡



