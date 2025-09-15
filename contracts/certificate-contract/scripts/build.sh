#!/bin/bash
set -e

echo "Building certificate contract..."

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Check if the build was successful
if [ -f "target/wasm32-unknown-unknown/release/certificate_contract.wasm" ]; then
    echo "✅ Contract built successfully!"
    echo "WASM file: target/wasm32-unknown-unknown/release/certificate_contract.wasm"
else
    echo "❌ Build failed - WASM file not found"
    exit 1
fi