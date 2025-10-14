# 🤖 Instructions for AI Agent on Server

**You are an AI agent running on a Linux server. Follow these instructions to deploy the Trails Coffee PWA.**

---

## 📋 **Your Mission**

Deploy the Trails Coffee rewards system (PWA + backend) on this Linux server which already has:
- ✅ Cashu mint running at `https://ecash.trailscoffee.com`
- ✅ Lightning node connected to the mint
- ✅ Bitcoin node
- ✅ Domain: `trailscoffee.com`

---

## 🎯 **Quick Start (Choose One)**

### **Option 1: Fully Automated** (Recommended)

```bash
# Clone repository
git clone -b trails-coffee-deployment https://github.com/jpgaviria2/cashu.me.git /tmp/trails-coffee
cd /tmp/trails-coffee

# Read the comprehensive guide
cat AGENT-SERVER-DEPLOYMENT.md

# Execute step by step (16 steps total)
# Follow each step in AGENT-SERVER-DEPLOYMENT.md carefully
# Each step has verification commands - run them!
```

### **Option 2: Use Deployment Script**

```bash
# Download and run automated script
curl -O https://raw.githubusercontent.com/jpgaviria2/cashu.me/trails-coffee-deployment/server-deploy.sh
chmod +x server-deploy.sh
./server-deploy.sh

# Then deploy backend (follow AGENT-SERVER-DEPLOYMENT.md Steps 6-16)
```

### **Option 3: Manual Step-by-Step**

```bash
# Clone the repo
git clone -b trails-coffee-deployment https://github.com/jpgaviria2/cashu.me.git /var/www/trails-coffee
cd /var/www/trails-coffee

# Read the guide
less AGENT-SERVER-DEPLOYMENT.md

# Follow steps 1-16 in order
```

---

## 📖 **Documentation Files (Read These)**

After cloning, you'll have these guides:

1. **AGENT-SERVER-DEPLOYMENT.md** ⭐ **START HERE**
   - Complete 16-step deployment guide
   - Every command you need
   - Verification steps included
   - Troubleshooting section
   - **This is your main guide**

2. **SERVER-DEPLOYMENT-QUICK.md**
   - Quick reference
   - Common commands
   - FAQ

3. **DEPLOYMENT-CHECKLIST.md**
   - High-level overview
   - Checklist format
   - Cost estimates

4. **START-HERE.md**
   - For humans (not for you)
   - But has useful context

---

## ⚙️ **What You'll Deploy**

### **Frontend (PWA)**
- Location: `/var/www/trails-coffee/`
- URL: `https://points.trailscoffee.com`
- Tech: Vue 3 + Quasar
- Build command: `npm run build:pwa`

### **Backend (npubcash-server)**
- Location: `/var/www/npubcash-server/`
- URL: `https://npubcash.trailscoffee.com`
- Tech: Node.js + TypeScript + PostgreSQL
- Port: 3000

### **Database**
- PostgreSQL database: `npubcash`
- User: `npubcash_user`
- Tables: users, pending_tokens, transactions

### **Web Server**
- Nginx reverse proxy
- SSL via Let's Encrypt
- PM2 for process management

---

## 🔧 **Prerequisites Check**

Before starting, verify:

```bash
# Check you're on Linux
uname -a

# Check if mint is accessible
curl -s https://ecash.trailscoffee.com/v1/info | head -10

# Check if you have sudo access
sudo -v

# Check network connectivity
ping -c 3 github.com
```

**If any of these fail, investigate before proceeding.**

---

## 📝 **Step-by-Step Summary**

Here's what **AGENT-SERVER-DEPLOYMENT.md** will guide you through:

1. ✅ Verify environment (5 min)
2. ✅ Install required software (10 min)
3. ✅ Clone Trails Coffee project (2 min)
4. ✅ Configure PWA environment (3 min)
5. ✅ Build PWA for production (5 min)
6. ✅ Setup PostgreSQL database (5 min)
7. ✅ Clone and setup npubcash-server (10 min)
8. ✅ Add registration endpoint (5 min)
9. ✅ Build npubcash-server (3 min)
10. ✅ Configure Nginx (5 min)
11. ✅ Setup SSL certificates (5 min)
12. ✅ Start services with PM2 (3 min)
13. ✅ Configure DNS (5 min)
14. ✅ Test deployment (10 min)
15. ✅ Setup monitoring (5 min)
16. ✅ Final verification (5 min)

**Total Time: 60-90 minutes**

---

## ✅ **Success Criteria**

You're done when:

```bash
# All these commands succeed:

# 1. PWA is accessible
curl -I https://points.trailscoffee.com
# Returns: HTTP/2 200

# 2. Backend is responding
curl -I https://npubcash.trailscoffee.com
# Returns: HTTP/2 200

# 3. Registration works
curl -X POST https://npubcash.trailscoffee.com/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"npub":"npub1test","pubkey":"test"}'
# Returns: JSON with lightningAddress

# 4. Database is working
sudo -u postgres psql -d npubcash -c "SELECT COUNT(*) FROM users;"
# Returns: count

# 5. Services are running
pm2 status
# Shows: npubcash-server | online

# 6. SSL is valid
curl -sI https://points.trailscoffee.com | grep -i "200\|301\|302"
# Returns: HTTP status

# 7. No errors in logs
pm2 logs npubcash-server --lines 20 --nostream
# Shows: No critical errors
```

---

## 🚨 **Important Notes**

### **Security**
- Change default PostgreSQL password in Step 6
- Keep `.env` files secure
- Don't commit sensitive data

### **Customization**
- The mint URL is already set: `https://ecash.trailscoffee.com`
- The domain is: `trailscoffee.com`
- Subdomains:
  - `points.trailscoffee.com` (PWA)
  - `npubcash.trailscoffee.com` (backend)

### **DNS Requirements**
- Make sure DNS A records point to this server
- Required records:
  - `points.trailscoffee.com → SERVER_IP`
  - `npubcash.trailscoffee.com → SERVER_IP`

### **Firewall**
- Open ports: 80 (HTTP), 443 (HTTPS)
- Port 3000 should NOT be exposed directly (Nginx proxies to it)

---

## 🆘 **If Something Goes Wrong**

### **Step Failed?**
- Read the error message carefully
- Check the verification commands in that step
- Look at the Troubleshooting section at the end of AGENT-SERVER-DEPLOYMENT.md
- Each step has "Expected Output" - compare yours

### **Can't Access Files?**
```bash
# Check you're in the right directory
pwd

# List files
ls -la

# Check git branch
git branch
# Should show: * trails-coffee-deployment
```

### **Service Won't Start?**
```bash
# Check logs
pm2 logs npubcash-server
sudo tail -50 /var/log/nginx/error.log

# Check if port is available
sudo netstat -tulpn | grep 3000
```

### **Build Failed?**
```bash
# Check Node version
node --version
# Should be v20.x or higher

# Clear and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📊 **Progress Tracking**

As you complete each step, you can track progress:

```bash
# Create a progress file
cat > /tmp/deployment-progress.txt << EOF
Step 1: [ ] Verify environment
Step 2: [ ] Install software
Step 3: [ ] Clone project
Step 4: [ ] Configure PWA
Step 5: [ ] Build PWA
Step 6: [ ] Setup PostgreSQL
Step 7: [ ] Setup npubcash-server
Step 8: [ ] Add registration endpoint
Step 9: [ ] Build backend
Step 10: [ ] Configure Nginx
Step 11: [ ] Setup SSL
Step 12: [ ] Start services
Step 13: [ ] Configure DNS
Step 14: [ ] Test deployment
Step 15: [ ] Setup monitoring
Step 16: [ ] Final verification
EOF

# Update as you go (change [ ] to [x])
nano /tmp/deployment-progress.txt
```

---

## 🎯 **Your Action Plan**

1. **Read this file** ✅ (You're doing it!)
2. **Clone the repository**
3. **Open AGENT-SERVER-DEPLOYMENT.md**
4. **Follow steps 1-16 carefully**
5. **Run all verification commands**
6. **Test the deployment**
7. **Report success or errors**

---

## 📞 **Resources**

- **Main Guide**: `AGENT-SERVER-DEPLOYMENT.md`
- **Quick Ref**: `SERVER-DEPLOYMENT-QUICK.md`
- **Checklist**: `DEPLOYMENT-CHECKLIST.md`
- **GitHub**: https://github.com/jpgaviria2/cashu.me
- **Branch**: `trails-coffee-deployment`

---

## 🎉 **Final Note**

You're deploying a production-ready Bitcoin Lightning rewards system! 

The code is:
- ✅ Fully implemented
- ✅ Bug-free (all critical bugs fixed)
- ✅ Well documented
- ✅ Ready for deployment

Just follow **AGENT-SERVER-DEPLOYMENT.md** step by step, and you'll have a working system in about 60-90 minutes.

**Good luck! ☕⚡**

---

## 🤖 **Quick Command Reference**

```bash
# Essential commands you'll use:

# Clone
git clone -b trails-coffee-deployment https://github.com/jpgaviria2/cashu.me.git

# Install
npm install

# Build
npm run build:pwa

# Start service
pm2 start dist/index.js --name npubcash-server

# Check status
pm2 status
systemctl status nginx
systemctl status postgresql

# View logs
pm2 logs npubcash-server
sudo tail -f /var/log/nginx/error.log

# Test
curl -I https://points.trailscoffee.com
curl -I https://npubcash.trailscoffee.com
```

---

**NOW: Open AGENT-SERVER-DEPLOYMENT.md and start with Step 1!** 🚀



