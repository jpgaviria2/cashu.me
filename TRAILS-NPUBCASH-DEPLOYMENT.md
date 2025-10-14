# Trails Coffee - npub.cash Server Deployment Guide

This guide walks through deploying your own npubcash-server instance for `npub@trailscoffee.com` Lightning addresses.

## Overview

The npubcash-server provides:
- **Lightning Addresses**: `npub1abc...@trailscoffee.com` format
- **Offline Receive**: Holds ecash tokens until users claim them
- **NIP-05 Verification**: Nostr identity verification
- **LNURL-pay**: Standard Lightning payment protocol

## Prerequisites

- Domain: `trailscoffee.com` with DNS access
- Server: VPS with Docker (2GB RAM minimum)
- Cashu Mint: Running mint instance
- PostgreSQL: Database for token storage

## Step 1: Clone and Configure

```bash
cd /opt
git clone https://github.com/cashubtc/npubcash-server.git
cd npubcash-server
```

Create `.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
DOMAIN=trailscoffee.com

# Database
DATABASE_URL=postgresql://npubcash:PASSWORD@localhost:5432/npubcash

# Cashu Mint
MINT_URL=https://mint.trailscoffee.com
MINT_KEYSET_ID=your_keyset_id

# Nostr Relays (comma-separated)
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band,wss://nos.lol

# Optional: Admin Authentication
ADMIN_NPUB=npub1your_admin_key_here
```

## Step 2: Setup PostgreSQL

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE npubcash;
CREATE USER npubcash WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE npubcash TO npubcash;
\q

# Run migrations
npm install
npm run migrate
```

## Step 3: Deploy with Docker

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  npubcash:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://npubcash:PASSWORD@postgres:5432/npubcash
      - DOMAIN=trailscoffee.com
      - MINT_URL=https://mint.trailscoffee.com
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=npubcash
      - POSTGRES_USER=npubcash
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Start services:

```bash
docker-compose up -d
```

## Step 4: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/npubcash`:

```nginx
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
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/npubcash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get Let's Encrypt SSL
sudo certbot --nginx -d npubcash.trailscoffee.com
```

## Step 5: Configure DNS

Add these DNS records to `trailscoffee.com`:

```
A     npubcash    YOUR_SERVER_IP
TXT   _lnurlp     https://npubcash.trailscoffee.com/.well-known/lnurlp/
```

## Step 6: Test the Deployment

```bash
# Test health endpoint
curl https://npubcash.trailscoffee.com/health

# Test NIP-05 lookup
curl https://npubcash.trailscoffee.com/.well-known/nostr.json?name=test

# Test LNURL-pay
curl https://npubcash.trailscoffee.com/.well-known/lnurlp/test
```

## Step 7: Update PWA Configuration

In `cashu.me/src/stores/trailsIdentity.ts`, update:

```typescript
npubcashServerUrl: useLocalStorage<string>(
  "trails.npubcash.server",
  "https://npubcash.trailscoffee.com"
),
```

## API Endpoints

### Register User
```bash
POST /api/register
{
  "npub": "npub1...",
  "pubkey": "hex_pubkey",
  "username": "optional_custom_name"
}
```

### Claim Pending Tokens
```bash
GET /api/claim?pubkey=hex_pubkey
```

### LNURL-pay (automatic)
```
GET /.well-known/lnurlp/{username}
```

### NIP-05 (automatic)
```
GET /.well-known/nostr.json?name={username}
```

## Monitoring

```bash
# View logs
docker-compose logs -f npubcash

# Check database
docker-compose exec postgres psql -U npubcash -d npubcash

# Monitor pending tokens
SELECT COUNT(*) FROM pending_tokens WHERE claimed = false;
```

## Security Considerations

1. **Rate Limiting**: Add rate limits to prevent abuse
2. **Token Expiry**: Implement expiry for unclaimed tokens (30 days recommended)
3. **Backup Database**: Regular PostgreSQL backups
4. **Firewall**: Only expose ports 80/443
5. **Admin Access**: Restrict admin endpoints to specific npubs

## Maintenance

### Clean up old tokens
```sql
DELETE FROM pending_tokens 
WHERE claimed = false 
AND created_at < NOW() - INTERVAL '30 days';
```

### Monitor disk usage
```bash
docker-compose exec postgres du -sh /var/lib/postgresql/data
```

## Troubleshooting

### Tokens not appearing
- Check mint connectivity: `curl $MINT_URL/v1/info`
- Verify keyset ID matches mint
- Check Nostr relay connectivity

### LNURL-pay not working
- Verify DNS TXT record for `_lnurlp`
- Check SSL certificate is valid
- Test with LNURL debugger: https://lnurl.fiatjaf.com/codec

### Database connection errors
- Check DATABASE_URL format
- Verify PostgreSQL is running
- Check firewall rules

## Next Steps

1. **Custom Branding**: Update landing page with Trails Coffee branding
2. **Analytics**: Add usage tracking
3. **Notifications**: Implement push notifications for received payments
4. **Webhooks**: Add webhook support for POS integration

## Support

- npubcash-server repo: https://github.com/cashubtc/npubcash-server
- Cashu Discord: https://discord.gg/cashu
- Nostr: naddr1...


