#!/bin/bash
#
# Lightning Address Diagnostic Script
# Run this to diagnose why payments aren't working
#

set -e

echo "================================================"
echo "Lightning Address Diagnostic Tool"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on server
if [ ! -d "/var/www/npubcash-server" ]; then
    echo -e "${RED}❌ Not running on server (missing /var/www/npubcash-server)${NC}"
    exit 1
fi

# Get test address from database
echo "1️⃣  Checking database for users..."
TEST_ADDRESS=$(sudo -u postgres psql -d npubcash -t -c "SELECT lightning_address FROM users ORDER BY created_at DESC LIMIT 1;" 2>/dev/null | xargs)

if [ -z "$TEST_ADDRESS" ]; then
    echo -e "${RED}❌ No users found in database${NC}"
    echo "   Run registration first"
    exit 1
fi

echo -e "${GREEN}✅ Found user: $TEST_ADDRESS${NC}"

# Extract username and domain
USERNAME=$(echo $TEST_ADDRESS | cut -d'@' -f1)
DOMAIN=$(echo $TEST_ADDRESS | cut -d'@' -f2)

echo "   Username: $USERNAME"
echo "   Domain: $DOMAIN"
echo ""

# Check domain format
echo "2️⃣  Checking Lightning address format..."
if [[ "$DOMAIN" == "trailscoffee.com" ]]; then
    echo -e "${GREEN}✅ Domain is correct: $DOMAIN${NC}"
elif [[ "$DOMAIN" == "npubcash.trailscoffee.com" ]]; then
    echo -e "${RED}❌ Domain is WRONG: $DOMAIN${NC}"
    echo "   Should be: trailscoffee.com"
    echo "   Lightning addresses must use root domain, not subdomain"
    echo ""
    echo "   Fix: Update .env file:"
    echo "   DOMAIN=trailscoffee.com"
    echo ""
    echo "   Then rebuild and restart:"
    echo "   cd /var/www/npubcash-server"
    echo "   npm run build"
    echo "   pm2 restart npubcash-server"
    echo ""
else
    echo -e "${YELLOW}⚠️  Unexpected domain: $DOMAIN${NC}"
fi
echo ""

# Check DNS
echo "3️⃣  Checking DNS resolution..."
ROOT_IP=$(dig +short $DOMAIN | head -1)
NPUBCASH_IP=$(dig +short npubcash.$DOMAIN | head -1)
SERVER_IP=$(curl -s -4 ifconfig.me)

echo "   Root domain ($DOMAIN): $ROOT_IP"
echo "   Subdomain (npubcash.$DOMAIN): $NPUBCASH_IP"
echo "   This server IP: $SERVER_IP"

if [ "$ROOT_IP" == "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ Root domain DNS correct${NC}"
else
    echo -e "${RED}❌ Root domain DNS not pointing to this server${NC}"
    echo "   Add A record: $DOMAIN → $SERVER_IP"
fi

if [ "$NPUBCASH_IP" == "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ Subdomain DNS correct${NC}"
else
    echo -e "${YELLOW}⚠️  Subdomain DNS not pointing to this server${NC}"
fi
echo ""

# Check Nginx configuration
echo "4️⃣  Checking Nginx configuration..."
if [ -f /etc/nginx/sites-enabled/trailscoffee-root ] || [ -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo -e "${GREEN}✅ Root domain Nginx config exists${NC}"
    
    # Check if it proxies .well-known
    if grep -q ".well-known" /etc/nginx/sites-available/trailscoffee-root 2>/dev/null || grep -q ".well-known" /etc/nginx/sites-available/$DOMAIN 2>/dev/null; then
        echo -e "${GREEN}✅ .well-known proxy configured${NC}"
    else
        echo -e "${RED}❌ .well-known proxy NOT configured${NC}"
        echo "   Nginx must proxy /.well-known/lnurlp/ to backend"
    fi
else
    echo -e "${RED}❌ Root domain Nginx config MISSING${NC}"
    echo "   Need to create: /etc/nginx/sites-available/trailscoffee-root"
    echo "   See: FIX-LIGHTNING-ADDRESS.md Step 3"
fi

if [ -f /etc/nginx/sites-enabled/npubcash-server ]; then
    echo -e "${GREEN}✅ Backend Nginx config exists${NC}"
else
    echo -e "${YELLOW}⚠️  Backend Nginx config missing${NC}"
fi

# Test Nginx config
if sudo nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx config is valid${NC}"
else
    echo -e "${RED}❌ Nginx config has errors${NC}"
    sudo nginx -t
fi
echo ""

# Check backend service
echo "5️⃣  Checking backend service..."
if pm2 list 2>/dev/null | grep -q "npubcash-server.*online"; then
    echo -e "${GREEN}✅ npubcash-server is running${NC}"
    pm2 list | grep npubcash-server
else
    echo -e "${RED}❌ npubcash-server is NOT running${NC}"
    echo "   Start it with: pm2 start npubcash-server"
fi
echo ""

# Test LNURL-pay endpoint
echo "6️⃣  Testing LNURL-pay endpoint..."
LNURL_URL="https://${DOMAIN}/.well-known/lnurlp/${USERNAME}"
echo "   URL: $LNURL_URL"

RESPONSE=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "$LNURL_URL" 2>/dev/null || echo "__HTTP_CODE__:000")
HTTP_CODE=$(echo "$RESPONSE" | grep "__HTTP_CODE__" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "__HTTP_CODE__")

echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ LNURL endpoint responding${NC}"
    echo "   Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    
    # Check if response has required fields
    if echo "$BODY" | jq -e '.callback' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Response has 'callback' field${NC}"
    else
        echo -e "${RED}❌ Response missing 'callback' field${NC}"
    fi
    
    if echo "$BODY" | jq -e '.tag' > /dev/null 2>&1; then
        TAG=$(echo "$BODY" | jq -r '.tag')
        if [ "$TAG" == "payRequest" ]; then
            echo -e "${GREEN}✅ Response has correct 'tag' field${NC}"
        else
            echo -e "${YELLOW}⚠️  Tag is '$TAG' (should be 'payRequest')${NC}"
        fi
    else
        echo -e "${RED}❌ Response missing 'tag' field${NC}"
    fi
    
elif [ "$HTTP_CODE" == "404" ]; then
    echo -e "${RED}❌ Endpoint not found (404)${NC}"
    echo "   Either:"
    echo "   1. Nginx not routing .well-known to backend"
    echo "   2. Backend doesn't have LNURL endpoint"
    echo "   3. User not found in database"
elif [ "$HTTP_CODE" == "000" ]; then
    echo -e "${RED}❌ Cannot connect to endpoint${NC}"
    echo "   Check:"
    echo "   1. Nginx is running"
    echo "   2. SSL certificate exists"
    echo "   3. Firewall allows HTTPS"
else
    echo -e "${RED}❌ Unexpected HTTP code: $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test callback endpoint (if first endpoint worked)
if [ "$HTTP_CODE" == "200" ]; then
    echo "7️⃣  Testing invoice generation (callback)..."
    CALLBACK_URL=$(echo "$BODY" | jq -r '.callback' 2>/dev/null)
    
    if [ ! -z "$CALLBACK_URL" ] && [ "$CALLBACK_URL" != "null" ]; then
        echo "   Callback URL: $CALLBACK_URL"
        
        CALLBACK_RESPONSE=$(curl -s -w "\n__HTTP_CODE__:%{http_code}" "${CALLBACK_URL}?amount=10000" 2>/dev/null || echo "__HTTP_CODE__:000")
        CALLBACK_HTTP_CODE=$(echo "$CALLBACK_RESPONSE" | grep "__HTTP_CODE__" | cut -d: -f2)
        CALLBACK_BODY=$(echo "$CALLBACK_RESPONSE" | grep -v "__HTTP_CODE__")
        
        echo "   HTTP Status: $CALLBACK_HTTP_CODE"
        
        if [ "$CALLBACK_HTTP_CODE" == "200" ]; then
            echo -e "${GREEN}✅ Callback endpoint responding${NC}"
            echo "   Response:"
            echo "$CALLBACK_BODY" | jq . 2>/dev/null || echo "$CALLBACK_BODY"
            
            if echo "$CALLBACK_BODY" | jq -e '.pr' > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Invoice generated successfully${NC}"
                INVOICE=$(echo "$CALLBACK_BODY" | jq -r '.pr')
                echo "   Invoice: ${INVOICE:0:50}..."
            else
                echo -e "${RED}❌ Response missing 'pr' (invoice) field${NC}"
            fi
        else
            echo -e "${RED}❌ Callback failed with HTTP $CALLBACK_HTTP_CODE${NC}"
            echo "   Response: $CALLBACK_BODY"
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping callback test (no callback URL)${NC}"
    fi
    echo ""
fi

# Check SSL certificate
echo "8️⃣  Checking SSL certificate..."
if echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | grep -q "Verify return code: 0"; then
    echo -e "${GREEN}✅ SSL certificate is valid${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificate issue${NC}"
    echo "   Run: sudo certbot --nginx -d $DOMAIN"
fi
echo ""

# Check backend logs for errors
echo "9️⃣  Checking recent backend logs..."
echo "   Last 10 lines:"
pm2 logs npubcash-server --lines 10 --nostream 2>/dev/null | tail -10 || echo "   Could not read logs"
echo ""

# Summary
echo "================================================"
echo "Summary"
echo "================================================"
echo ""
echo "Lightning Address: $TEST_ADDRESS"
echo ""
echo "Test in wallet:"
echo "  1. Open Strike (or any LN wallet with Lightning address support)"
echo "  2. Send to: $TEST_ADDRESS"
echo "  3. Should work if all checks above passed ✅"
echo ""
echo "If still failing:"
echo "  - Read: FIX-LIGHTNING-ADDRESS.md"
echo "  - Check: pm2 logs npubcash-server"
echo "  - Test manually: curl $LNURL_URL"
echo ""
echo "================================================"

