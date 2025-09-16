# ProofChain - Verifiable Developer Portfolio

A platform that enables developers to build a **verifiable on-chain portfolio** by receiving **non-transferable tokens (certificates)** from organizations and participating in freelance jobs paid via **escrow contracts** on Stellar/Soroban.

## Features

### Authentication
- **Developers**: Login with GitHub OAuth
- **Organizations**: Login with LinkedIn OAuth

### For Developers
- View GitHub profile integration
- Receive certificate tokens for completed courses/jobs
- Accept freelance jobs with escrow payments
- Build verifiable on-chain portfolio

### For Organizations
- Create and manage job postings
- Issue certificate tokens to developers
- Manage escrow payments for freelance work

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with GitHub/LinkedIn OAuth
- **Blockchain**: Stellar/Soroban for certificates and escrow contracts
- **Network**: Stellar Testnet (can be configured for mainnet)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up environment variables in `.env.local`:
   ```
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-here

   # GitHub OAuth
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret

   # LinkedIn OAuth
   LINKEDIN_CLIENT_ID=your-linkedin-client-id
   LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

   # Stellar Configuration
   STELLAR_NETWORK=testnet

   # Certificate Contract (after deployment)
   CERTIFICATE_CONTRACT_ID=your-deployed-contract-id
   ```

4. Run the development server:
   ```bash
   yarn dev
   ```

## OAuth Setup

### GitHub OAuth App
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

### LinkedIn OAuth App
1. Go to LinkedIn Developers > Create App
2. Set up OAuth 2.0 settings with:
   - Redirect URL: `http://localhost:3000/api/auth/callback/linkedin`

## Smart Contract Integration

The platform includes a **Soroban smart contract** for issuing non-transferable certificates:

### Certificate Contract Features
- **Soulbound Tokens**: Certificates cannot be transferred between addresses
- **Issuer Authorization**: Only authorized organizations can mint certificates
- **Rich Metadata**: Each certificate stores issuer, event details, and timestamps
- **Verification System**: Anyone can verify certificate authenticity

### Contract Deployment
The certificate smart contract is located in `contracts/certificate-contract/`. To deploy:

```bash
cd contracts/certificate-contract

# Set up environment variables
export STELLAR_SECRET_KEY="your_secret_key"
export ADMIN_ADDRESS="your_admin_address"

# Deploy to testnet
./scripts/deploy.sh

# Test the contract
./scripts/test.sh
```

### Using the Certificate Contract

```bash
# Authorize an organization to issue certificates
./scripts/interact.sh authorize GORG_ADDRESS...

# Mint a certificate for a developer
./scripts/interact.sh mint GDEV_ADDRESS... "RUST_BOOTCAMP_2024" "Rust Development Bootcamp" 1704067200

# Get all certificates for a developer
./scripts/interact.sh get GDEV_ADDRESS...

# Verify a specific certificate
./scripts/interact.sh verify GDEV_ADDRESS... GORG_ADDRESS... "RUST_BOOTCAMP_2024"
```

See the [Certificate Contract Documentation](./contracts/certificate-contract/README.md) for detailed information.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── auth/          # Authentication pages
│   │   ├── dashboard/     # Main dashboard
│   │   ├── events/        # Event management
│   │   ├── jobs/          # Job management
│   │   └── components/    # Shared components
│   ├── lib/
│   │   ├── stellar.ts     # Stellar/Soroban integration
│   │   └── server-data-store.ts # In-memory data storage
│   └── types/
│       └── next-auth.d.ts # NextAuth type extensions
├── contracts/
│   └── certificate-contract/  # Soroban smart contract
│       ├── src/
│       │   └── lib.rs     # Contract implementation
│       ├── scripts/       # Deployment and interaction scripts
│       └── README.md      # Contract documentation
└── CLAUDE.md              # Development instructions
```

## Development

- Use `yarn` for package management (configured in CLAUDE.md)
- The project uses TypeScript for type safety
- Tailwind CSS for styling
- ESLint for code quality

## License

MIT
