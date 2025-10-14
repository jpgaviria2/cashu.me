# Fix Lightning Address Payment Issue

**Problem**: Lightning address registers successfully but cannot receive payments. Strike shows "invalid address format".

**Likely Causes**:
1. LNURL-pay endpoint not properly configured
2. `.well-known/lnurlp/` endpoint missing or returning wrong format
3. Lightning address format issue
4. CORS or DNS issues

---

## 🔍 **Step 1: Verify Lightning Address Format**

Lightning addresses should be: `username@trailscoffee.com`

**Check what format is being generated:**

```bash
# On the server, check a registered user
sudo -u postgres psql -d npubcash -c "SELECT lightning_address FROM users LIMIT 5;"
```

**Expected format:**
```
npub1abc...xyz@trailscoffee.com
```

**NOT:**
```
npub1abc...xyz@npubcash.trailscoffee.com  ❌ (wrong subdomain)
```

**Fix if needed:**
```bash
# Update the domain in the backend
cd /var/www/npubcash-server
nano .env

# Make sure it says:
DOMAIN=trailscoffee.com
# NOT: DOMAIN=npubcash.trailscoffee.com
```

---

## 🔍 **Step 2: Test LNURL-pay Endpoint**

The Lightning address `user@trailscoffee.com` needs to resolve via:
`https://trailscoffee.com/.well-known/lnurlp/user`

**Test with a real registered user:**

```bash
# Get a real lightning address from database
USER_ADDRESS=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | xargs)
echo "Testing address: $USER_ADDRESS"

# Extract username (everything before @)
USERNAME=$(echo $USER_ADDRESS | cut -d'@' -f1)
echo "Username: $USERNAME"

# Test the LNURL endpoint
curl -v https://trailscoffee.com/.well-known/lnurlp/$USERNAME
```

**Expected Response:**
```json
{
  "callback": "https://npubcash.trailscoffee.com/api/v1/lnurlp/callback",
  "maxSendable": 100000000,
  "minSendable": 1000,
  "metadata": "[[\"text/plain\",\"Pay to npub1abc...\"]]",
  "tag": "payRequest"
}
```

**If you get 404 or error**, the issue is here!

---

## 🔧 **Step 3: Fix DNS for Lightning Address**

Lightning addresses require the ROOT domain, not the subdomain!

**Current setup (might be wrong):**
- Backend: `npubcash.trailscoffee.com` ✅
- Lightning addresses: `user@npubcash.trailscoffee.com` ❌

**Correct setup:**
- Backend: `npubcash.trailscoffee.com` ✅
- Lightning addresses: `user@trailscoffee.com` ✅

**Fix: Add Nginx proxy on root domain**

```bash
# Create Nginx config for ROOT domain
sudo tee /etc/nginx/sites-available/trailscoffee-root > /dev/null << 'EOF'
server {
    listen 80;
    listen 443 ssl http2;
    server_name trailscoffee.com;

    # SSL certificates (if using certbot, it will add these)
    # ssl_certificate /etc/letsencrypt/live/trailscoffee.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/trailscoffee.com/privkey.pem;

    # LNURL-pay endpoint (proxy to npubcash-server)
    location /.well-known/lnurlp/ {
        proxy_pass http://localhost:3000/.well-known/lnurlp/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (important for wallets)
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
    }

    # NIP-05 endpoint (proxy to npubcash-server)
    location /.well-known/nostr.json {
        proxy_pass http://localhost:3000/.well-known/nostr.json;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
    }

    # Root and other paths (serve your main website or redirect)
    location / {
        # Option 1: Redirect to PWA
        return 301 https://points.trailscoffee.com$request_uri;
        
        # Option 2: Serve a landing page
        # root /var/www/trailscoffee.com;
        # index index.html;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/trailscoffee-root /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate for root domain
sudo certbot --nginx -d trailscoffee.com
```

---

## 🔍 **Step 4: Verify npubcash-server Has LNURL Endpoints**

Check if npubcash-server actually implements the LNURL-pay endpoints:

```bash
cd /var/www/npubcash-server

# Check for LNURL routes
grep -r "lnurlp" src/ || grep -r "well-known" src/

# Check the routes file
cat src/routes.ts || cat src/routes/index.ts | grep -A 5 "well-known"
```

**If LNURL endpoints are missing**, you need to add them!

---

## 🔧 **Step 5: Implement LNURL-pay Endpoints (If Missing)**

If npubcash-server doesn't have LNURL endpoints, add them:

```bash
cd /var/www/npubcash-server

# Create LNURL controller
cat > src/controllers/lnurlController.ts << 'EOF'
import { Request, Response } from 'express';
import { db } from '../db';

// LNURL-pay: First callback (returns payment info)
export async function lnurlPayRequest(req: Request, res: Response) {
  try {
    const { username } = req.params;
    
    // Find user by lightning address
    const result = await db.query(
      'SELECT * FROM users WHERE lightning_address = $1 OR username = $2',
      [`${username}@${process.env.DOMAIN}`, username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        status: 'ERROR',
        reason: 'User not found' 
      });
    }

    const user = result.rows[0];
    const callbackUrl = `https://${req.get('host')}/api/v1/lnurlp/callback/${username}`;
    
    // Return LNURL-pay response
    return res.json({
      callback: callbackUrl,
      maxSendable: 100000000, // 1 million sats (1 BTC)
      minSendable: 1000,      // 1 sat minimum
      metadata: JSON.stringify([
        ["text/plain", `Pay to ${user.lightning_address}`],
        ["text/identifier", user.lightning_address]
      ]),
      tag: "payRequest"
    });

  } catch (error) {
    console.error('LNURL-pay request error:', error);
    return res.status(500).json({ 
      status: 'ERROR',
      reason: 'Internal server error' 
    });
  }
}

// LNURL-pay: Second callback (generates invoice)
export async function lnurlPayCallback(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const { amount } = req.query;

    if (!amount) {
      return res.status(400).json({
        status: 'ERROR',
        reason: 'Missing amount parameter'
      });
    }

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE lightning_address = $1 OR username = $2',
      [`${username}@${process.env.DOMAIN}`, username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        reason: 'User not found'
      });
    }

    const user = result.rows[0];
    const amountSats = Math.floor(Number(amount) / 1000); // Convert msats to sats

    // TODO: Generate invoice from Lightning backend or mint
    // For now, this needs to be connected to your Lightning node or mint
    
    // Request mint quote
    const mintQuoteResponse = await fetch(`${process.env.MINT_URL}/v1/mint/quote/bolt11`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountSats,
        unit: 'sat'
      })
    });

    if (!mintQuoteResponse.ok) {
      throw new Error('Failed to create mint quote');
    }

    const mintQuote = await mintQuoteResponse.json();
    
    // Store pending payment
    await db.query(
      'INSERT INTO pending_tokens (user_id, amount, token, claimed) VALUES ($1, $2, $3, false)',
      [user.id, amountSats, JSON.stringify(mintQuote)]
    );

    // Return invoice
    return res.json({
      pr: mintQuote.request,  // Lightning invoice
      routes: [],
      successAction: {
        tag: "message",
        message: `Payment received! ${amountSats} sats will be available in your Trails Coffee wallet.`
      }
    });

  } catch (error) {
    console.error('LNURL-pay callback error:', error);
    return res.status(500).json({
      status: 'ERROR',
      reason: 'Failed to generate invoice'
    });
  }
}
EOF

# Add routes
cat >> src/routes.ts << 'EOF' || cat >> src/routes/index.ts << 'EOF'

// LNURL-pay endpoints
import { lnurlPayRequest, lnurlPayCallback } from './controllers/lnurlController';

// Well-known LNURL endpoint
router.get('/.well-known/lnurlp/:username', lnurlPayRequest);

// Callback endpoint
router.get('/api/v1/lnurlp/callback/:username', lnurlPayCallback);
EOF

# Rebuild and restart
npm run build
pm2 restart npubcash-server

echo "✅ LNURL endpoints added"
```

---

## 🔍 **Step 6: Test Complete Flow**

```bash
# 1. Get a test Lightning address
TEST_ADDRESS=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | xargs)
echo "Testing: $TEST_ADDRESS"

# Extract username
USERNAME=$(echo $TEST_ADDRESS | cut -d'@' -f1)
DOMAIN=$(echo $TEST_ADDRESS | cut -d'@' -f2)

echo "Username: $USERNAME"
echo "Domain: $DOMAIN"

# 2. Test LNURL-pay first callback
echo ""
echo "Testing LNURL-pay first callback..."
curl -s "https://${DOMAIN}/.well-known/lnurlp/${USERNAME}" | jq .

# Expected: JSON with callback, maxSendable, minSendable, metadata, tag

# 3. Test callback endpoint
echo ""
echo "Testing invoice generation..."
CALLBACK_URL=$(curl -s "https://${DOMAIN}/.well-known/lnurlp/${USERNAME}" | jq -r .callback)
curl -s "${CALLBACK_URL}?amount=10000" | jq .

# Expected: JSON with "pr" (lightning invoice)

# 4. Verify with LNURL debugger
echo ""
echo "Test with LNURL debugger:"
echo "https://lnurl.fiatjaf.com/codec"
echo "Enter: $TEST_ADDRESS"
```

---

## 🔍 **Step 7: Common Issues & Fixes**

### **Issue 1: "Invalid address format"**

**Cause**: Lightning address format is wrong

**Fix:**
```bash
# Verify format in database
sudo -u postgres psql -d npubcash -c "SELECT lightning_address FROM users;"

# Should be: user@trailscoffee.com
# NOT: user@npubcash.trailscoffee.com

# Update if wrong
sudo -u postgres psql -d npubcash << 'EOF'
UPDATE users 
SET lightning_address = REPLACE(lightning_address, '@npubcash.trailscoffee.com', '@trailscoffee.com');
EOF
```

### **Issue 2: "Not found" or 404**

**Cause**: Nginx not routing `.well-known` to backend

**Fix:** See Step 3 - configure root domain Nginx

### **Issue 3: "No route to host"**

**Cause**: DNS not pointing to server

**Fix:**
```bash
# Check DNS
nslookup trailscoffee.com
nslookup npubcash.trailscoffee.com

# Should point to your server IP
```

### **Issue 4: "CORS error"**

**Cause**: Missing CORS headers

**Fix:** Add to Nginx (see Step 3):
```nginx
add_header Access-Control-Allow-Origin "*" always;
```

---

## 📋 **Quick Diagnostic Script**

Run this on the server:

```bash
cat > /tmp/diagnose-lightning-address.sh << 'EOF'
#!/bin/bash

echo "=== Lightning Address Diagnostics ==="
echo ""

# Get test address
TEST_ADDRESS=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users LIMIT 1;" | xargs)
if [ -z "$TEST_ADDRESS" ]; then
    echo "❌ No users found in database"
    exit 1
fi

echo "Test address: $TEST_ADDRESS"
USERNAME=$(echo $TEST_ADDRESS | cut -d'@' -f1)
DOMAIN=$(echo $TEST_ADDRESS | cut -d'@' -f2)

echo ""
echo "=== DNS Check ==="
dig +short $DOMAIN
dig +short npubcash.$DOMAIN

echo ""
echo "=== LNURL-pay Endpoint Check ==="
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "https://${DOMAIN}/.well-known/lnurlp/${USERNAME}")
echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "HTTP_CODE:200"; then
    echo "✅ LNURL endpoint responding"
else
    echo "❌ LNURL endpoint not working"
fi

echo ""
echo "=== Nginx Configuration Check ==="
if [ -f /etc/nginx/sites-enabled/trailscoffee-root ]; then
    echo "✅ Root domain Nginx config exists"
else
    echo "⚠️  Root domain Nginx config missing"
fi

echo ""
echo "=== Backend Status ==="
pm2 list | grep npubcash-server

echo ""
echo "=== Recent Logs ==="
pm2 logs npubcash-server --lines 10 --nostream

echo ""
echo "=== Test with Strike ==="
echo "Try sending to: $TEST_ADDRESS"
EOF

chmod +x /tmp/diagnose-lightning-address.sh
/tmp/diagnose-lightning-address.sh
```

---

## ✅ **Expected Working State**

When everything is working:

1. **Lightning address format:**
   ```
   npub1abc...@trailscoffee.com ✅
   ```

2. **LNURL endpoint responding:**
   ```bash
   curl https://trailscoffee.com/.well-known/lnurlp/npub1abc...
   # Returns: JSON with callback, maxSendable, etc.
   ```

3. **Callback generating invoice:**
   ```bash
   curl "https://npubcash.trailscoffee.com/api/v1/lnurlp/callback/npub1abc...?amount=10000"
   # Returns: JSON with "pr" (Lightning invoice)
   ```

4. **Strike can send payment:**
   - Enter: `npub1abc...@trailscoffee.com`
   - Strike resolves the address ✅
   - Generates invoice ✅
   - Payment succeeds ✅

---

## 🚀 **Next Steps**

1. Run the diagnostic script (see above)
2. Fix the identified issues
3. Test with Strike again
4. If still failing, share the output of the diagnostic script

---

**Most likely fix needed**: Configure Nginx on root domain (Step 3) and ensure Lightning addresses use `@trailscoffee.com` not `@npubcash.trailscoffee.com` (Step 1).



