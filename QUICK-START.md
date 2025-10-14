# Trails Coffee Rewards - Quick Start Guide

## 🚀 Get Running in 15 Minutes

### Step 1: Test the New Onboarding (2 minutes)

```bash
cd c:\Users\JuanPabloGaviria\git\cashu.me
npm install
npm run dev
```

Visit: `http://localhost:9000/onboarding`

You should see the beautiful new onboarding flow!

### Step 2: Configure Your Mint (3 minutes)

Edit `src/stores/trailsIdentity.ts` line 34:

```typescript
npubcashServerUrl: useLocalStorage<string>(
  "trails.npubcash.server",
  "https://npubcash.trailscoffee.com" // Update this to your domain
),
```

### Step 3: Deploy npubcash-server (10 minutes)

```bash
# On your VPS
cd /opt
git clone https://github.com/cashubtc/npubcash-server.git
cd npubcash-server

# Create .env
cat > .env << EOF
PORT=3000
NODE_ENV=production
DOMAIN=trailscoffee.com
DATABASE_URL=postgresql://npubcash:PASSWORD@localhost:5432/npubcash
MINT_URL=https://mint.trailscoffee.com
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band
EOF

# Install and run
npm install
npm run migrate
npm run build
npm start
```

Setup nginx reverse proxy:

```bash
sudo nano /etc/nginx/sites-available/npubcash

# Add:
server {
    listen 80;
    server_name npubcash.trailscoffee.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}

sudo ln -s /etc/nginx/sites-available/npubcash /etc/nginx/sites-enabled/
sudo certbot --nginx -d npubcash.trailscoffee.com
sudo systemctl reload nginx
```

### Step 4: Test End-to-End

1. Open PWA: `http://localhost:9000/onboarding`
2. Click "Get Started"
3. Watch automatic account creation
4. Copy your Lightning address
5. Send a test payment to it
6. Watch it appear in your wallet!

## 🎯 What You Get

### For Users
- ✅ No seed phrases to write down
- ✅ Lightning address: `npub1...@trailscoffee.com`
- ✅ Tap to pay with Boltcard (coming soon)
- ✅ Offline payments via Bluetooth (coming soon)

### For Your Business
- ✅ Frictionless customer onboarding
- ✅ Self-custodial (no liability)
- ✅ Offline-capable
- ✅ Physical card option

## 📱 Next Steps

### This Week
1. ✅ Test onboarding flow
2. ✅ Deploy npubcash-server
3. ⏳ Update PWA config with your domains

### Next Week
4. ⏳ Build Bluetooth mesh plugin
5. ⏳ Deploy boltcard-nwc backend
6. ⏳ Order NTAG424 DNA cards

### Next Month
7. ⏳ Beta test with customers
8. ⏳ Launch marketing campaign
9. ⏳ Train staff

## 📚 Documentation

- **Full Summary**: `TRAILS-COFFEE-IMPLEMENTATION-SUMMARY.md`
- **npubcash Deploy**: `TRAILS-NPUBCASH-DEPLOYMENT.md`
- **Bluetooth Mesh**: `BLUETOOTH-MESH-INTEGRATION.md`
- **Boltcard NFC**: `BOLTCARD-NFC-INTEGRATION.md`

## 🆘 Troubleshooting

### Onboarding page doesn't load
- Check route is added in `src/router/routes.js`
- Clear browser cache
- Check console for errors

### Lightning address not working
- Verify npubcash-server is running
- Check DNS is configured
- Test with: `curl https://npubcash.trailscoffee.com/health`

### Can't claim pending payments
- Check npubcash-server logs
- Verify mint connection
- Check Nostr relay connectivity

## 💬 Need Help?

All the code is ready to go. Key files:

- Identity: `src/stores/trailsIdentity.ts`
- Onboarding: `src/pages/OnboardingPage.vue`
- Identity Card: `src/components/TrailsIdentityCard.vue`
- Auto-init: `src/App.vue`

Ready to launch! 🚀☕⚡





