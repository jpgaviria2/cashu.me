# Quick Server Deployment Guide

## 📦 **Clone the Project on Your Server**

The Trails Coffee project is now on GitHub and ready to clone!

### Option 1: Automated Script (Linux/Ubuntu)

```bash
# Download and run the deployment script
curl -O https://raw.githubusercontent.com/jpgaviria2/cashu.me/trails-coffee-deployment/server-deploy.sh
chmod +x server-deploy.sh
./server-deploy.sh
```

### Option 2: Manual Clone (Any OS)

```bash
# Clone the repository
git clone -b trails-coffee-deployment https://github.com/jpgaviria2/cashu.me.git trails-coffee
cd trails-coffee

# Install dependencies
npm install

# Start development server
npm run dev
```

### Option 3: Production Deployment

```bash
# Clone to production directory
sudo mkdir -p /var/www/trails-coffee
sudo chown $USER:$USER /var/www/trails-coffee
git clone -b trails-coffee-deployment https://github.com/jpgaviria2/cashu.me.git /var/www/trails-coffee
cd /var/www/trails-coffee

# Install dependencies
npm install

# Build for production
npm run build:pwa

# Serve with nginx (see DEPLOYMENT-CHECKLIST.md for nginx config)
```

---

## 🔧 **Configuration**

After cloning, create a `.env` file:

```bash
# Trails Coffee Configuration
PORT=9000
NODE_ENV=production
DOMAIN=trailscoffee.com
PUBLIC_URL=https://points.trailscoffee.com
MINT_URL=https://ecash.trailscoffee.com
NPUBCASH_SERVER_URL=https://npubcash.trailscoffee.com
```

---

## 📚 **Documentation**

Once cloned, read these files in order:

1. **START-HERE.md** - Quick start (5 minutes)
2. **DEPLOYMENT-CHECKLIST.md** - Complete deployment steps
3. **NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md** - Backend setup

---

## 🚀 **What's Included**

### Frontend (PWA)
- ✅ Frictionless onboarding flow
- ✅ Lightning address display
- ✅ Identity management
- ✅ Mint integration
- ✅ Beautiful UI components

### Backend (Needs Deployment)
- 📋 npubcash-server setup guide
- 📋 PostgreSQL configuration
- 📋 Nginx reverse proxy config
- 📋 SSL certificate setup

### Documentation (12+ files)
- Complete deployment guides
- Architecture diagrams
- Testing procedures
- Troubleshooting guides
- API documentation

---

## 🎯 **Quick Commands**

```bash
# Development
npm run dev                # Start dev server (http://localhost:9000)
npm run lint               # Check for errors
npm test                   # Run tests

# Production
npm run build:pwa          # Build PWA
npm run build:spa          # Build SPA
npm run build:ssr          # Build SSR

# Capacitor (Mobile)
npx cap sync               # Sync with mobile
npx cap open android       # Open Android Studio
npx cap open ios           # Open Xcode
```

---

## 🆘 **Need Help?**

### Common Issues

**Q: npm install fails**
```bash
# Clear cache and try again
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Q: Port 9000 already in use**
```bash
# Use different port
PORT=3000 npm run dev
```

**Q: Build fails**
```bash
# Check Node version (needs 18+)
node --version

# Update if needed
nvm install 20
nvm use 20
```

### Support

- **Documentation**: See README-TRAILS.md
- **Issues**: Check BUGFIXES-SESSION-2.md
- **Testing**: See TEST-ONBOARDING.md
- **Backend**: See DEPLOYMENT-CHECKLIST.md

---

## 📊 **What's Next**

### 1. Test Frontend (5 minutes)
```bash
npm run dev
# Visit http://localhost:9000
# Test onboarding flow
```

### 2. Deploy Backend (~2.5 hours)
```bash
# Follow DEPLOYMENT-CHECKLIST.md
# Deploy npubcash-server
# Configure PostgreSQL
# Setup SSL
```

### 3. Production Deploy
```bash
npm run build:pwa
# Serve with nginx
# Configure DNS
# Test end-to-end
```

---

## 🎉 **Success Criteria**

After deployment, verify:

- ✅ Browser opens to your domain
- ✅ Onboarding flow works
- ✅ Lightning address created
- ✅ Can copy address
- ✅ QR code displays
- ✅ Mint configured
- ✅ No console errors
- ✅ Backend registration succeeds

---

## 💰 **Costs**

- **VPS**: $5-10/month (DigitalOcean, Hetzner)
- **Domain**: Already have trailscoffee.com
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$10/month

---

## 🏆 **You're Ready!**

Everything you need is in this repository:

- ✅ Complete frontend implementation
- ✅ Beautiful UI components
- ✅ Comprehensive documentation
- ✅ Deployment scripts
- ✅ Testing guides
- ✅ Architecture diagrams

**Clone, configure, deploy, and enjoy your frictionless Bitcoin Lightning rewards system!** ☕⚡

---

**Questions?** Read START-HERE.md or DEPLOYMENT-CHECKLIST.md

