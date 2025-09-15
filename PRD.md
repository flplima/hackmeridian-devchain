# Product Requirements Document

## 🎯 Goal

Enable developers to build a **verifiable on-chain portfolio** by receiving **non-transferable tokens (certificates)** from organizations, and by participating in freelance jobs paid via **escrow contracts** on Stellar/Soroban.

Authentication is streamlined:

- Developers login with **GitHub**.
- Organizations login with **LinkedIn**.

---

## 👤 Users & Roles

### Developer (Dev)

- Login: **GitHub OAuth only**.
- On first login:
    - System fetches **public GitHub profile** (name, username, avatar, contributions).
    - Initializes their on-chain profile (Stellar account generated if not present).
- Can join organization events/hackathons/courses.
- Can accept freelance jobs.
- Receives **certificate tokens** into their wallet (non-transferable).
- Receives payment via escrow smart contract.

### Organization

- Login: **LinkedIn OAuth only**.
- Can create:
    - Courses
    - Hackathons
    - Events
    - Freelance Job opportunities
- Mints certificate tokens for Devs upon completion.
- Escrows job payments until completion.

---

## 🔗 Core Features

### 1. Authentication

- GitHub OAuth for Devs → fetch name, picture, contributions, repos.
- LinkedIn OAuth for Orgs → fetch name, logo, description.
- Store auth tokens only for session management (profiles are pulled fresh on first login).

### 2. Profiles

- **Dev Profile** (public):
    - Name, avatar (from GitHub).
    - GitHub contributions summary.
    - List of certificate tokens (on-chain).
    - List of completed jobs (escrow contracts released).
- **Org Profile** (public):
    - Name, logo (from LinkedIn).
    - Events, courses, hackathons created.
    - Jobs posted and completed.

### 3. Certificates (On-Chain Tokens)

- Each certificate = **non-transferable Soroban token** (soulbound).
- Token metadata:
    - `issuer` (Org address)
    - `type` (course, hackathon, job)
    - `tags` (react, node, python, rust, go, ruby)
    - `title` (e.g., "Rust Bootcamp 2025")
    - `dateIssued`

### 4. Escrow Job Contract

- Org deposits funds into escrow contract.
- Dev accepts → contract locks assignment.
- Org approves → contract releases funds to Dev + issues certificate.
- Option: refund to Org if job not completed.

### 5. Public Verifiability

- All Dev and Org tokens & job contracts are queryable on Stellar testnet (later mainnet).
- Web frontend visualizes them in a “public profile page.”

---

## 🛠️ Technical Requirements

### Frontend

- React/Next.js (or similar).
- Tailwind UI for fast prototyping.
- GitHub OAuth + LinkedIn OAuth.
- Profile pages for Dev & Org.

### Backend

- Node.js server (Express/Fastify).
- Handles OAuth, user session, mapping blockchain accounts to users.
- Interacts with Soroban via `@stellar/stellar-sdk`.
- Issues certificate tokens & escrow smart contracts.

### Blockchain Layer

- Stellar Soroban testnet:
    - **Certificate Token Contract** (soulbound).
    - **Escrow Contract** (fund lock & release).
- Each user gets a Stellar keypair.
- Escrow payments & certificate minting handled by Soroban RPC.

---

## 🚀 User Flows

### Dev first login

1. Login with GitHub.
2. Backend fetches GitHub profile.
3. Generate Stellar keypair for Dev (if not existing).
4. Fund with **Friendbot** (testnet).
5. Create profile (name, avatar, contributions).
6. Dev public profile visible immediately.

### Org first login

1. Login with LinkedIn.
2. Backend fetches org profile data (name, logo).
3. Generate Stellar keypair for Org.
4. Fund with Friendbot.
5. Org can now create events/jobs.

### Job lifecycle

1. Org creates job + escrows funds.
2. Dev accepts job.
3. Org approves → contract releases funds + issues certificate token to Dev.
4. Dev’s profile updates on-chain & UI.
