# Deployment Checklist - Trails Coffee Rewards

Quick checklist to get everything running in production.

## ☑️ Pre-Deployment Checklist

### Backend Requirements
- [ ] Ubuntu VPS (2GB RAM, 20GB disk)
- [ ] PostgreSQL 15+ installed
- [ ] Node.js 18+ installed
- [ ] Domain: `npubcash.trailscoffee.com` points to server
- [ ] Blink wallet account with API key
- [ ] Cashu mint running at `ecash.trailscoffee.com`

### Accounts Needed
- [ ] Blink account: https://dashboard.blink.sv/
- [ ] Domain registrar access (for DNS)
- [ ] VPS provider account (DigitalOcean, Hetzner, etc.)

---

## 🚀 Quick Deploy Steps

### 1. Server Setup (30 minutes)
```bash
# Install everything
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib nginx certbot python3-certbot-nginx
npm install -g pm2
```

### 2. Database Setup (10 minutes)
```bash
sudo -u postgres psql
CREATE DATABASE npubcash;
CREATE USER npubcash_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE npubcash TO npubcash_user;
\q
```

### 3. Deploy Code (20 minutes)
```bash
mkdir -p /var/www/npubcash-server
cd /var/www/npubcash-server
# Upload your code here
npm install
```

### 4. Configure .env (5 minutes)
```bash
nano .env
# Paste your configuration
# See NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md for details
```

### 5. Add Registration Endpoint (15 minutes)
```bash
# Create registerController.ts
# Update routes.ts
# See NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md for code
```

### 6. Build and Start (5 minutes)
```bash
npm run build
pm2 start dist/index.js --name npubcash-server
pm2 save
pm2 startup
```

### 7. Configure Nginx (10 minutes)
```bash
nano /etc/nginx/sites-available/npubcash.trailscoffee.com
# Paste Nginx config
ln -s /etc/nginx/sites-available/npubcash.trailscoffee.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 8. SSL Certificate (5 minutes)
```bash
certbot --nginx -d npubcash.trailscoffee.com
```

### 9. Firewall (2 minutes)
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Server is running: `pm2 status`
- [ ] No errors in logs: `pm2 logs npubcash-server`
- [ ] API responds: `curl https://npubcash.trailscoffee.com/api/v1/register`
- [ ] LNURL works: `curl https://npubcash.trailscoffee.com/.well-known/lnurlp/test`
- [ ] Database is accessible: `psql -U npubcash_user -d npubcash`
- [ ] SSL certificate is valid: Check in browser

### Frontend Tests
- [ ] PWA loads: `https://points.trailscoffee.com`
- [ ] Onboarding works
- [ ] Lightning address is created
- [ ] No console errors (except expected ones)
- [ ] Registration succeeds (no more Network Error)
- [ ] Can copy Lightning address
- [ ] QR code displays

### Integration Tests
- [ ] Send test payment to Lightning address
- [ ] Payment appears in database
- [ ] Tokens are minted
- [ ] User can claim tokens in PWA
- [ ] Balance updates correctly

---

## 🔧 Quick Commands

### Server Management
```bash
# View logs
pm2 logs npubcash-server

# Restart server
pm2 restart npubcash-server

# Stop server
pm2 stop npubcash-server

# Server status
pm2 status
```

### Database Management
```bash
# Connect to database
psql -U npubcash_user -d npubcash

# View recent transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

# View users
SELECT * FROM users;

# Backup database
pg_dump -U npubcash_user npubcash > backup.sql
```

### Nginx Management
```bash
# Test config
nginx -t

# Reload
systemctl reload nginx

# View logs
tail -f /var/log/nginx/access.log
```

---

## 🆘 Quick Troubleshooting

### Problem: Server won't start
```bash
pm2 logs npubcash-server
# Check for database connection errors
systemctl status postgresql
```

### Problem: 502 Bad Gateway
```bash
# Check if server is running
pm2 status
# Check Nginx config
nginx -t
```

### Problem: Database connection failed
```bash
# Check PostgreSQL is running
systemctl status postgresql
# Test connection
psql -U npubcash_user -d npubcash
```

### Problem: Frontend shows Network Error
```bash
# Test API endpoint
curl https://npubcash.trailscoffee.com/api/v1/register
# Check CORS in server logs
pm2 logs npubcash-server
```

---

## 📊 Monitoring Setup (Optional)

### Log Monitoring
```bash
# Install logrotate for Nginx
apt install logrotate

# Set up log rotation for PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Uptime Monitoring
- Sign up for UptimeRobot: https://uptimerobot.com/
- Monitor: `https://npubcash.trailscoffee.com`
- Get alerts if server goes down

### Database Backup Automation
```bash
# Create backup script
nano /usr/local/bin/backup-npubcash.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/npubcash"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U npubcash_user npubcash > $BACKUP_DIR/npubcash_$TIMESTAMP.sql
# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
```

```bash
# Make executable
chmod +x /usr/local/bin/backup-npubcash.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-npubcash.sh
```

---

## 📝 Deployment Timeline

| Task | Time | Status |
|------|------|--------|
| Setup VPS | 30 min | ⏳ |
| Install software | 15 min | ⏳ |
| Configure PostgreSQL | 10 min | ⏳ |
| Get Blink API | 10 min | ⏳ |
| Deploy code | 20 min | ⏳ |
| Add registration endpoint | 15 min | ⏳ |
| Configure Nginx | 10 min | ⏳ |
| Setup SSL | 5 min | ⏳ |
| Configure firewall | 2 min | ⏳ |
| Testing | 30 min | ⏳ |
| **Total** | **~2.5 hours** | |

---

## 💰 Cost Breakdown

| Item | Cost | Provider Options |
|------|------|------------------|
| VPS | $5-10/month | DigitalOcean, Hetzner, Linode |
| Domain | $12/year | Already have? |
| SSL | Free | Let's Encrypt |
| PostgreSQL | Included | On VPS |
| Blink Account | Free | https://blink.sv |
| **Total** | **~$10/month** | |

---

## 🎯 Success Criteria

You're done when:

✅ Server is running without errors
✅ Frontend can register users
✅ Test payment works end-to-end
✅ Tokens can be claimed
✅ Logs are clean
✅ Backups are configured
✅ Monitoring is set up

---

## 📚 Reference Documents

- **Complete Guide**: `NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md`
- **Architecture**: `ARCHITECTURE.md`
- **Testing**: `TEST-ONBOARDING.md`
- **Bug Fixes**: `BUGFIXES-SESSION-2.md`

---

**Ready to deploy?** Start with the complete guide: `NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md`

**Need help?** Check troubleshooting section or review the logs.

**Questions?** All configuration details are in the complete deployment guide.


