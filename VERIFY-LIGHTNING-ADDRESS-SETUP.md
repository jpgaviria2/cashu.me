# Verify Lightning Address Setup - Complete Checklist

## 🎯 **What Should Be Configured**

Your setup should have:
- ✅ Backend `.env`: `DOMAIN=trailscoffee.com`
- ✅ Root domain (`trailscoffee.com`) proxies `.well-known/lnurlp/` to backend
- ✅ Database updated with `@trailscoffee.com` addresses
- ✅ Backend restarted

---

## ✅ **Verification Steps (Run on Server)**

### **Step 1: Check Backend Configuration**

```bash
# Check .env file
cd /var/www/npubcash-server
grep "^DOMAIN=" .env

# Expected output:
# DOMAIN=trailscoffee.com ✅
```

### **Step 2: Check Database**

```bash
# Check Lightning addresses in database
sudo -u postgres psql -d npubcash -c "SELECT lightning_address FROM users LIMIT 5;"

# Expected output:
# npub1abc...@trailscoffee.com ✅
# NOT: @npubcash.trailscoffee.com ❌
```

### **Step 3: Check Backend Service**

```bash
# Check if backend is running
pm2 status | grep npubcash-server

# Expected output:
# npubcash-server | online ✅
```

### **Step 4: Check Root Domain Configuration**

**For Caddy:**
```bash
# Check Caddyfile
sudo cat /etc/caddy/Caddyfile | grep -A 10 "trailscoffee.com {"

# Should see something like:
# trailscoffee.com {
#     handle /.well-known/lnurlp/* {
#         reverse_proxy localhost:3000
#         ...
#     }
# }
```

**For Nginx:**
```bash
# Check Nginx config
sudo cat /etc/nginx/sites-enabled/* | grep -A 10 "server_name trailscoffee.com"

# Should see:
# location /.well-known/lnurlp/ {
#     proxy_pass http://...
# }
```

### **Step 5: Test LNURL Endpoint**

```bash
# Get a test user
TEST_USER=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | cut -d'@' -f1 | xargs)

# Test the endpoint
curl -s "https://trailscoffee.com/.well-known/lnurlp/$TEST_USER" | jq .

# Expected output (JSON):
# {
#   "callback": "https://...",
#   "maxSendable": 100000000,
#   "minSendable": 1000,
#   "metadata": "...",
#   "tag": "payRequest"
# }
```

### **Step 6: Test Invoice Generation**

```bash
# Test the callback (invoice generation)
CALLBACK_URL=$(curl -s "https://trailscoffee.com/.well-known/lnurlp/$TEST_USER" | jq -r .callback)
curl -s "${CALLBACK_URL}?amount=10000" | jq .

# Expected output:
# {
#   "pr": "lnbc...",  ← Lightning invoice
#   "routes": [],
#   "successAction": {...}
# }
```

### **Step 7: Test from PWA**

```bash
# Pull latest PWA code
cd /var/www/trails-coffee
git pull origin trails-coffee-deployment

# Rebuild PWA
npm install
npm run build:pwa

# If using Caddy, it should automatically serve the new files
# If using Nginx, you may need to reload
```

---

## 🔧 **Configuration Files**

### **Option A: If Server Uses Caddy** (Recommended)

**Location:** `/etc/caddy/Caddyfile`

Add this entry for the root domain:

```caddy
# Root domain for Lightning addresses
trailscoffee.com {
    # Proxy LNURL-pay endpoints to backend
    handle /.well-known/lnurlp/* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    # Proxy Nostr NIP-05
    handle /.well-known/nostr.json* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    # Everything else redirects to PWA
    handle {
        redir https://points.trailscoffee.com{uri} permanent
    }
}

# Your existing backend config (keep as-is)
npubcash.trailscoffee.com {
    reverse_proxy localhost:3000
    header Access-Control-Allow-Origin *
}
```

**Apply:**
```bash
# Test config
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy (no downtime)
sudo systemctl reload caddy

# Check logs
sudo journalctl -u caddy -f
```

---

### **Option B: If Server Uses Nginx**

**Location:** `/etc/nginx/sites-available/trailscoffee-root`

Create this file:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name trailscoffee.com;

    # SSL certificates (certbot will add these)
    # ssl_certificate /etc/letsencrypt/live/trailscoffee.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/trailscoffee.com/privkey.pem;

    # LNURL-pay endpoint for Lightning addresses
    location /.well-known/lnurlp/ {
        # Option 1: Proxy to backend directly (faster)
        proxy_pass http://localhost:3000/.well-known/lnurlp/;
        
        # Option 2: Proxy via subdomain (if backend not on same server)
        # proxy_pass https://npubcash.trailscoffee.com/.well-known/lnurlp/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # CORS headers (required for Lightning wallets)
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
        
        # Handle OPTIONS preflight
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # NIP-05 endpoint for Nostr
    location /.well-known/nostr.json {
        proxy_pass http://localhost:3000/.well-known/nostr.json;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        add_header Access-Control-Allow-Origin * always;
    }

    # Everything else redirects to PWA
    location / {
        return 301 https://points.trailscoffee.com$request_uri;
    }
}
```

**Apply:**
```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/trailscoffee-root /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d trailscoffee.com

# Check logs
sudo tail -f /var/log/nginx/access.log
```

---

## 🎯 **Key Configuration Notes**

### **Important: Choose the Right proxy_pass**

**Option 1: Direct to localhost (RECOMMENDED)**
```nginx
proxy_pass http://localhost:3000/.well-known/lnurlp/;
```
✅ Faster (no network hop)
✅ No SSL overhead
✅ Works when backend is on same server

**Option 2: Via subdomain**
```nginx
proxy_pass https://npubcash.trailscoffee.com/.well-known/lnurlp/;
```
✅ Works when backend is on different server
⚠️ Slightly slower (extra network hop)
⚠️ SSL overhead

### **IMPORTANT: Trailing Slashes Matter!**

```nginx
# CORRECT ✅
proxy_pass http://localhost:3000/.well-known/lnurlp/;
#                                                    ^ trailing slash

# WRONG ❌
proxy_pass http://localhost:3000/.well-known/lnurlp;
#                                                   ^ no trailing slash (breaks path)
```

With trailing slash: `trailscoffee.com/.well-known/lnurlp/user` → `localhost:3000/.well-known/lnurlp/user` ✅

Without trailing slash: `trailscoffee.com/.well-known/lnurlp/user` → `localhost:3000/.well-known/lnurlpuser` ❌

---

## 🧪 **Complete Test Script**

Run this to verify everything:

```bash
#!/bin/bash

echo "=== Lightning Address Setup Verification ==="
echo ""

# 1. Check backend config
echo "1. Backend Configuration:"
cd /var/www/npubcash-server
DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2)
echo "   DOMAIN=$DOMAIN"
if [ "$DOMAIN" == "trailscoffee.com" ]; then
    echo "   ✅ Correct"
else
    echo "   ❌ Should be: trailscoffee.com"
fi
echo ""

# 2. Check database
echo "2. Database Addresses:"
ADDRESSES=$(sudo -u postgres psql -d npubcash -t -c "SELECT COUNT(*) FROM users WHERE lightning_address LIKE '%@trailscoffee.com';" | xargs)
WRONG_ADDRESSES=$(sudo -u postgres psql -d npubcash -t -c "SELECT COUNT(*) FROM users WHERE lightning_address LIKE '%@npubcash.trailscoffee.com';" | xargs)
echo "   Correct addresses: $ADDRESSES"
echo "   Wrong addresses: $WRONG_ADDRESSES"
if [ "$WRONG_ADDRESSES" -eq "0" ]; then
    echo "   ✅ All correct"
else
    echo "   ❌ Need to update database"
fi
echo ""

# 3. Check backend service
echo "3. Backend Service:"
if pm2 list | grep -q "npubcash-server.*online"; then
    echo "   ✅ Running"
else
    echo "   ❌ Not running"
fi
echo ""

# 4. Test LNURL endpoint
echo "4. LNURL Endpoint Test:"
TEST_USER=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | cut -d'@' -f1 | xargs)
if [ ! -z "$TEST_USER" ]; then
    echo "   Testing user: $TEST_USER"
    RESPONSE=$(curl -s -w "\n%{http_code}" "https://trailscoffee.com/.well-known/lnurlp/$TEST_USER")
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    echo "   HTTP Status: $HTTP_CODE"
    if [ "$HTTP_CODE" == "200" ]; then
        echo "   ✅ Endpoint responding"
        if echo "$BODY" | jq -e '.callback' > /dev/null 2>&1; then
            echo "   ✅ Valid LNURL response"
        else
            echo "   ❌ Invalid response format"
        fi
    else
        echo "   ❌ Endpoint not working"
    fi
else
    echo "   ⚠️  No users in database"
fi
echo ""

# 5. Test invoice generation
echo "5. Invoice Generation Test:"
if [ ! -z "$TEST_USER" ] && [ "$HTTP_CODE" == "200" ]; then
    CALLBACK_URL=$(echo "$BODY" | jq -r '.callback' 2>/dev/null)
    if [ ! -z "$CALLBACK_URL" ] && [ "$CALLBACK_URL" != "null" ]; then
        INVOICE_RESPONSE=$(curl -s -w "\n%{http_code}" "${CALLBACK_URL}?amount=10000")
        INVOICE_HTTP_CODE=$(echo "$INVOICE_RESPONSE" | tail -1)
        INVOICE_BODY=$(echo "$INVOICE_RESPONSE" | head -n -1)
        
        echo "   HTTP Status: $INVOICE_HTTP_CODE"
        if [ "$INVOICE_HTTP_CODE" == "200" ]; then
            if echo "$INVOICE_BODY" | jq -e '.pr' > /dev/null 2>&1; then
                echo "   ✅ Invoice generated"
            else
                echo "   ❌ No invoice in response"
            fi
        else
            echo "   ❌ Invoice generation failed"
        fi
    else
        echo "   ⚠️  No callback URL"
    fi
else
    echo "   ⚠️  Skipped (prerequisite failed)"
fi
echo ""

echo "==================================="
echo "Summary:"
echo ""
if [ "$DOMAIN" == "trailscoffee.com" ] && [ "$WRONG_ADDRESSES" -eq "0" ] && [ "$HTTP_CODE" == "200" ] && [ "$INVOICE_HTTP_CODE" == "200" ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo ""
    echo "Your Lightning address setup is complete and working!"
    echo "Test in Strike: ${TEST_USER}@trailscoffee.com"
else
    echo "⚠️  SOME CHECKS FAILED"
    echo ""
    echo "Review the output above and fix any ❌ items"
fi
echo "==================================="
```

Save this as `/tmp/verify-lightning.sh` and run:
```bash
chmod +x /tmp/verify-lightning.sh
/tmp/verify-lightning.sh
```

---

## ✅ **Success Criteria**

All these should return ✅:

1. **Backend config**: `DOMAIN=trailscoffee.com`
2. **Database**: All addresses end with `@trailscoffee.com`
3. **Backend service**: `pm2 status` shows `online`
4. **LNURL endpoint**: Returns HTTP 200 with valid JSON
5. **Invoice generation**: Returns HTTP 200 with `pr` field
6. **Strike test**: Can send payment successfully

---

## 🎉 **Final Test - Send Real Payment**

1. Open PWA: `https://points.trailscoffee.com`
2. Copy your Lightning address (should show `@trailscoffee.com`)
3. Open Strike wallet
4. Send → Enter Lightning address
5. Enter small amount (like 100 sats)
6. Pay
7. Should work! 🎉

---

## 🆘 **If Tests Fail**

### **❌ LNURL endpoint returns 404**
- Check root domain configuration (Caddy or Nginx)
- Make sure `.well-known/lnurlp/` is proxied to backend
- Test directly: `curl http://localhost:3000/.well-known/lnurlp/test`

### **❌ Invalid response format**
- Check backend logs: `pm2 logs npubcash-server`
- Backend may not have LNURL endpoints implemented
- See FIX-LIGHTNING-ADDRESS.md for endpoint implementation

### **❌ Invoice generation fails**
- Check mint is accessible: `curl https://ecash.trailscoffee.com/v1/info`
- Check backend can create mint quotes
- Check backend logs for errors

---

## 📞 **Get Help**

If anything fails:
1. Run the verification script above
2. Share the output
3. Check logs: `pm2 logs npubcash-server`
4. Check web server logs (Caddy or Nginx)

---

**All checks passing? You're done! Lightning addresses are working! ⚡**



