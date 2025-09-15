# DevChain - Verifiable Developer Portfolio

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
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-here

   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret

   LINKEDIN_CLIENT_ID=your-linkedin-client-id
   LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

   STELLAR_NETWORK=testnet
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

## Stellar Integration

The platform uses Stellar testnet for:
- **Certificate Tokens**: Non-transferable (soulbound) tokens representing course/job completions
- **Escrow Contracts**: Smart contracts that hold job payments until completion

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Main dashboard
│   ├── jobs/          # Job management
│   └── components/    # Shared components
├── lib/
│   └── stellar.ts     # Stellar/Soroban integration
└── types/
    └── next-auth.d.ts # NextAuth type extensions
```

## Development

- Use `yarn` for package management (configured in CLAUDE.md)
- The project uses TypeScript for type safety
- Tailwind CSS for styling
- ESLint for code quality

## License

MIT
