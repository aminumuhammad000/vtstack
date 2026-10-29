#!/bin/bash
# ==============================================================================
# VTStack VPS Automatic Setup Script
# Run this script on your Ubuntu/Debian VPS to prepare it for PalmPay & Node tasks
# ==============================================================================

set -e

echo "🚀 Starting VTStack VPS Setup..."

# 1. Update system packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential

# 2. Install Node.js (v20 LTS) & PM2
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Install PM2 process manager
sudo npm install -g pm2 tsx

# 4. Install Bun (for consensus-node if desired)
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
fi

# 5. Open necessary firewall ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable

# 6. Detect Public IPv4 Address
PUBLIC_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "UNKNOWN")

echo ""
echo "=================================================================="
echo "✅ VPS Setup Complete!"
echo "=================================================================="
echo "🌐 Your VPS Public Static IP is: $PUBLIC_IP"
echo ""
echo "👉 Copy this IP ($PUBLIC_IP) and paste it into:"
echo "   PalmPay Merchant Dashboard -> Security -> API IP Whitelist"
echo "=================================================================="
