#!/bin/bash

# Complete deployment script for FutManager Backend
# This script handles secrets setup and deployment

set -e  # Exit on any error

echo "🚀 FutManager Backend Deployment Script"
echo "======================================="

# Check if we're in the correct directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found!"
    echo "Please run this script from the backend package directory."
    exit 1
fi

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "❌ Error: .dev.vars file not found!"
    echo "Please create a .dev.vars file with your environment variables."
    exit 1
fi

# Ask user if they want to update secrets
echo "🔐 Do you want to update Cloudflare Workers secrets? (y/N)"
read -r update_secrets

if [[ $update_secrets =~ ^[Yy]$ ]]; then
    echo "📋 Updating secrets from .dev.vars..."
    
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

    echo "✅ All secrets have been updated!"
else
    echo "⏭️  Skipping secrets update..."
fi

# Deploy the worker
echo "📦 Deploying to Cloudflare Workers..."
wrangler deploy

echo "🎉 Deployment completed successfully!"
echo "🌐 Your FutManager backend is now live!"
