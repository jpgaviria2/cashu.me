# Testing the New Onboarding Flow

## Quick Start

```bash
cd c:\Users\JuanPabloGaviria\git\cashu.me
npm install
npm run dev
```

The app should start at `http://localhost:9000`

## Test Scenarios

### Scenario 1: New User Onboarding

1. **Clear existing data** (to simulate new user):
   - Open browser DevTools (F12)
   - Go to Application tab → Storage
   - Click "Clear site data"
   - Refresh page

2. **Expected behavior**:
   - App redirects to `/onboarding`
   - Shows welcome screen with "Get Started" button

3. **Click "Get Started"**:
   - Should show loading screen with status messages:
     - "Generating secure keys..."
     - "Creating your Lightning address..."
     - "Registering with Trails Coffee..."
     - "Setting up your wallet..."

4. **Success screen**:
   - Shows "Account Created!"
   - Displays Lightning address: `npub1...@trailscoffee.com`
   - Shows short npub
   - Has "Copy Address" button
   - Has "Continue" and "Setup Backup (Optional)" buttons

5. **Click "Continue"**:
   - Shows "How It Works" screen
   - Explains: Shop → Earn → Redeem

6. **Click "Start Earning Rewards"**:
   - Redirects to main wallet page
   - Should show TrailsIdentityCard at top
   - Should show Trails Coffee mint (ecash.trailscoffee.com)

### Scenario 2: Existing User

1. **After completing onboarding once**:
   - Close and reopen app
   - Should go directly to wallet page (no onboarding)
   - Should show identity card with Lightning address

2. **Identity card features**:
   - Shows Lightning address
   - Shows short npub
   - Has "Copy" button (test it!)
   - Has "QR Code" button (test it!)
   - Shows "Active" status chip

### Scenario 3: Test Lightning Address

1. **Copy your Lightning address** from the identity card

2. **Test with a Lightning wallet** (if you have one):
   - Try sending a small amount to your address
   - Note: This requires npubcash-server to be deployed
   - Without server, registration will fail gracefully

### Scenario 4: Test Mint Integration

1. **Check mint is configured**:
   - Go to wallet page
   - Click on balance area
   - Should see "Trails Coffee" mint
   - URL: `https://ecash.trailscoffee.com`

2. **Test receiving tokens** (if mint is working):
   - Click "Receive" button
   - Generate invoice
   - Pay from another wallet
   - Tokens should appear

## Expected Console Output

When starting the app, you should see:

```
### Subscribing to NIP-17 direct messages to <pubkey> since <timestamp>
Mint URL https://ecash.trailscoffee.com
Wallet URL http://localhost:9000/
Active mint keysets: [...]
```

## Troubleshooting

### Issue: Onboarding doesn't start

**Check**:
- Is `/onboarding` route added? (src/router/routes.js)
- Clear localStorage and try again
- Check console for errors

**Fix**:
```javascript
// In browser console:
localStorage.removeItem('trails.onboarding.complete')
location.reload()
```

### Issue: Lightning address not showing

**Check**:
- Is identity initialized? Check localStorage:
```javascript
localStorage.getItem('trails.identity.profile')
```

**Expected**:
```json
{
  "npub": "npub1...",
  "lightningAddress": "npub1...@trailscoffee.com",
  "registered": false,
  "nip05": "npub1...@trailscoffee.com"
}
```

### Issue: Mint not loading

**Check**:
1. Is mint URL correct? `https://ecash.trailscoffee.com`
2. Can you access it? Try in browser
3. Check mint info endpoint:
   ```bash
   curl https://ecash.trailscoffee.com/v1/info
   ```

**Expected response**:
```json
{
  "name": "Trails Coffee Mint",
  "pubkey": "...",
  "version": "...",
  "nuts": {...}
}
```

### Issue: TrailsIdentityCard not showing

**Check**:
1. Is component imported in WalletPage.vue?
2. Is identityStore computed property defined?
3. Check if profile exists:
```javascript
// In browser console:
useTrailsIdentityStore().profile
```

## What's Working vs. What Needs Backend

### ✅ Working Now (Frontend Only)

- Onboarding flow UI
- Identity generation (npub from seed)
- Lightning address display
- QR code generation
- Copy to clipboard
- Mint integration (ecash.trailscoffee.com)
- Local storage persistence

### ⏳ Needs Backend Deployment

- Lightning address registration (npubcash-server)
- Actual payment receiving
- Token custody and claiming
- NIP-05 verification

## Next Steps After Testing

1. **If onboarding works**:
   - Deploy npubcash-server
   - Update server URL in trailsIdentity.ts
   - Test end-to-end payment flow

2. **If mint works**:
   - Test receiving/sending tokens
   - Verify balance updates
   - Test transaction history

3. **If everything works**:
   - Build for production
   - Deploy PWA
   - Start beta testing with customers!

## Manual Testing Checklist

- [ ] New user onboarding completes successfully
- [ ] Lightning address is generated
- [ ] Identity card shows on wallet page
- [ ] Copy address button works
- [ ] QR code dialog opens
- [ ] Mint is configured (ecash.trailscoffee.com)
- [ ] Can navigate to settings
- [ ] Can see seed phrase in settings (backup section)
- [ ] App persists identity after refresh
- [ ] No console errors

## Success Criteria

✅ User can complete onboarding in < 30 seconds
✅ No seed phrase shown during onboarding
✅ Lightning address is visible and copyable
✅ Mint is automatically configured
✅ Identity persists across sessions

Ready to test! 🚀





