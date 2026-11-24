# Release Notes: crudNode 1.0.1

Released 2026-11-24.

This is a documentation-only patch release. There is no code behaviour change from 1.0.0.

## Changes

- The changelog and release notes now record 1.0.0 as released on 2026-11-24.
- The security audit notes that the repository history was rewritten on 2026-11-24 and now contains only the 2026 modernization commits.

## Upgrade notes

No migration is needed from 1.0.0. `API_TOKEN` must still be set before starting the server.

## Known limitations

- Single process, single shared token, and no built-in TLS.
- The JSON file store suits small datasets only.
