# Backend Quick Start - Get Running in 10 Minutes

**Want to test locally?** Follow this guide to get npubcash-server running on your machine.

---

## 🚀 Local Setup (Windows)

### Prerequisites
- ✅ Node.js installed (you already have this)
- ✅ PostgreSQL (we'll install)
- ✅ Blink wallet account (optional for testing)

---

## Step 1: Install PostgreSQL (5 minutes)

```powershell
# Install PostgreSQL 15
winget install PostgreSQL.PostgreSQL.15

# Wait for installation to complete...
# You'll be prompted for a password - remember it!
```

---

## Step 2: Create Database (2 minutes)

```powershell
# Open PowerShell as Administrator
# Connect to PostgreSQL (use password from Step 1)
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres

# In PostgreSQL shell, run these commands:
```

```sql
CREATE DATABASE npubcash;
CREATE USER npubcash_user WITH PASSWORD 'test123';
GRANT ALL PRIVILEGES ON DATABASE npubcash TO npubcash_user;
\q
```

---

## Step 3: Configure npubcash-server (2 minutes)

```powershell
cd C:\Users\JuanPabloGaviria\git\npubcash-server

# Create .env file
notepad .env
```

Paste this:
```env
PGUSER=npubcash_user
PGPASSWORD=test123
PGHOST=localhost
PGDATABASE=npubcash
PGPORT=5432
MINTURL=https://ecash.trailscoffee.com
BLINK_API_KEY=test
BLINK_WALLET_ID=test
BLINK_URL=https://api.blink.sv/graphql
JWT_SECRET=test_secret_key_at_least_64_characters_long_for_security_reasons
ZAP_SECRET_KEY=
LNURL_MIN_AMOUNT=1000
LNURL_MAX_AMOUNT=1000000000
HOSTNAME=localhost
PORT=8000
```

Save and close.

---

## Step 4: Add Registration Endpoint (3 minutes)

### Create `src/controller/registerController.ts`:

```powershell
notepad src\controller\registerController.ts
```

Paste this:
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

Save and close.

### Update `src/routes.ts`:

```powershell
notepad src\routes.ts
```

Add at the top with other imports:
```typescript
import { registerController } from "./controller/registerController";
```

Add this line after `const routes = Router();`:
```typescript
routes.post("/api/v1/register", registerController);
```

Save and close.

---

## Step 5: Install and Run (3 minutes)

```powershell
# Still in npubcash-server directory
npm install

# Run the server
npm run dev
```

**Expected output:**
```
starting server...
[Server running on port 8000]
```

---

## Step 6: Update Frontend Config (1 minute)

```powershell
# Open another PowerShell window
cd C:\Users\JuanPabloGaviria\git\cashu.me
```

Edit `src/stores/trailsIdentity.ts`:

Find this line:
```typescript
npubcashServerUrl: useLocalStorage<string>(
  "trails.npubcash.server",
  "https://npubcash.trailscoffee.com"
),
```

Change to:
```typescript
npubcashServerUrl: useLocalStorage<string>(
  "trails.npubcash.server",
  "http://localhost:8000"  // ← Changed to localhost
),
```

---

## Step 7: Test It! (2 minutes)

### Start the frontend (if not already running):
```powershell
npm run dev
```

### Open browser:
```
https://localhost:8080
```

### Clear storage and test:
1. F12 → Application → Clear site data
2. Refresh page
3. Click "Get Started"
4. Watch the console - registration should succeed! ✅

**Expected console output:**
```
Creating your secure identity...
Registering with Trails Coffee...
✅ Registration successful!
```

---

## 🎉 Success!

If you see:
- ✅ Lightning address created
- ✅ No "Network Error" message
- ✅ Address displayed in UI

**You're running locally!** 🚀

---

## 🧪 Test Registration API Directly

```powershell
# Test the endpoint
curl -X POST http://localhost:8000/api/v1/register `
  -H "Content-Type: application/json" `
  -d '{
    "npub": "npub1test",
    "pubkey": "test123",
    "username": "testuser"
  }'
```

---

## 🛑 Stop Servers

```powershell
# Frontend: Ctrl+C in the terminal running npm run dev
# Backend: Ctrl+C in the terminal running npubcash-server
```

---

## ⚠️ Limitations of Local Setup

**What Works:**
- ✅ User registration
- ✅ Database storage
- ✅ API endpoints

**What Doesn't Work:**
- ❌ Receiving real Lightning payments (needs Blink API)
- ❌ LNURL payments (needs real Lightning)
- ❌ SSL/HTTPS (localhost only)

**For production Lightning payments**, you need to:
1. Deploy to a server
2. Get Blink API credentials
3. Set up SSL certificate

See `NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md` for production deployment.

---

## 🔧 Troubleshooting

### PostgreSQL Connection Error
```powershell
# Check if PostgreSQL is running
Get-Service -Name postgresql*

# Start it if stopped
Start-Service postgresql-x64-15
```

### Port Already in Use
```powershell
# Change PORT in .env file
PORT=8001
```

### npm install fails
```powershell
# Clear cache and retry
npm cache clean --force
npm install
```

---

## 📚 Next Steps

**For Testing:**
- ✅ You're all set! Test the onboarding flow.

**For Production:**
- Read `DEPLOYMENT-CHECKLIST.md` (5 min)
- Follow `NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md` (2-3 hours)
- Get Blink API credentials
- Deploy to VPS

---

**Got it working?** Awesome! 🎉  
**Stuck?** Check `NPUBCASH-SERVER-DEPLOYMENT-COMPLETE.md` troubleshooting section.  
**Ready for production?** See `DEPLOYMENT-CHECKLIST.md`.

