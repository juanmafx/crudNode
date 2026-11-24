# Release Notes: crudNode 1.0.0

**Status:** prepared, not yet tagged or published.

This is the first functional version. The repository was created in 2020 with only a `.gitignore`; the implementation was added in 2026.

## Highlights

- Dependency-free CRUD REST API for items.
- Token-protected endpoints with strict input validation.
- Atomic file persistence that refuses to start on corrupt data.
- Automated unit and integration tests, with the report in `reports/tests/test-report.txt`.

## Upgrade notes

There is no earlier functional version, so no migration is needed. `API_TOKEN` must be set before starting the server.

## Known limitations

- Single process, single shared token, and no built-in TLS.
- The JSON file store suits small datasets only.
- Local tests ran on Node.js 20.20, which is past end of life. CI targets Node.js 22 and 24 and has not run yet.
