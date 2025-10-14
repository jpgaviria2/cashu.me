#!/bin/bash
#
# Trails Coffee - Server Deployment Script
# Run this on your VPS to clone and setup the project
#

set -e  # Exit on error

echo "🚀 Trails Coffee Server Deployment"
echo "======================================"
echo ""

# Configuration
REPO_URL="https://github.com/jpgaviria2/cashu.me.git"
BRANCH="trails-coffee-deployment"
INSTALL_DIR="/var/www/trails-coffee"
NODE_VERSION="20"

echo "📋 Configuration:"
echo "  Repository: $REPO_URL"
echo "  Branch: $BRANCH"
echo "  Install Directory: $INSTALL_DIR"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please don't run as root. Run as your regular user with sudo when needed."
   exit 1
fi

# Install Node.js if not present
echo "1️⃣  Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Git if not present
echo ""
echo "2️⃣  Checking Git..."
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get update
    sudo apt-get install -y git
else
    echo "✅ Git already installed: $(git --version)"
fi

# Create install directory
echo ""
echo "3️⃣  Setting up directory..."
sudo mkdir -p "$INSTALL_DIR"
sudo chown $USER:$USER "$INSTALL_DIR"

# Clone repository
echo ""
echo "4️⃣  Cloning repository..."
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "📂 Directory exists, pulling latest changes..."
    cd "$INSTALL_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    echo "📥 Cloning fresh copy..."
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo ""
echo "5️⃣  Installing dependencies..."
npm install

# Create .env file if it doesn't exist
echo ""
echo "6️⃣  Configuration..."
if [ ! -f .env ]; then
    echo "📝 Creating .env file template..."
    cat > .env << 'EOF'
# Trails Coffee Configuration
# Update these values before running in production

# Server
PORT=9000
NODE_ENV=production
DOMAIN=trailscoffee.com

# Frontend URL
PUBLIC_URL=https://points.trailscoffee.com

# Mint Configuration
MINT_URL=https://ecash.trailscoffee.com

# npubcash Server (for backend)
NPUBCASH_SERVER_URL=https://npubcash.trailscoffee.com

# Optional: Analytics, monitoring, etc.
# Add your configuration here
EOF
    echo "⚠️  Please edit .env file with your configuration!"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Installation Complete!"
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Edit configuration:"
echo "   nano $INSTALL_DIR/.env"
echo ""
echo "2. Start development server:"
echo "   cd $INSTALL_DIR"
echo "   npm run dev"
echo ""
echo "3. Or build for production:"
echo "   cd $INSTALL_DIR"
echo "   npm run build:pwa"
echo ""
echo "4. Deploy backend (npubcash-server):"
echo "   See: $INSTALL_DIR/DEPLOYMENT-CHECKLIST.md"
echo ""
echo "📖 Documentation available at:"
echo "   - Quick Start: $INSTALL_DIR/START-HERE.md"
echo "   - Deployment: $INSTALL_DIR/DEPLOYMENT-CHECKLIST.md"
echo "   - Full Guide: $INSTALL_DIR/README-TRAILS.md"
echo ""
echo "🎉 Ready to revolutionize coffee shop loyalty with Bitcoin Lightning! ☕⚡"



