# Lightning Address Setup with Caddy

**Goal**: 
- Backend API at: `npubcash.trailscoffee.com`
- Lightning addresses: `user@trailscoffee.com` (root domain)

This is the **correct and standard setup**! ✅

---

## 🎯 **Architecture**

```
Lightning Address: npub1abc...@trailscoffee.com
                           ↓
Wallet queries: https://trailscoffee.com/.well-known/lnurlp/npub1abc...
                           ↓
Caddy proxies to: http://localhost:3000/.well-known/lnurlp/npub1abc...
                           ↓
npubcash-server (backend): Returns LNURL-pay response
                           ↓
Payment succeeds! ✅
```

**Key Points:**
- ✅ Backend stays at `npubcash.trailscoffee.com`
- ✅ Lightning addresses use `@trailscoffee.com` (root domain)
- ✅ Root domain only proxies `.well-known/` to backend
- ✅ Everything else can redirect to PWA

---

## 📋 **Backend Configuration**

### **Step 1: Fix backend .env**

```bash
# On server
cd /var/www/npubcash-server
nano .env

# Set DOMAIN to ROOT domain (not subdomain):
DOMAIN=trailscoffee.com

# NOT: DOMAIN=npubcash.trailscoffee.com
```

This tells the backend to generate Lightning addresses like: `npub@trailscoffee.com`

---

## 🔧 **Caddy Configuration**

You need **TWO Caddyfile entries**:

### **Step 2: Create/Update Caddyfile**

```bash
# Edit Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Add these two entries:

```caddy
# Backend API (npubcash subdomain)
npubcash.trailscoffee.com {
    # Reverse proxy to npubcash-server
    reverse_proxy localhost:3000
    
    # CORS headers
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type"
    }
    
    # Optional: rate limiting
    # rate_limit {
    #     zone npubcash {
    #         key {remote_host}
    #         events 100
    #         window 1m
    #     }
    # }
}

# Root domain (for Lightning addresses)
trailscoffee.com {
    # Proxy LNURL-pay endpoints to backend
    handle /.well-known/lnurlp/* {
        reverse_proxy localhost:3000
        header {
            Access-Control-Allow-Origin *
        }
    }
    
    # Proxy NIP-05 (Nostr) endpoints to backend
    handle /.well-known/nostr.json* {
        reverse_proxy localhost:3000
        header {
            Access-Control-Allow-Origin *
        }
    }
    
    # Everything else redirects to PWA
    handle {
        redir https://points.trailscoffee.com{uri} permanent
    }
}

# PWA (if hosted on same server)
# points.trailscoffee.com {
#     root * /var/www/trails-coffee/dist/pwa
#     file_server
#     try_files {path} /index.html
#     
#     header /service-worker.js {
#         Cache-Control "no-cache, no-store, must-revalidate"
#     }
#     
#     encode gzip
# }
```

**What this does:**
- `npubcash.trailscoffee.com` → Full backend API
- `trailscoffee.com/.well-known/lnurlp/` → Proxies to backend (for Lightning addresses)
- `trailscoffee.com/.well-known/nostr.json` → Proxies to backend (for NIP-05)
- `trailscoffee.com/` (anything else) → Redirects to PWA

---

## 🚀 **Deployment Steps**

### **Step 1: Update Backend Config**

```bash
cd /var/www/npubcash-server

# Fix .env
sudo nano .env
# Change: DOMAIN=trailscoffee.com

# Update database for existing users
sudo -u postgres psql -d npubcash << 'EOF'
UPDATE users 
SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com');
SELECT lightning_address FROM users LIMIT 5;
EOF

# Rebuild and restart
npm run build
pm2 restart npubcash-server
```

### **Step 2: Update Caddyfile**

```bash
# Backup existing config
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup

# Edit Caddyfile
sudo nano /etc/caddy/Caddyfile
# Add the configuration above

# Test configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy (no downtime)
sudo systemctl reload caddy

# Or restart if needed
sudo systemctl restart caddy
```

### **Step 3: Verify DNS**

```bash
# Check DNS is pointing to your server
dig +short trailscoffee.com
dig +short npubcash.trailscoffee.com

# Both should point to your server IP
```

---

## ✅ **Testing**

### **Test 1: Backend API (subdomain)**

```bash
# Should work - backend API
curl https://npubcash.trailscoffee.com/api/v1/register
```

### **Test 2: LNURL endpoint (root domain)**

```bash
# Get a test user
USER=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | cut -d'@' -f1 | xargs)

# Test LNURL-pay endpoint on ROOT domain
curl https://trailscoffee.com/.well-known/lnurlp/$USER

# Should return JSON with:
# {
#   "callback": "...",
#   "maxSendable": ...,
#   "minSendable": ...,
#   "metadata": "...",
#   "tag": "payRequest"
# }
```

### **Test 3: Full Payment Flow**

```bash
# Test callback (invoice generation)
CALLBACK_URL=$(curl -s https://trailscoffee.com/.well-known/lnurlp/$USER | jq -r .callback)
curl "${CALLBACK_URL}?amount=10000"

# Should return invoice:
# {
#   "pr": "lnbc...",
#   "routes": [],
#   "successAction": {...}
# }
```

### **Test 4: From Strike Wallet**

1. Open Strike
2. Send → Enter Lightning address
3. Type: `npub1...@trailscoffee.com`
4. Should resolve ✅
5. Enter amount → Pay
6. Should work! 🎉

---

## 🔍 **Diagnostic Script**

```bash
# Run the diagnostic
cd /var/www/trails-coffee
./diagnose-lightning.sh

# Should show all ✅ checks passing
```

---

## 📊 **Expected Results**

### **Backend Logs (PM2)**
```bash
pm2 logs npubcash-server --lines 50

# Should see:
# GET /.well-known/lnurlp/npub1abc... 200
# GET /api/v1/lnurlp/callback/npub1abc... 200
```

### **Caddy Logs**
```bash
sudo journalctl -u caddy -f

# Should see:
# trailscoffee.com GET /.well-known/lnurlp/npub1abc... 200
# npubcash.trailscoffee.com POST /api/v1/register 200
```

### **Database**
```bash
sudo -u postgres psql -d npubcash -c "SELECT lightning_address FROM users;"

# Should show:
# npub1abc...@trailscoffee.com ✅
# NOT: npub1abc...@npubcash.trailscoffee.com ❌
```

---

## 🎯 **Complete Caddyfile Example**

Here's a complete working Caddyfile:

```caddy
# Caddy configuration for Trails Coffee
# Handles: Backend API, Lightning addresses, PWA

# Global options
{
    email admin@trailscoffee.com
}

# Backend API (subdomain)
npubcash.trailscoffee.com {
    reverse_proxy localhost:3000
    
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
    }
    
    log {
        output file /var/log/caddy/npubcash.log
    }
}

# Root domain (Lightning addresses)
trailscoffee.com {
    # LNURL-pay for Lightning addresses
    handle /.well-known/lnurlp/* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    # NIP-05 for Nostr verification
    handle /.well-known/nostr.json* {
        reverse_proxy localhost:3000
        header Access-Control-Allow-Origin *
    }
    
    # Redirect everything else to PWA
    handle {
        redir https://points.trailscoffee.com{uri} permanent
    }
    
    log {
        output file /var/log/caddy/trailscoffee.log
    }
}

# PWA (points subdomain)
points.trailscoffee.com {
    root * /var/www/trails-coffee/dist/pwa
    
    # Service worker must not be cached
    header /service-worker.js {
        Cache-Control "no-cache, no-store, must-revalidate"
        Pragma "no-cache"
        Expires "0"
    }
    
    # Cache static assets
    header /js/* {
        Cache-Control "public, max-age=31536000, immutable"
    }
    header /css/* {
        Cache-Control "public, max-age=31536000, immutable"
    }
    
    # SPA fallback
    try_files {path} /index.html
    file_server
    encode gzip
    
    log {
        output file /var/log/caddy/points.log
    }
}
```

---

## 🔒 **Security Notes**

### **CORS Headers**
- `Access-Control-Allow-Origin *` is needed for Lightning wallets
- LNURL standard requires this for `.well-known` endpoints

### **Rate Limiting**
Consider adding rate limiting to prevent abuse:

```caddy
npubcash.trailscoffee.com {
    reverse_proxy localhost:3000
    
    # Add rate limiting
    rate_limit {
        zone backend {
            key {remote_host}
            events 100
            window 1m
        }
    }
}
```

### **Firewall**
```bash
# Only expose 80/443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Port 3000 should NOT be exposed (Caddy proxies to it)
```

---

## 🆘 **Troubleshooting**

### **Issue: Caddy won't start**
```bash
# Check logs
sudo journalctl -u caddy -n 50

# Test config
sudo caddy validate --config /etc/caddy/Caddyfile

# Check syntax
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
```

### **Issue: SSL certificate fails**
```bash
# Check if port 80/443 are open
sudo ufw status

# Check DNS is pointing to server
dig +short trailscoffee.com

# Manually get certificate
sudo caddy trust
sudo systemctl restart caddy
```

### **Issue: .well-known returns 404**
```bash
# Check Caddy is proxying
curl -v https://trailscoffee.com/.well-known/lnurlp/test

# Check backend is running
curl http://localhost:3000/.well-known/lnurlp/test

# Check Caddyfile syntax
sudo caddy fmt /etc/caddy/Caddyfile
```

### **Issue: CORS errors**
```bash
# Add to Caddyfile handle block:
header {
    Access-Control-Allow-Origin *
    Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Access-Control-Allow-Headers "*"
}
```

---

## 📝 **Summary**

**Setup:**
- ✅ Backend: `npubcash.trailscoffee.com` (full API access)
- ✅ Lightning addresses: `user@trailscoffee.com` (root domain)
- ✅ Root domain: Only proxies `.well-known/` to backend
- ✅ PWA: `points.trailscoffee.com` (separate subdomain)

**Benefits:**
- Clean separation of concerns
- Standard Lightning address format
- Backend can be on any subdomain
- Easy to add more services later

**Result:**
- ✅ Lightning addresses work in all wallets
- ✅ Backend API is accessible
- ✅ PWA is served separately
- ✅ SSL handled automatically by Caddy

---

## 🚀 **Quick Deployment**

```bash
# 1. Fix backend
cd /var/www/npubcash-server
sudo sed -i 's/DOMAIN=npubcash.trailscoffee.com/DOMAIN=trailscoffee.com/' .env
npm run build && pm2 restart npubcash-server

# 2. Update database
sudo -u postgres psql -d npubcash -c "UPDATE users SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com');"

# 3. Update Caddy config
sudo nano /etc/caddy/Caddyfile
# Add the configuration above

# 4. Reload Caddy
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 5. Test
./diagnose-lightning.sh
```

**Done!** Lightning addresses will work perfectly! ⚡

