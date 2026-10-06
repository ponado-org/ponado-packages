# @ponado/sse

Minimal typed SSE client built on the browser `EventSource` (native
auto-reconnect). Zero dependencies.

## Usage

```ts
import { createSseClient } from '@ponado/sse';

const sse = createSseClient('/api/stream', {
	onOpen: () => console.log('connected'),
	onMessage: (event) => console.log(event.data),
	onError: (error) => console.warn(error)
});

sse.close();
```
