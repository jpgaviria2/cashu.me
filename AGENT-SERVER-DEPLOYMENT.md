# AI Agent Deployment Instructions - Linux Server

**Target Environment**: Linux server with existing Cashu mint, Lightning node, and Bitcoin node

**Goal**: Deploy Trails Coffee PWA and npubcash-server for Lightning address functionality

---

## 🎯 **Pre-requisites (Already Available)**

✅ Linux server (Ubuntu/Debian)
✅ Cashu mint running at `https://ecash.trailscoffee.com`
✅ Lightning node (CLN/LND) connected to mint
✅ Bitcoin node
✅ Domain: `trailscoffee.com` with DNS access
✅ Root or sudo access

---

## 📋 **Step-by-Step Deployment**

### **STEP 1: Verify Environment** (5 minutes)

```bash
# Check system
uname -a
cat /etc/os-release

# Check if services are running
systemctl status nginx || echo "Nginx not installed"
systemctl status postgresql || echo "PostgreSQL not installed"

# Check Node.js
node --version || echo "Node.js not installed"
npm --version || echo "npm not installed"

# Check available ports
sudo netstat -tulpn | grep -E ':(3000|9000|8080)'

# Check disk space
df -h

# Check mint is responding
curl -s https://ecash.trailscoffee.com/v1/info | head -20
```

**Expected Output**: 
- System info displayed
- Available ports shown
- Mint returns JSON with mint info
- At least 10GB free space

---

### **STEP 2: Install Required Software** (10 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (if not present)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verify Node.js version
node --version  # Should be v20.x or higher
npm --version   # Should be 10.x or higher

# Install PostgreSQL (if not present)
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
fi

# Install Nginx (if not present)
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

# Install Certbot for SSL (if not present)
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

# Install PM2 for process management
sudo npm install -g pm2

# Install Git (if not present)
sudo apt install -y git curl wget
```

**Verification**:
```bash
node --version    # v20.x.x
npm --version     # 10.x.x
psql --version    # PostgreSQL 12+
nginx -v          # nginx/1.x
pm2 --version     # 5.x.x
```

---

### **STEP 3: Clone Trails Coffee Project** (2 minutes)

```bash
# Create directory for PWA
sudo mkdir -p /var/www/trails-coffee
sudo chown -R $USER:$USER /var/www/trails-coffee

# Clone the repository
cd /var/www/trails-coffee
git clone -b trails-coffee-deployment https://github.com/jpgaviria2/cashu.me.git .

# Verify files
ls -la
# Should see: src/, package.json, various .md files

# Install dependencies
npm install

# This may take 2-5 minutes
```

**Verification**:
```bash
# Check key files exist
test -f package.json && echo "✅ package.json found"
test -d src/stores && echo "✅ src/stores found"
test -f src/stores/trailsIdentity.ts && echo "✅ trailsIdentity.ts found"
test -f DEPLOYMENT-CHECKLIST.md && echo "✅ Documentation found"
```

---

### **STEP 4: Configure PWA Environment** (3 minutes)

```bash
# Get current mint URL
MINT_URL=$(curl -s https://ecash.trailscoffee.com/v1/info | grep -o '"name":"[^"]*"' | head -1)
echo "Detected mint: $MINT_URL"

# Update trailsIdentity.ts with correct URLs
cd /var/www/trails-coffee

# Create a configuration update
cat > update-config.sh << 'EOF'
#!/bin/bash
# Update configuration in source files

MINT_URL="https://ecash.trailscoffee.com"
NPUBCASH_URL="https://npubcash.trailscoffee.com"
DOMAIN="trailscoffee.com"

echo "Updating configuration..."
echo "  Mint: $MINT_URL"
echo "  npubcash: $NPUBCASH_URL"
echo "  Domain: $DOMAIN"

# Update trailsIdentity.ts if needed
if grep -q "npubcash.trailscoffee.com" src/stores/trailsIdentity.ts; then
    echo "✅ Configuration already correct"
else
    echo "⚠️  Please verify configuration in src/stores/trailsIdentity.ts"
fi

echo "Configuration check complete"
EOF

chmod +x update-config.sh
./update-config.sh
```

---

### **STEP 5: Build PWA for Production** (5 minutes)

```bash
cd /var/www/trails-coffee

# Build the PWA
npm run build:pwa

# This creates a dist/pwa directory with the built app
# Build may take 2-5 minutes

# Verify build
test -d dist/pwa && echo "✅ PWA built successfully" || echo "❌ Build failed"
ls -la dist/pwa/
```

**Expected Output**:
```
dist/pwa/
├── index.html
├── js/
├── css/
├── icons/
├── manifest.json
└── service-worker.js
```

---

### **STEP 6: Setup PostgreSQL Database** (5 minutes)

```bash
# Create database and user for npubcash-server
sudo -u postgres psql << 'EOF'
-- Create database
CREATE DATABASE npubcash;

-- Create user
CREATE USER npubcash_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE npubcash TO npubcash_user;

-- Connect to database
\c npubcash

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    npub TEXT UNIQUE NOT NULL,
    pubkey TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    lightning_address TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token TEXT NOT NULL,
    amount INTEGER NOT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    claimed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    token TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Verify tables
\dt

EOF

# Verify database setup
sudo -u postgres psql -d npubcash -c "\dt"
```

**Expected Output**:
```
                List of relations
 Schema |      Name       | Type  |     Owner      
--------+-----------------+-------+----------------
 public | users           | table | npubcash_user
 public | pending_tokens  | table | npubcash_user
 public | transactions    | table | npubcash_user
```

---

### **STEP 7: Clone and Setup npubcash-server** (10 minutes)

```bash
# Create directory
sudo mkdir -p /var/www/npubcash-server
sudo chown -R $USER:$USER /var/www/npubcash-server

# Clone npubcash-server
cd /var/www/npubcash-server
git clone https://github.com/cashubtc/npubcash-server.git .

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
# npubcash-server Configuration
PORT=3000
NODE_ENV=production
DOMAIN=trailscoffee.com

# Database
DATABASE_URL=postgresql://npubcash_user:your_secure_password_here@localhost:5432/npubcash

# Cashu Mint
MINT_URL=https://ecash.trailscoffee.com

# Nostr Relays (comma-separated)
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band,wss://nos.lol

# Lightning Backend (if using Blink)
# BLINK_API_KEY=your_blink_api_key_here

# Optional: Admin Authentication
# ADMIN_NPUB=npub1your_admin_key_here
EOF

echo "⚠️  IMPORTANT: Edit /var/www/npubcash-server/.env with your actual credentials"
```

---

### **STEP 8: Add Missing Registration Endpoint** (5 minutes)

The npubcash-server needs a registration endpoint. Create it:

```bash
cd /var/www/npubcash-server

# Create controllers directory if it doesn't exist
mkdir -p src/controllers

# Create registration controller
cat > src/controllers/registerController.ts << 'EOF'
import { Request, Response } from 'express';
import { db } from '../db'; // Adjust import based on actual structure

export async function registerController(req: Request, res: Response) {
  try {
    const { npub, pubkey, username } = req.body;

    // Validate input
    if (!npub || !pubkey) {
      return res.status(400).json({ 
        error: 'Missing required fields: npub and pubkey' 
      });
    }

    // Validate npub format
    if (!npub.startsWith('npub1')) {
      return res.status(400).json({ 
        error: 'Invalid npub format' 
      });
    }

    // Create or update user
    const lightningAddress = `${npub.substring(0, 20)}@${process.env.DOMAIN}`;
    
    const query = `
      INSERT INTO users (npub, pubkey, username, lightning_address, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (npub) 
      DO UPDATE SET 
        pubkey = EXCLUDED.pubkey,
        username = EXCLUDED.username,
        lightning_address = EXCLUDED.lightning_address
      RETURNING *;
    `;

    const result = await db.query(query, [
      npub,
      pubkey,
      username || null,
      lightningAddress
    ]);

    const user = result.rows[0];

    return res.status(200).json({
      success: true,
      npub: user.npub,
      lightningAddress: user.lightning_address,
      nip05: user.lightning_address,
      registered: true,
      registeredAt: user.created_at
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Failed to register user',
      message: error.message 
    });
  }
}
EOF

# Update routes to include registration endpoint
# Note: This depends on the actual structure of npubcash-server
# You may need to adjust the routes file location

cat >> src/routes.ts << 'EOF' || cat >> src/routes/index.ts << 'EOF'

// Add registration endpoint
import { registerController } from './controllers/registerController';

router.post('/api/v1/register', registerController);
EOF

echo "✅ Registration controller created"
echo "⚠️  Verify routes are properly configured in src/routes.ts or src/routes/index.ts"
```

---

### **STEP 9: Build npubcash-server** (3 minutes)

```bash
cd /var/www/npubcash-server

# Build TypeScript
npm run build

# Verify build
test -d dist && echo "✅ npubcash-server built successfully" || echo "❌ Build failed"
ls -la dist/
```

---

### **STEP 10: Configure Nginx** (5 minutes)

```bash
# Create Nginx configuration for PWA
sudo tee /etc/nginx/sites-available/trails-coffee-pwa > /dev/null << 'EOF'
server {
    listen 80;
    server_name points.trailscoffee.com;

    root /var/www/trails-coffee/dist/pwa;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Service worker (no cache)
    location /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Static assets (cache)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Create Nginx configuration for npubcash-server
sudo tee /etc/nginx/sites-available/npubcash-server > /dev/null << 'EOF'
server {
    listen 80;
    server_name npubcash.trailscoffee.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Well-known directory for LNURL and NIP-05
    location /.well-known/ {
        proxy_pass http://localhost:3000/.well-known/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable sites
sudo ln -sf /etc/nginx/sites-available/trails-coffee-pwa /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/npubcash-server /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Verification**:
```bash
sudo nginx -t
# Should output: "syntax is ok" and "test is successful"

sudo systemctl status nginx
# Should show "active (running)"
```

---

### **STEP 11: Setup SSL Certificates** (5 minutes)

```bash
# Get SSL certificates for both domains
sudo certbot --nginx -d points.trailscoffee.com -d npubcash.trailscoffee.com --non-interactive --agree-tos --email admin@trailscoffee.com

# Verify SSL
sudo certbot certificates

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

**Expected Output**:
```
Congratulations! You have successfully enabled https://points.trailscoffee.com
Congratulations! You have successfully enabled https://npubcash.trailscoffee.com
```

---

### **STEP 12: Start Services with PM2** (3 minutes)

```bash
# Start npubcash-server
cd /var/www/npubcash-server
pm2 start dist/index.js --name npubcash-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs (usually starts with 'sudo env PATH=...')

# Check status
pm2 status
pm2 logs npubcash-server --lines 50
```

**Expected Output**:
```
┌─────┬────────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name               │ mode    │ ↺       │ status  │ cpu      │
├─────┼────────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ npubcash-server    │ fork    │ 0       │ online  │ 0%       │
└─────┴────────────────────┴─────────┴─────────┴─────────┴──────────┘
```

---

### **STEP 13: Configure DNS** (5 minutes)

Add DNS records (if not already configured):

```bash
# Display server IP
curl -4 ifconfig.me
echo ""

# You need to add these DNS records:
echo "Add these DNS A records to trailscoffee.com:"
echo "  points.trailscoffee.com    A    $(curl -s -4 ifconfig.me)"
echo "  npubcash.trailscoffee.com  A    $(curl -s -4 ifconfig.me)"
echo ""
echo "Wait 5-10 minutes for DNS propagation"
```

---

### **STEP 14: Test Deployment** (10 minutes)

```bash
# Test PWA
echo "Testing PWA..."
curl -I https://points.trailscoffee.com
# Should return: HTTP/2 200

# Test npubcash-server health
echo "Testing npubcash-server..."
curl https://npubcash.trailscoffee.com/health || echo "Health endpoint may not exist"

# Test registration endpoint
echo "Testing registration..."
curl -X POST https://npubcash.trailscoffee.com/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "npub": "npub1testuser123456789",
    "pubkey": "test_pubkey_hex"
  }'
# Should return JSON with lightningAddress

# Test LNURL endpoint
echo "Testing LNURL..."
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/npub1testuser123456789

# Test NIP-05
echo "Testing NIP-05..."
curl 'https://npubcash.trailscoffee.com/.well-known/nostr.json?name=test'

# Check database
echo "Checking database..."
sudo -u postgres psql -d npubcash -c "SELECT COUNT(*) FROM users;"

# Check logs
echo "Checking logs..."
pm2 logs npubcash-server --lines 20 --nostream

# Check Nginx logs
sudo tail -20 /var/log/nginx/access.log
sudo tail -20 /var/log/nginx/error.log
```

---

### **STEP 15: Setup Monitoring** (5 minutes)

```bash
# Setup log rotation for PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Setup Nginx log rotation (usually already configured)
sudo tee /etc/logrotate.d/trails-coffee > /dev/null << 'EOF'
/var/log/nginx/trails-coffee-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
EOF

# Create backup script
sudo tee /usr/local/bin/backup-trails-coffee.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/trails-coffee"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump npubcash > $BACKUP_DIR/npubcash_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/npubcash_$TIMESTAMP.sql"
EOF

sudo chmod +x /usr/local/bin/backup-trails-coffee.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-trails-coffee.sh >> /var/log/trails-coffee-backup.log 2>&1") | crontab -

# Verify crontab
crontab -l | grep trails-coffee
```

---

### **STEP 16: Final Verification** (5 minutes)

```bash
echo "========================================"
echo "Trails Coffee Deployment Verification"
echo "========================================"
echo ""

# Check services
echo "1. Checking Services..."
systemctl is-active --quiet nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"
systemctl is-active --quiet postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Stopped"
pm2 list | grep -q "npubcash-server.*online" && echo "✅ npubcash-server: Running" || echo "❌ npubcash-server: Stopped"

# Check URLs
echo ""
echo "2. Checking URLs..."
curl -s -o /dev/null -w "PWA: %{http_code}\n" https://points.trailscoffee.com
curl -s -o /dev/null -w "npubcash: %{http_code}\n" https://npubcash.trailscoffee.com

# Check SSL
echo ""
echo "3. Checking SSL..."
echo | openssl s_client -servername points.trailscoffee.com -connect points.trailscoffee.com:443 2>/dev/null | grep -q "Verify return code: 0" && echo "✅ PWA SSL: Valid" || echo "⚠️  PWA SSL: Check needed"
echo | openssl s_client -servername npubcash.trailscoffee.com -connect npubcash.trailscoffee.com:443 2>/dev/null | grep -q "Verify return code: 0" && echo "✅ npubcash SSL: Valid" || echo "⚠️  npubcash SSL: Check needed"

# Check database
echo ""
echo "4. Checking Database..."
sudo -u postgres psql -d npubcash -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null && echo "✅ Database: Connected" || echo "❌ Database: Error"

# Check mint connectivity
echo ""
echo "5. Checking Mint..."
curl -s https://ecash.trailscoffee.com/v1/info | grep -q "name" && echo "✅ Mint: Responding" || echo "❌ Mint: Not responding"

# Check disk space
echo ""
echo "6. Checking Disk Space..."
df -h / | tail -1 | awk '{print "Disk Usage: " $5 " (Available: " $4 ")"}'

echo ""
echo "========================================"
echo "Deployment URLs:"
echo "  PWA:      https://points.trailscoffee.com"
echo "  Backend:  https://npubcash.trailscoffee.com"
echo "  Mint:     https://ecash.trailscoffee.com"
echo "========================================"
echo ""
echo "Next Steps:"
echo "  1. Visit https://points.trailscoffee.com in browser"
echo "  2. Test onboarding flow"
echo "  3. Register a test user"
echo "  4. Send test Lightning payment"
echo "  5. Monitor logs: pm2 logs npubcash-server"
echo ""
echo "Documentation:"
echo "  /var/www/trails-coffee/START-HERE.md"
echo "  /var/www/trails-coffee/DEPLOYMENT-CHECKLIST.md"
echo ""
```

---

## 🎉 **Deployment Complete!**

Your Trails Coffee PWA and npubcash-server are now deployed and running!

### **What's Working**:
- ✅ PWA at https://points.trailscoffee.com
- ✅ Backend at https://npubcash.trailscoffee.com
- ✅ PostgreSQL database
- ✅ SSL certificates
- ✅ Auto-start on boot
- ✅ Log rotation
- ✅ Daily backups

### **Useful Commands**:

```bash
# Check status
pm2 status
systemctl status nginx
systemctl status postgresql

# View logs
pm2 logs npubcash-server
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart npubcash-server
sudo systemctl restart nginx

# Update code
cd /var/www/trails-coffee
git pull origin trails-coffee-deployment
npm install
npm run build:pwa
sudo systemctl reload nginx

# Database access
sudo -u postgres psql -d npubcash
```

### **Monitoring**:

```bash
# Check running processes
pm2 monit

# Check server resources
htop

# Check database size
sudo -u postgres psql -d npubcash -c "SELECT pg_size_pretty(pg_database_size('npubcash'));"

# Check recent transactions
sudo -u postgres psql -d npubcash -c "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;"
```

---

## 🆘 **Troubleshooting**

### **Issue: PWA not loading**
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -50 /var/log/nginx/error.log

# Check if files exist
ls -la /var/www/trails-coffee/dist/pwa/
```

### **Issue: npubcash-server not responding**
```bash
# Check PM2
pm2 status
pm2 logs npubcash-server --lines 100

# Check port
sudo netstat -tulpn | grep 3000

# Restart
pm2 restart npubcash-server
```

### **Issue: Database connection error**
```bash
# Check PostgreSQL
systemctl status postgresql

# Test connection
sudo -u postgres psql -d npubcash -c "SELECT 1;"

# Check .env file
cat /var/www/npubcash-server/.env | grep DATABASE_URL
```

### **Issue: SSL certificate problems**
```bash
# Check certificates
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

---

## 📊 **Success Criteria**

- ✅ PWA accessible at https://points.trailscoffee.com
- ✅ Returns HTTP 200
- ✅ SSL certificate valid
- ✅ Service worker loads
- ✅ npubcash-server responds at https://npubcash.trailscoffee.com
- ✅ Registration endpoint works
- ✅ Database queries execute
- ✅ PM2 shows service online
- ✅ No errors in logs
- ✅ Can complete onboarding flow

---

**Total Deployment Time**: ~60-90 minutes
**Cost**: ~$10/month (VPS + existing infrastructure)
**Status**: Production Ready ✅


