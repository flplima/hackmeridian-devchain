#!/bin/bash
set -e

# Configuration
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Check if required environment variables are set
if [ -z "$STELLAR_SECRET_KEY" ]; then
    echo "❌ Error: STELLAR_SECRET_KEY environment variable is required"
    echo "Set it with: export STELLAR_SECRET_KEY=your_secret_key_here"
    exit 1
fi

if [ -z "$ADMIN_ADDRESS" ]; then
    echo "❌ Error: ADMIN_ADDRESS environment variable is required"
    echo "Set it with: export ADMIN_ADDRESS=your_admin_address_here"
    exit 1
fi

echo "🚀 Deploying certificate contract to $NETWORK..."

# Build the contract first
echo "Building contract..."
./scripts/build.sh

# Deploy the contract
echo "Deploying contract..."
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/certificate_contract.wasm \
  --source "$STELLAR_SECRET_KEY" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

if [ $? -eq 0 ] && [ -n "$CONTRACT_ID" ]; then
    echo "✅ Contract deployed successfully!"
    echo "Contract ID: $CONTRACT_ID"

    # Initialize the contract
    echo "Initializing contract..."
    soroban contract invoke \
      --id "$CONTRACT_ID" \
      --source "$STELLAR_SECRET_KEY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      -- \
      initialize \
      --admin "$ADMIN_ADDRESS"

    if [ $? -eq 0 ]; then
        echo "✅ Contract initialized successfully!"
        echo ""
        echo "📝 Contract Details:"
        echo "   Contract ID: $CONTRACT_ID"
        echo "   Admin: $ADMIN_ADDRESS"
        echo "   Network: $NETWORK"
        echo ""
        echo "Save this Contract ID for future interactions!"

        # Save contract ID to file
        echo "$CONTRACT_ID" > contract_id.txt
        echo "Contract ID saved to contract_id.txt"
    else
        echo "❌ Contract initialization failed"
        exit 1
    fi
else
    echo "❌ Contract deployment failed"
    exit 1
fi