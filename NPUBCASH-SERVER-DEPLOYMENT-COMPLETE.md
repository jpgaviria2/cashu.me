# Complete npubcash-server Deployment Guide for Trails Coffee

## Overview

The npubcash-server is the backend that powers your Lightning addresses (`npub@trailscoffee.com`). It:
- Receives Lightning payments via LNURL
- Converts them to Cashu ecash tokens
- Holds tokens until users claim them
- Provides NIP-05 Nostr verification

## Prerequisites

### Required Software
- ✅ Node.js 18+ and npm (already installed)
- ✅ PostgreSQL database
- ✅ Lightning wallet with API access (Blink/Bitcoin Jungle)
- ✅ Domain with SSL certificate (`npubcash.trailscoffee.com`)
- ✅ Your Cashu mint running at `ecash.trailscoffee.com`

### Required Services
1. **PostgreSQL Database** - For storing user data and transactions
2. **Lightning Provider** - Currently uses Blink API for Lightning payments
3. **Cashu Mint** - Your existing `ecash.trailscoffee.com`

---

## Part 1: Local Development Setup (Testing)

### Step 1: Install Dependencies

```powershell
cd C:\Users\JuanPabloGaviria\git\npubcash-server
npm install
```

### Step 2: Set Up PostgreSQL Database

#### Option A: Install PostgreSQL Locally (Windows)

1. **Download PostgreSQL**
   ```powershell
   winget install PostgreSQL.PostgreSQL
   ```

2. **Create Database**
   ```powershell
   # Start PostgreSQL service
   Start-Service postgresql-x64-15

   # Connect to PostgreSQL (default password is what you set during install)
   psql -U postgres

   # In PostgreSQL shell:
   CREATE DATABASE npubcash;
   CREATE USER npubcash_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE npubcash TO npubcash_user;
   \q
   ```

#### Option B: Use Docker (Easier)

```powershell
# Pull and run PostgreSQL
docker run --name npubcash-postgres `
  -e POSTGRES_PASSWORD=your_secure_password `
  -e POSTGRES_USER=npubcash_user `
  -e POSTGRES_DB=npubcash `
  -p 5432:5432 `
  -d postgres:15
```

### Step 3: Set Up Blink Wallet API

1. **Get Blink API Credentials**
   - Go to https://dashboard.blink.sv/
   - Create an account or log in
   - Navigate to API section
   - Create a new API key
   - Copy your API key and wallet ID

2. **Alternative: Bitcoin Jungle**
   - If you prefer Bitcoin Jungle: https://app.bitcoinjungle.app/
   - Similar process to get API credentials

### Step 4: Configure Environment Variables

Create `.env` file in `npubcash-server` directory:

```env
# Database Configuration
PGUSER=npubcash_user
PGPASSWORD=your_secure_password
PGHOST=localhost
PGDATABASE=npubcash
PGPORT=5432

# Cashu Mint Configuration
MINTURL=https://ecash.trailscoffee.com

# Lightning Provider (Blink)
BLINK_API_KEY=blink_XXXXXXXXXXXXXXXXXXXXXXXX
BLINK_WALLET_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
BLINK_URL=https://api.blink.sv/graphql

# Security
JWT_SECRET=your_very_long_random_secret_string_here_at_least_64_characters_long

# Nostr Zaps (Optional - for receiving zaps)
ZAP_SECRET_KEY=your_nostr_private_key_in_hex

# LNURL Configuration
LNURL_MIN_AMOUNT=1000
LNURL_MAX_AMOUNT=1000000000

# Server Configuration
HOSTNAME=npubcash.trailscoffee.com
PORT=8000
```

**To generate JWT_SECRET:**
```powershell
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

### Step 5: Run Database Migrations

```powershell
npm run dev
```

This will automatically run the database migrations on first start.

### Step 6: Test Locally

```powershell
# Server should be running on http://localhost:8000

# Test the API
curl http://localhost:8000/api/v1/info
```

---

## Part 2: Production Deployment

### Option 1: Deploy to VPS (Recommended)

#### Requirements:
- Ubuntu 22.04 VPS
- 2GB RAM minimum
- 20GB disk space
- Domain pointing to server IP

#### Step 1: Prepare Server

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Certbot (SSL certificates)
apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
npm install -g pm2
```

#### Step 2: Set Up PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE npubcash;
CREATE USER npubcash_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE npubcash TO npubcash_user;
\q
```

#### Step 3: Clone and Configure

```bash
# Create app directory
mkdir -p /var/www/npubcash-server
cd /var/www/npubcash-server

# Clone or upload your code
git clone https://github.com/your-repo/npubcash-server.git .
# OR upload via scp/sftp

# Install dependencies
npm install

# Create .env file
nano .env
```

Paste your production environment variables (same as above, but update HOSTNAME and database settings).

#### Step 4: Build and Start

```bash
# Build the application
npm run build

# Start with PM2
pm2 start dist/index.js --name npubcash-server

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

#### Step 5: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/npubcash.trailscoffee.com
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name npubcash.trailscoffee.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/npubcash.trailscoffee.com /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

#### Step 6: Set Up SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
certbot --nginx -d npubcash.trailscoffee.com

# Follow the prompts
# Choose option 2 to redirect HTTP to HTTPS
```

#### Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

#### Step 8: Verify Deployment

```bash
# Check if server is running
pm2 status

# Check logs
pm2 logs npubcash-server

# Test API
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/test
```

---

## Part 3: Add Registration Endpoint (Required for Frontend)

The current npubcash-server doesn't have a `/api/v1/register` endpoint. We need to add it:

### Create Registration Controller

```bash
# On your server
cd /var/www/npubcash-server/src/controller
nano registerController.ts
```

```typescript
import { Request, Response } from "express";
import { User } from "../models";
import { nip19 } from "nostr-tools";

export async function registerController(req: Request, res: Response) {
  try {
    const { npub, pubkey, username } = req.body;

    if (!npub || !pubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: npub and pubkey"
      });
    }

    // Validate npub format
    try {
      const decoded = nip19.decode(npub as `npub1${string}`);
      if (decoded.type !== "npub" || decoded.data !== pubkey) {
        return res.status(400).json({
          success: false,
          error: "npub and pubkey do not match"
        });
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: "Invalid npub format"
      });
    }

    // Check if user already exists
    const existingUser = await User.getUserByPubkey(pubkey);
    if (existingUser) {
      return res.json({
        success: true,
        message: "User already registered",
        lightningAddress: `${npub}@${process.env.HOSTNAME}`,
        npub: npub,
        username: existingUser.name || username
      });
    }

    // Create user with default mint
    await User.upsertMintByPubkey(pubkey, process.env.MINTURL!);

    // If username provided and not taken, set it
    if (username) {
      const usernameExists = await User.checkIfUsernameExists(username);
      if (!usernameExists) {
        await User.upsertUsernameByPubkey(pubkey, username);
      }
    }

    return res.json({
      success: true,
      message: "Registration successful",
      lightningAddress: `${npub}@${process.env.HOSTNAME}`,
      npub: npub,
      username: username
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
}
```

### Update Routes

```bash
nano /var/www/npubcash-server/src/routes.ts
```

Add this line after the imports:
```typescript
import { registerController } from "./controller/registerController";
```

Add this route before the existing routes:
```typescript
routes.post("/api/v1/register", registerController);
```

### Rebuild and Restart

```bash
# Rebuild
npm run build

# Restart PM2
pm2 restart npubcash-server

# Check logs
pm2 logs npubcash-server
```

---

## Part 4: Testing the Complete Setup

### Test 1: Registration Endpoint

```powershell
# From your local machine
curl -X POST https://npubcash.trailscoffee.com/api/v1/register `
  -H "Content-Type: application/json" `
  -d '{
    "npub": "npub1test...",
    "pubkey": "hex_pubkey...",
    "username": "testuser"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Registration successful",
  "lightningAddress": "npub1test...@npubcash.trailscoffee.com",
  "npub": "npub1test...",
  "username": "testuser"
}
```

### Test 2: LNURL Endpoint

```powershell
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/npub1test...
```

Expected response:
```json
{
  "callback": "https://npubcash.trailscoffee.com/.well-known/lnurlp/npub1test...",
  "minSendable": 1000,
  "maxSendable": 1000000000,
  "metadata": "[[\"text/plain\", \"Pay to npub1test...\"]]",
  "tag": "payRequest"
}
```

### Test 3: Send a Test Payment

Use a Lightning wallet that supports LNURL-pay:
1. Scan QR code or paste Lightning address
2. Send a small amount (e.g., 10 sats)
3. Check if tokens appear in database

```bash
# On server
sudo -u postgres psql npubcash

# Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

# Check claims
SELECT * FROM claims ORDER BY created_at DESC LIMIT 10;
```

### Test 4: Claim Tokens from Frontend

1. Open your Cashu PWA: `https://points.trailscoffee.com`
2. Go through onboarding
3. Check console - registration should succeed
4. Click "Claim Pending Ecash" if you sent a test payment

---

## Part 5: Update Frontend Configuration

Now that the server is deployed, update your frontend:

```powershell
cd C:\Users\JuanPabloGaviria\git\cashu.me
```

The frontend is already configured to use:
- `npubcashServerUrl: "https://npubcash.trailscoffee.com"`
- `defaultMintUrl: "https://ecash.trailscoffee.com"`

These are set in `src/stores/trailsIdentity.ts`.

---

## Part 6: Monitoring and Maintenance

### View Logs

```bash
# Server logs
pm2 logs npubcash-server

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

### Restart Services

```bash
# Restart npubcash-server
pm2 restart npubcash-server

# Restart Nginx
systemctl restart nginx

# Restart PostgreSQL
systemctl restart postgresql
```

### Update Application

```bash
cd /var/www/npubcash-server

# Pull latest changes
git pull

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart npubcash-server
```

### Backup Database

```bash
# Create backup
pg_dump -U npubcash_user npubcash > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U npubcash_user npubcash < backup_20250101.sql
```

---

## Part 7: Security Checklist

- [ ] PostgreSQL is not accessible from outside (firewall rule)
- [ ] Strong database password
- [ ] JWT_SECRET is long and random (64+ characters)
- [ ] SSL certificate is valid and auto-renewing
- [ ] Firewall only allows ports 22, 80, 443
- [ ] PM2 is set to restart on system reboot
- [ ] Regular database backups configured
- [ ] Blink API key is kept secret
- [ ] Server is kept updated (`apt update && apt upgrade`)

---

## Part 8: Troubleshooting

### Server Won't Start

```bash
# Check logs
pm2 logs npubcash-server

# Common issues:
# 1. Database connection failed - check PostgreSQL is running
systemctl status postgresql

# 2. Port already in use - check what's on port 8000
netstat -tlnp | grep 8000

# 3. Environment variables missing - check .env file
cat .env
```

### Database Connection Error

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U npubcash_user -d npubcash -h localhost

# Check password in .env matches database
```

### SSL Certificate Issues

```bash
# Renew certificate
certbot renew

# Test certificate
certbot certificates

# If broken, remove and recreate
certbot delete -d npubcash.trailscoffee.com
certbot --nginx -d npubcash.trailscoffee.com
```

### Frontend Still Shows Error

1. **Clear browser cache and localStorage**
   - DevTools → Application → Clear storage

2. **Check CORS settings**
   ```bash
   # On server, check if CORS is configured
   nano /var/www/npubcash-server/src/app.ts
   ```

3. **Verify DNS**
   ```powershell
   nslookup npubcash.trailscoffee.com
   ```

4. **Test API directly**
   ```powershell
   curl https://npubcash.trailscoffee.com/api/v1/register
   ```

---

## Summary

### What You Need:

1. **Server**: Ubuntu VPS with 2GB RAM
2. **Database**: PostgreSQL 15+
3. **Lightning**: Blink account with API key
4. **Domain**: `npubcash.trailscoffee.com` with SSL
5. **Mint**: Your existing `ecash.trailscoffee.com`

### Steps:

1. ✅ Set up VPS and install software
2. ✅ Configure PostgreSQL database
3. ✅ Get Blink API credentials
4. ✅ Deploy npubcash-server code
5. ✅ Add registration endpoint
6. ✅ Configure Nginx reverse proxy
7. ✅ Set up SSL certificate
8. ✅ Test registration and payments

### Estimated Time:

- **Setup**: 2-3 hours (first time)
- **Testing**: 30 minutes
- **Total**: 3-4 hours

### Cost Estimate:

- VPS: $5-10/month (DigitalOcean, Hetzner, etc.)
- Domain: $12/year (if you don't have it)
- SSL: Free (Let's Encrypt)
- **Total**: ~$10/month

---

## Next Steps

Once deployed:

1. Test the full flow (onboard → receive payment → claim)
2. Monitor logs for errors
3. Set up automated backups
4. Configure monitoring (optional: UptimeRobot, etc.)
5. Launch to beta users!

**Need help with deployment? Let me know which step you're on!**




