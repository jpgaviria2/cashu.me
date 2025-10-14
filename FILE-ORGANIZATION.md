# File Organization - Trails Coffee Rewards Documentation

**Date:** October 14, 2025

---

## 📋 **TL;DR - What to Read First**

For tomorrow's agent/session:

1. **`TRAILS-MASTER-SUMMARY.md`** ← START HERE (comprehensive overview)
2. **`SESSION-SUMMARY-OCT-14-2025.md`** (today's Lightning address fix)
3. **`cashu.me/AGENT-SERVER-DEPLOYMENT.md`** (backend deployment guide)

---

## 📂 **Main Git Folder Files**

### **Current / Active Files** ✅

These are the most up-to-date and should be read first:

| File | Date | Topic | Priority |
|------|------|-------|----------|
| **TRAILS-MASTER-SUMMARY.md** | Oct 14 | **Complete project overview** | 🔥 **READ FIRST** |
| **SESSION-SUMMARY-OCT-14-2025.md** | Oct 14 | Lightning address fix (concise) | ⭐ High |
| **SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md** | Oct 14 | Lightning address fix (detailed) | ⭐ High |
| **FILE-ORGANIZATION.md** | Oct 14 | This file (file guide) | 📖 Reference |

---

### **Historical / Reference Files** 📦

These are from October 13 onboarding implementation. Keep for reference:

| File | Date | Topic | Status |
|------|------|-------|--------|
| **TRAILS-SESSION-SUMMARY.md** | Oct 13 | Onboarding implementation | 📦 Historical |
| **TRAILS-START-HERE.md** | Oct 13 | Quick start (onboarding) | 📦 Historical |
| **TRAILS-COFFEE-IMPLEMENTATION.md** | Oct 13 | Implementation complete | 📦 Historical |
| **TRAILS-QUICK-REFERENCE.md** | Oct 13 | Quick commands | 📦 Historical |
| **TRAILS-README.md** | Oct 13 | Documentation index | 📦 Historical |
| **TRAILS-CHANGES.md** | Oct 13 | Changes made | 📦 Historical |

**Note:** These files are still valuable for understanding the onboarding implementation, but the latest Lightning address fix supersedes some information.

---

## 🗂️ **Recommendation: Keep or Archive?**

### **KEEP in Main Folder** (Active Documentation)

✅ **TRAILS-MASTER-SUMMARY.md** - Master overview (this is the single source of truth)  
✅ **SESSION-SUMMARY-OCT-14-2025.md** - Latest session (concise)  
✅ **SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md** - Latest session (detailed)  
✅ **FILE-ORGANIZATION.md** - This file

### **ARCHIVE** (Move to `archive/` folder)

📦 **TRAILS-SESSION-SUMMARY.md** - Oct 13 onboarding  
📦 **TRAILS-START-HERE.md** - Oct 13 onboarding  
📦 **TRAILS-COFFEE-IMPLEMENTATION.md** - Oct 13 summary  
📦 **TRAILS-QUICK-REFERENCE.md** - Oct 13 quick ref  
📦 **TRAILS-README.md** - Oct 13 index  
📦 **TRAILS-CHANGES.md** - Oct 13 changes

**Reason:** These files are from the onboarding implementation session (Oct 13). While valuable for historical reference, they don't include the Lightning address domain fix work from Oct 14. The **TRAILS-MASTER-SUMMARY.md** consolidates all relevant information.

---

## 📁 **Project Repositories**

### **cashu.me** (Frontend PWA)

**Location:** `C:\Users\JuanPabloGaviria\git\cashu.me`  
**GitHub:** https://github.com/jpgaviria2/cashu.me

**Key Documentation Files:**
- ✅ `AGENT-SERVER-DEPLOYMENT.md` - 16-step deployment guide
- ✅ `AI-AGENT-START-HERE.md` - Entry point for server agents
- ✅ `FIX-LIGHTNING-ADDRESS.md` - Debugging guide
- ✅ `CADDY-LIGHTNING-ADDRESS-SETUP.md` - Caddy configuration
- ✅ `HOTFIX-LIGHTNING-ADDRESS-DOMAIN.md` - Frontend fix details
- ✅ `diagnose-lightning.sh` - Automated diagnostic script
- ✅ `server-deploy.sh` - Automated deployment script

**Also Contains (Oct 13 docs):**
- `IMPLEMENTATION-PHASE-1-COMPLETE.md`
- `TEST-ONBOARDING.md`
- `QUICK-REFERENCE.md`
- `ARCHITECTURE.md`
- `TRAILS-NPUBCASH-DEPLOYMENT.md`
- Plus more...

### **trails_landing** (Hostinger Website)

**Location:** `C:\Users\JuanPabloGaviria\git\trails_landing`  
**GitHub:** https://github.com/jpgaviria2/trails_landing

**Key Documentation Files:**
- ✅ `LIGHTNING-ADDRESS-HOSTINGER-SETUP.md` - Hostinger proxy setup
- ✅ `SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md` - Detailed session notes

### **npubcash-server** (Backend API)

**Location:** `/home/ln/git/npubcash-server` (on VPS)  
**GitHub:** (private repository on server)

**Status:** Code ready, pending push to GitHub

---

## 🎯 **For Tomorrow's Agent**

### **Step 1: Read These Files First** (15 minutes)

1. **`TRAILS-MASTER-SUMMARY.md`** - Complete overview (10 min)
2. **`SESSION-SUMMARY-OCT-14-2025.md`** - Latest work (5 min)

### **Step 2: If Deploying Backend** (30 minutes)

3. **`cashu.me/AGENT-SERVER-DEPLOYMENT.md`** - Full deployment guide
4. **`cashu.me/CADDY-LIGHTNING-ADDRESS-SETUP.md`** - Caddy configuration
5. **`cashu.me/FIX-LIGHTNING-ADDRESS.md`** - Debugging guide

### **Step 3: If Issues Arise**

6. **`cashu.me/diagnose-lightning.sh`** - Run this script
7. **`SESSION-SUMMARY-LIGHTNING-ADDRESS-SETUP.md`** - Detailed troubleshooting

---

## 📊 **Documentation Hierarchy**

```
Main Git Folder
├── TRAILS-MASTER-SUMMARY.md          ← START HERE (master overview)
├── SESSION-SUMMARY-OCT-14-2025.md    ← Latest work (concise)
├── SESSION-SUMMARY-LIGHTNING...md     ← Latest work (detailed)
├── FILE-ORGANIZATION.md               ← This file
│
├── archive/ (suggested)
│   ├── TRAILS-SESSION-SUMMARY.md      (Oct 13)
│   ├── TRAILS-START-HERE.md           (Oct 13)
│   ├── TRAILS-COFFEE-IMPLEMENTATION.md(Oct 13)
│   ├── TRAILS-QUICK-REFERENCE.md      (Oct 13)
│   ├── TRAILS-README.md               (Oct 13)
│   └── TRAILS-CHANGES.md              (Oct 13)
│
cashu.me/
├── AGENT-SERVER-DEPLOYMENT.md         ← Backend deployment
├── AI-AGENT-START-HERE.md             ← Server agent start
├── CADDY-LIGHTNING-ADDRESS-SETUP.md   ← Caddy config
├── FIX-LIGHTNING-ADDRESS.md           ← Debugging
├── HOTFIX-LIGHTNING-ADDRESS-DOMAIN.md ← Frontend fix
├── diagnose-lightning.sh              ← Diagnostics
├── server-deploy.sh                   ← Automation
└── [many more documentation files]
│
trails_landing/
├── LIGHTNING-ADDRESS-HOSTINGER-SETUP.md ← Hostinger proxy
└── SESSION-SUMMARY-LIGHTNING...md       ← Session notes
```

---

## ✅ **File Status Summary**

| Category | Count | Status |
|----------|-------|--------|
| **Current (Oct 14)** | 4 files | ✅ Active - Keep in root |
| **Historical (Oct 13)** | 6 files | 📦 Archive - Move to subfolder |
| **cashu.me docs** | 20+ files | ✅ Active - Keep in repo |
| **trails_landing docs** | 2 files | ✅ Active - Keep in repo |

---

## 🚀 **Suggested Actions**

### **Option 1: Archive Historical Files** (Recommended)

```powershell
# Create archive folder
cd C:\Users\JuanPabloGaviria\git
mkdir archive-oct13

# Move historical files
Move-Item TRAILS-SESSION-SUMMARY.md archive-oct13/
Move-Item TRAILS-START-HERE.md archive-oct13/
Move-Item TRAILS-COFFEE-IMPLEMENTATION.md archive-oct13/
Move-Item TRAILS-QUICK-REFERENCE.md archive-oct13/
Move-Item TRAILS-README.md archive-oct13/
Move-Item TRAILS-CHANGES.md archive-oct13/
```

**Result:** Clean main folder with only current documentation.

### **Option 2: Keep All Files** (Alternative)

If you prefer to keep all files in the main folder:
- Just read **TRAILS-MASTER-SUMMARY.md** first
- It consolidates everything you need to know
- Historical files are there if you need to reference them

---

## 💡 **Quick Decision Tree**

**Are you starting fresh tomorrow?**  
→ Read **TRAILS-MASTER-SUMMARY.md** (10 min)

**Need to deploy backend?**  
→ Read **cashu.me/AGENT-SERVER-DEPLOYMENT.md** (20 min)

**Debugging Lightning address issues?**  
→ Read **cashu.me/FIX-LIGHTNING-ADDRESS.md** (15 min)

**Want to understand onboarding implementation?**  
→ Read **archive/TRAILS-SESSION-SUMMARY.md** (15 min)

**Need quick commands?**  
→ See "Quick Commands" section in **TRAILS-MASTER-SUMMARY.md**

---

## 🎯 **Key Takeaway**

**For Tomorrow:**
1. Start with **TRAILS-MASTER-SUMMARY.md**
2. Then read **SESSION-SUMMARY-OCT-14-2025.md**
3. Deploy backend using **cashu.me/AGENT-SERVER-DEPLOYMENT.md**
4. Test using procedures in **TRAILS-MASTER-SUMMARY.md**

**That's it!** 90% of what you need is in the master summary.

---

**Created:** October 14, 2025  
**Purpose:** Help organize and prioritize documentation  
**Next Review:** When starting tomorrow's session



