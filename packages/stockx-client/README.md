# @ponado/stockx-client

StockX API client wrapper for Node.js.

## Installation

```bash
pnpm add @ponado/stockx-client
```

## Usage

```typescript
import { StockxClient } from '@ponado/stockx-client';

const client = new StockxClient({
	// Configuration options
});

// Use the client to interact with StockX API
const result = await client.someMethod();
```

## API

See source files for available methods and types:

- `StockxClient` - Main client class
- `types.ts` - TypeScript type definitions
