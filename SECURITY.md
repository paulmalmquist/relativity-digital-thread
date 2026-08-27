# Security policy

This repository contains synthetic, read-only feature references. Do
not report fictional identifiers or fixture values as exposed production data.

Please report a real vulnerability privately through GitHub's **Report a
vulnerability** flow for this repository. Do not open a public issue containing
credentials, internal endpoints, personal data, or exploit details.

The demo has no authentication or source-system connector. Any production host
must enforce authorization server-side before creating a
`DigitalThreadSnapshot` or `ReportCertificationSnapshot`. Raw certification
evidence and privileged artifact references must remain server-side; hiding a
value in the UI is not an access control. Use the report-certification server
entrypoint's allowlist projector before serializing an authorized snapshot.
