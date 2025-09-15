#!/bin/bash
set -e

# Configuration
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Check if contract ID file exists
if [ ! -f "contract_id.txt" ]; then
    echo "❌ Error: contract_id.txt not found. Deploy the contract first."
    exit 1
fi

CONTRACT_ID=$(cat contract_id.txt)

if [ -z "$STELLAR_SECRET_KEY" ]; then
    echo "❌ Error: STELLAR_SECRET_KEY environment variable is required"
    exit 1
fi

# Function to authorize an issuer
authorize_issuer() {
    local issuer_address=$1
    if [ -z "$issuer_address" ]; then
        echo "❌ Error: Issuer address required"
        echo "Usage: $0 authorize <issuer_address>"
        exit 1
    fi

    echo "🔐 Authorizing issuer: $issuer_address"

    soroban contract invoke \
      --id "$CONTRACT_ID" \
      --source "$STELLAR_SECRET_KEY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      -- \
      authorize_issuer \
      --issuer "$issuer_address"

    echo "✅ Issuer authorized successfully!"
}

# Function to mint a certificate
mint_certificate() {
    local developer_address=$1
    local event_id=$2
    local event_name=$3
    local date_issued=$4

    if [ -z "$developer_address" ] || [ -z "$event_id" ] || [ -z "$event_name" ] || [ -z "$date_issued" ]; then
        echo "❌ Error: All parameters required"
        echo "Usage: $0 mint <developer_address> <event_id> <event_name> <date_issued>"
        exit 1
    fi

    echo "🏆 Minting certificate for: $developer_address"

    CERT_ID=$(soroban contract invoke \
      --id "$CONTRACT_ID" \
      --source "$STELLAR_SECRET_KEY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      -- \
      mint_certificate \
      --developer "$developer_address" \
      --event_id "$event_id" \
      --event_name "$event_name" \
      --date_issued "$date_issued")

    echo "✅ Certificate minted successfully!"
    echo "Certificate ID: $CERT_ID"
}

# Function to get certificates for a developer
get_certificates() {
    local developer_address=$1
    if [ -z "$developer_address" ]; then
        echo "❌ Error: Developer address required"
        echo "Usage: $0 get <developer_address>"
        exit 1
    fi

    echo "📋 Getting certificates for: $developer_address"

    soroban contract invoke \
      --id "$CONTRACT_ID" \
      --source "$STELLAR_SECRET_KEY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      -- \
      get_certificates \
      --developer "$developer_address"
}

# Function to verify a certificate
verify_certificate() {
    local developer_address=$1
    local issuer_address=$2
    local event_id=$3

    if [ -z "$developer_address" ] || [ -z "$issuer_address" ] || [ -z "$event_id" ]; then
        echo "❌ Error: All parameters required"
        echo "Usage: $0 verify <developer_address> <issuer_address> <event_id>"
        exit 1
    fi

    echo "🔍 Verifying certificate..."

    RESULT=$(soroban contract invoke \
      --id "$CONTRACT_ID" \
      --source "$STELLAR_SECRET_KEY" \
      --rpc-url "$RPC_URL" \
      --network-passphrase "$NETWORK_PASSPHRASE" \
      -- \
      verify_certificate \
      --developer "$developer_address" \
      --issuer "$issuer_address" \
      --event_id "$event_id")

    if [ "$RESULT" = "true" ]; then
        echo "✅ Certificate verified successfully!"
    else
        echo "❌ Certificate not found or invalid"
    fi
}

# Main command dispatcher
case "$1" in
    "authorize")
        authorize_issuer "$2"
        ;;
    "mint")
        mint_certificate "$2" "$3" "$4" "$5"
        ;;
    "get")
        get_certificates "$2"
        ;;
    "verify")
        verify_certificate "$2" "$3" "$4"
        ;;
    *)
        echo "📖 Certificate Contract Interaction Script"
        echo ""
        echo "Usage: $0 <command> [arguments]"
        echo ""
        echo "Commands:"
        echo "  authorize <issuer_address>                           - Authorize an organization to issue certificates"
        echo "  mint <dev_addr> <event_id> <event_name> <timestamp> - Mint a certificate"
        echo "  get <developer_address>                             - Get all certificates for a developer"
        echo "  verify <dev_addr> <issuer_addr> <event_id>         - Verify a specific certificate"
        echo ""
        echo "Contract ID: $CONTRACT_ID"
        echo ""
        echo "Examples:"
        echo "  $0 authorize GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        echo "  $0 mint GDEV... \"RUST_BOOTCAMP_2024\" \"Rust Development Bootcamp\" 1704067200"
        echo "  $0 get GDEV..."
        echo "  $0 verify GDEV... GORG... \"RUST_BOOTCAMP_2024\""
        ;;
esac