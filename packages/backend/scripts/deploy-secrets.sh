#!/bin/bash

# Deployment script for FutManager Backend
# This script sets up the required secrets for Cloudflare Workers

echo "🚀 Setting up Cloudflare Workers secrets for FutManager Backend"
echo "=================================================="

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "❌ Error: .dev.vars file not found!"
    echo "Please create a .dev.vars file with your environment variables."
    exit 1
fi

# Source the .dev.vars file to get the variables
set -a
source .dev.vars
set +a

# Set secrets for production deployment
echo "🔐 Setting SUPABASE_URL secret..."
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL

echo "🔐 Setting SUPABASE_ANON_KEY secret..."
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY

echo "🔐 Setting SUPABASE_SERVICE_ROLE_KEY secret..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY

echo "✅ All secrets have been set successfully!"
echo "📦 Ready to deploy with: wrangler deploy"
