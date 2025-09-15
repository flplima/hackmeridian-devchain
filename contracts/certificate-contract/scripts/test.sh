#!/bin/bash
set -e

echo "🧪 Running certificate contract tests..."

# Run the tests
cargo test --features testutils

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed"
    exit 1
fi