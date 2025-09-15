# Smart Contract Integration Guide

This guide explains how to integrate the Certificate Smart Contract with the DevChain platform.

## Overview

The certificate smart contract is a Soroban-based system for issuing non-transferable (soulbound) certificates to developers. Organizations can mint certificates for completed events, courses, or jobs, and anyone can verify the authenticity of these certificates.

## Contract Architecture

### Core Components

1. **Certificate Contract** - Main smart contract for certificate operations
2. **Certificate Structure** - Metadata format for certificates
3. **Authorization System** - Controls who can mint certificates
4. **Storage System** - Persistent storage for certificates and permissions

### Data Flow

```
Organization → Authorization → Certificate Minting → Developer Portfolio
     ↓              ↓                ↓                      ↓
   Admin         Contract         Blockchain            Verification
```

## Integration Steps

### 1. Deploy the Smart Contract

First, deploy the certificate contract to Stellar testnet:

```bash
cd contracts/certificate-contract

# Set up environment
export STELLAR_SECRET_KEY="your_secret_key"
export ADMIN_ADDRESS="your_admin_address"

# Deploy
./scripts/deploy.sh
```

This will output a contract ID that you'll need for integration.

### 2. Update Frontend Service

Create or update the certificate service in `src/lib/stellar.ts`:

```typescript
import { Contract, SorobanRpc, TransactionBuilder, Networks, Address } from '@stellar/stellar-sdk';

export class CertificateService {
  private contractId: string;
  private server: SorobanRpc.Server;
  private networkPassphrase: string;

  constructor(contractId: string, network: 'testnet' | 'mainnet' = 'testnet') {
    this.contractId = contractId;
    this.networkPassphrase = network === 'testnet'
      ? Networks.TESTNET
      : Networks.PUBLIC;
    this.server = new SorobanRpc.Server(
      network === 'testnet'
        ? 'https://soroban-testnet.stellar.org'
        : 'https://soroban-mainnet.stellar.org'
    );
  }

  /**
   * Mint a certificate for a developer
   */
  async mintCertificate(
    issuerKeypair: Keypair,
    developerAddress: string,
    eventId: string,
    eventName: string
  ): Promise<string> {
    const contract = new Contract(this.contractId);
    const account = await this.server.getAccount(issuerKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: '1000000', // 0.1 XLM max fee
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(
      contract.call('mint_certificate',
        Address.fromString(developerAddress),
        eventId,
        eventName,
        Math.floor(Date.now() / 1000)
      )
    )
    .setTimeout(300)
    .build();

    // Simulate first to estimate fees
    const simulated = await this.server.simulateTransaction(transaction);
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    // Build the final transaction
    const prepared = SorobanRpc.assembleTransaction(transaction, simulated);
    prepared.sign(issuerKeypair);

    const result = await this.server.sendTransaction(prepared);
    return result.hash;
  }

  /**
   * Get all certificates for a developer
   */
  async getCertificates(developerAddress: string): Promise<Certificate[]> {
    const contract = new Contract(this.contractId);

    // Create a dummy account for read operations
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const transaction = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(
      contract.call('get_certificates', Address.fromString(developerAddress))
    )
    .setTimeout(300)
    .build();

    const simulated = await this.server.simulateTransaction(transaction);
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Failed to get certificates: ${simulated.error}`);
    }

    // Parse the result
    return this.parseCertificates(simulated.result?.retval);
  }

  /**
   * Verify if a developer has a specific certificate
   */
  async verifyCertificate(
    developerAddress: string,
    issuerAddress: string,
    eventId: string
  ): Promise<boolean> {
    const contract = new Contract(this.contractId);
    const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const transaction = new TransactionBuilder(dummyAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(
      contract.call('verify_certificate',
        Address.fromString(developerAddress),
        Address.fromString(issuerAddress),
        eventId
      )
    )
    .setTimeout(300)
    .build();

    const simulated = await this.server.simulateTransaction(transaction);
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      return false;
    }

    // Parse boolean result
    return simulated.result?.retval?.valueOf() === true;
  }

  /**
   * Authorize an organization to issue certificates (admin only)
   */
  async authorizeIssuer(
    adminKeypair: Keypair,
    issuerAddress: string
  ): Promise<string> {
    const contract = new Contract(this.contractId);
    const account = await this.server.getAccount(adminKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: this.networkPassphrase,
    })
    .addOperation(
      contract.call('authorize_issuer', Address.fromString(issuerAddress))
    )
    .setTimeout(300)
    .build();

    const simulated = await this.server.simulateTransaction(transaction);
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Authorization failed: ${simulated.error}`);
    }

    const prepared = SorobanRpc.assembleTransaction(transaction, simulated);
    prepared.sign(adminKeypair);

    const result = await this.server.sendTransaction(prepared);
    return result.hash;
  }

  private parseCertificates(retval: any): Certificate[] {
    // Implementation depends on the exact format returned by the contract
    // This is a simplified version
    try {
      if (!retval || !Array.isArray(retval)) {
        return [];
      }

      return retval.map((cert: any) => ({
        issuer: cert.issuer.toString(),
        eventId: cert.event_id,
        eventName: cert.event_name,
        dateIssued: new Date(cert.date_issued * 1000),
      }));
    } catch (error) {
      console.error('Error parsing certificates:', error);
      return [];
    }
  }
}

// Initialize the service
export const certificateService = new CertificateService(
  process.env.CERTIFICATE_CONTRACT_ID || '',
  process.env.STELLAR_NETWORK as 'testnet' | 'mainnet' || 'testnet'
);
```

### 3. Update API Routes

Update the certificate minting API route (`src/app/api/certificates/mint/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server"
import { certificateService } from "@/lib/stellar"
import { Keypair } from "@stellar/stellar-sdk"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientPublicKey, eventId, eventName, issuerSecretKey } = body

    if (!recipientPublicKey || !eventId || !eventName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // In production, store issuer keys securely and identify the issuer
    // This is a simplified example
    const issuerKeypair = issuerSecretKey
      ? Keypair.fromSecret(issuerSecretKey)
      : Keypair.random() // Demo only

    const transactionHash = await certificateService.mintCertificate(
      issuerKeypair,
      recipientPublicKey,
      eventId,
      eventName
    )

    return NextResponse.json({
      transactionHash,
      message: "Certificate minted successfully"
    })
  } catch (error) {
    console.error("Error minting certificate:", error)
    return NextResponse.json(
      { error: "Failed to mint certificate" },
      { status: 500 }
    )
  }
}
```

Create a new API route for getting certificates (`src/app/api/certificates/get/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server"
import { certificateService } from "@/lib/stellar"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const developerAddress = searchParams.get('address')

    if (!developerAddress) {
      return NextResponse.json(
        { error: "Developer address required" },
        { status: 400 }
      )
    }

    const certificates = await certificateService.getCertificates(developerAddress)

    return NextResponse.json({
      certificates,
      count: certificates.length
    })
  } catch (error) {
    console.error("Error getting certificates:", error)
    return NextResponse.json(
      { error: "Failed to get certificates" },
      { status: 500 }
    )
  }
}
```

### 4. Update Frontend Components

Update the dashboard to display certificates from the smart contract:

```typescript
// In src/app/dashboard/page.tsx

const [certificates, setCertificates] = useState<Certificate[]>([])

// Add this to your useEffect
useEffect(() => {
  const loadCertificates = async () => {
    if (currentSession?.stellarAddress) {
      try {
        const response = await fetch(`/api/certificates/get?address=${currentSession.stellarAddress}`)
        if (response.ok) {
          const data = await response.json()
          setCertificates(data.certificates)
        }
      } catch (error) {
        console.error('Error loading certificates:', error)
      }
    }
  }

  loadCertificates()
}, [currentSession])

// Add certificates section to your JSX
<div className="bg-white p-6 rounded-lg shadow">
  <h3 className="text-lg font-semibold mb-4">My Certificates</h3>
  {certificates.length > 0 ? (
    <div className="space-y-3">
      {certificates.map((cert, index) => (
        <div key={index} className="border p-4 rounded-lg">
          <h4 className="font-medium">{cert.eventName}</h4>
          <p className="text-sm text-gray-600">ID: {cert.eventId}</p>
          <p className="text-sm text-gray-600">
            Issued: {cert.dateIssued.toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">
            Issuer: {cert.issuer}
          </p>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-gray-500">No certificates yet</p>
  )}
</div>
```

### 5. Environment Configuration

Update your `.env.local` file:

```env
# Add these new environment variables
CERTIFICATE_CONTRACT_ID=your_deployed_contract_id_here
STELLAR_NETWORK=testnet
```

## Testing the Integration

### 1. Unit Tests

Create tests for the certificate service (`src/lib/__tests__/certificate.test.ts`):

```typescript
import { CertificateService } from '../stellar'
import { Keypair } from '@stellar/stellar-sdk'

describe('CertificateService', () => {
  let service: CertificateService
  let mockContractId: string

  beforeEach(() => {
    mockContractId = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K'
    service = new CertificateService(mockContractId, 'testnet')
  })

  test('should mint certificate successfully', async () => {
    const issuerKeypair = Keypair.random()
    const developerAddress = Keypair.random().publicKey()

    // Mock the service call
    const hash = await service.mintCertificate(
      issuerKeypair,
      developerAddress,
      'TEST_EVENT_2024',
      'Test Event 2024'
    )

    expect(hash).toBeTruthy()
  })

  // Add more tests...
})
```

### 2. Integration Tests

Test the complete flow from frontend to smart contract:

```typescript
// Test in browser console or create a test page
const testCertificateMinting = async () => {
  const response = await fetch('/api/certificates/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientPublicKey: 'GDEV_ADDRESS_HERE',
      eventId: 'TEST_INTEGRATION_2024',
      eventName: 'Integration Test Event',
    }),
  })

  const result = await response.json()
  console.log('Certificate minted:', result)

  // Test retrieval
  const getCerts = await fetch('/api/certificates/get?address=GDEV_ADDRESS_HERE')
  const certificates = await getCerts.json()
  console.log('Retrieved certificates:', certificates)
}
```

## Production Considerations

### 1. Security

- **Key Management**: Store issuer private keys securely (use environment variables, key management services)
- **Authorization**: Implement proper authorization checks in API routes
- **Validation**: Validate all inputs before sending to smart contract
- **Rate Limiting**: Implement rate limiting for certificate minting

### 2. Performance

- **Caching**: Cache certificate data to reduce blockchain queries
- **Batch Operations**: Consider batching multiple certificate operations
- **Error Handling**: Implement robust error handling and retries

### 3. Monitoring

- **Transaction Monitoring**: Monitor transaction success/failure rates
- **Cost Tracking**: Track XLM costs for operations
- **Event Logging**: Log all certificate operations for audit trails

### 4. Upgrades

- **Contract Versioning**: Plan for contract upgrades if needed
- **Migration Strategy**: Prepare migration scripts for data/permissions
- **Backward Compatibility**: Maintain compatibility with existing certificates

## Troubleshooting

### Common Issues

1. **Transaction Failed**: Check account balance, network connectivity
2. **Simulation Error**: Verify contract ID and function parameters
3. **Authorization Failed**: Ensure issuer is authorized by contract admin
4. **Network Issues**: Check RPC endpoint status

### Debug Tools

```bash
# Check contract state
soroban contract invoke --id CONTRACT_ID -- get_certificates --developer GDEV_ADDRESS

# Monitor transactions
stellar-cli transaction info TRANSACTION_HASH

# Check account balance
stellar-cli account info ACCOUNT_ADDRESS
```

## Additional Resources

- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar SDK Reference](https://stellar.github.io/js-stellar-sdk/)
- [Certificate Contract README](../contracts/certificate-contract/README.md)
- [Stellar Testnet Console](https://stellar.org/laboratory)