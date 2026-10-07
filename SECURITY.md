# Security

Do not put secrets or private telemetry in public issues. Report a suspected vulnerability privately through GitHub’s private vulnerability reporting when enabled.

The renderer has no Node integration; it uses a restricted preload bridge and a local content security policy. IPC accepts only the app’s main frame. Meter hosts are restricted to private IPv4/loopback, network targets are validated, subprocesses use argument arrays and restore inputs are size/schema bounded.

The alpha does not load executable third-party widgets. Dependencies are audited in CI and reviewed via Dependabot. Signing/notarization is still required before trusted stable distribution. Update checksums do not replace code signing.
