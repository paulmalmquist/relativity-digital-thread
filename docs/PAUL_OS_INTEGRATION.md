# Paul OS digital-thread integration

This guide covers `features/digital-thread/`. For the independent Report
Certification feature, use
[the report-certification integration guide](REPORT_CERTIFICATION_INTEGRATION.md).

## Copy map

Copy this directory without changing its internal paths:

```text
features/digital-thread/
  demo-data.ts
  digital-thread-control.css
  digital-thread-control.tsx
  fixtures/sample-event.json
  index.ts
  types.ts
```

Install `lucide-react`. React is a peer supplied by the host Next.js app. The
feature does not require Tailwind or a component library, and its stylesheet is
imported by the component itself.

## Host route

```tsx
// app/digital-thread/page.tsx
import { DigitalThreadControl } from "@/features/digital-thread";

export default function Page() {
  return <DigitalThreadControl />;
}
```

The default `layout="embedded"` mode is container-responsive and does not claim
the viewport or make its header sticky. If this route is a dedicated full-page
surface, opt in with `<DigitalThreadControl layout="standalone" />`.

This route intentionally starts in synthetic mode. It is safe to remove the
banner only after the API adapter, entitlements, calculations, and freshness
labels are verified.

## Production adapter

Keep data fetching in a Server Component or server-only module, translate the
response into `DigitalThreadSnapshot`, and pass the plain object to the client
feature.

```tsx
// app/digital-thread/page.tsx (Server Component)
import { DigitalThreadControl } from "@/features/digital-thread";
import type { DigitalThreadSnapshot } from "@/features/digital-thread";
import { getAuthorizedDigitalThreadSnapshot } from "@/server/digital-thread";

export default async function Page() {
  const snapshot: DigitalThreadSnapshot =
    await getAuthorizedDigitalThreadSnapshot();

  return <DigitalThreadControl data={snapshot} showDemoBanner={false} />;
}
```

Do not add callbacks from a Server Component to this client component. If Paul
OS needs an operational replay workflow, implement it as a separately
authorized Server Action or route handler and label it differently from the
local trace animation.

## Expected internal endpoints

```text
GET /api/digital-thread/summary
GET /api/digital-thread/systems
GET /api/digital-thread/events?domain=&status=&cursor=
GET /api/digital-thread/events/{event_id}
GET /api/digital-thread/exceptions
```

The browser should receive an entitlement-filtered projection. It should not
connect directly to event buses, databases, manufacturing systems, or content
platforms.

## Integration checklist

- Confirm Paul OS resolves the `@/*` alias, or change the route import.
- Keep the `features/digital-thread` relative imports intact.
- Map source data to `DigitalThreadSnapshot`; do not pass SDK/model instances.
- Supply stable, unique IDs for events, trace steps, connectors, and issues.
- Preserve `occurred_at` separately from `observed_at` in the upstream model.
- Calculate every visible metric server-side and attach an `asOf` timestamp.
- Enforce row, column, system, and document entitlements before serialization.
- Keep replay visual-only unless an independently authorized workflow is added.
- Run Paul OS typecheck, lint, unit tests, production build, and a mobile smoke test.
