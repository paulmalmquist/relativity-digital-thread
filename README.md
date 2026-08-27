# Relativity Digital Thread

A portable Next.js client feature for visualizing governed enterprise events,
propagation traces, connector health, reconciliation exceptions, and authority
boundaries. The included application is a runnable synthetic demo; it does not
connect to operational systems.

## What is portable

Everything needed by the feature lives in [`features/digital-thread`](features/digital-thread):

- `digital-thread-control.tsx` — exported interactive control surface;
- `digital-thread-control.css` — styles scoped below `.relativity-digital-thread`;
- `types.ts` — serializable host-app contract;
- `demo-data.ts` — explicitly synthetic fixture data; and
- `fixtures/sample-event.json` — example canonical event envelope.

The demo uses native HTML controls and tables. Its only feature-specific runtime
dependency is `lucide-react`; there is no Tailwind, shadcn, Radix, Cloudflare,
Vinext, database, authentication, or environment-variable requirement.

## Run the demo

Requirements: Node.js 22.13 or newer and npm.

```bash
git clone https://github.com/paulmalmquist/relativity-digital-thread.git
cd relativity-digital-thread
npm ci
npm run dev
```

Then open `http://localhost:3000`.

Run the full verification suite with:

```bash
npm run check
```

## Add it to Paul OS

1. Copy `features/digital-thread/` into the Paul OS repository.
2. Install the icon dependency:

   ```bash
   npm install lucide-react
   ```

3. Render the feature from a Paul OS route or client component:

   ```tsx
   import { DigitalThreadControl } from "@/features/digital-thread";

   export default function DigitalThreadPage() {
     return <DigitalThreadControl />;
   }
   ```

   The default `embedded` layout stays within the host container. Use
   `layout="standalone"` only when the feature owns the full page and should
   provide full-height, sticky header chrome.

4. Replace `demoDigitalThreadData` with a `DigitalThreadSnapshot` produced by an
   authorized server-side adapter. Keep `showDemoBanner` enabled until every
   visible value is backed by approved data.

See [the Paul OS integration guide](docs/PAUL_OS_INTEGRATION.md) for the exact
file mapping, API boundary, and production checklist.

## Data boundary

`DigitalThreadControl` accepts plain serializable data:

```tsx
import type { DigitalThreadSnapshot } from "@/features/digital-thread";
import { DigitalThreadControl } from "@/features/digital-thread";

export function Feature({ snapshot }: { snapshot: DigitalThreadSnapshot }) {
  return <DigitalThreadControl data={snapshot} showDemoBanner={false} />;
}
```

Icons and topology positions are string identifiers, not React component
instances, so the snapshot can safely cross a Next.js Server/Client Component
boundary. Adapt source-vendor payloads on the server; never send source-system
credentials to the browser.

The **Replay trace** button only replays the on-screen visualization. It does
not issue a source-system command or retry a message.

## Repository status

- All displayed records, names, timestamps, identifiers, and metrics are synthetic.
- No environment variables are required for the demo.
- The broader source research and host-specific export scaffold were intentionally
  left out of this public feature repository.
- Public visibility is not an open-source license; see [`LICENSE`](LICENSE).

For production-facing guardrails and API shapes, read
[`docs/PRODUCTION_INTEGRATION.md`](docs/PRODUCTION_INTEGRATION.md).
