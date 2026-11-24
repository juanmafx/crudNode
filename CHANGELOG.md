# Changelog

This project follows [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format.

## [1.0.1] - 2026-11-24

### Changed

- Documentation corrections: release notes, changelog, and security audit now reflect the published 1.0.0 release and the rewritten repository history. No code behaviour change.

## [1.0.0] - 2026-11-24

### Added

- CRUD REST API for items under `/api/v1/items`, using only the Node.js standard library.
- Bearer token authentication, rate limiting, body limits, a connection cap, server timeouts, and security headers.
- Atomic JSON file persistence with validation on load.
- Optional SQLite schema in `db/schema.sql`.
- Unit and integration tests with a committed test report.
- GitHub Actions CI with least-privilege permissions and SHA-pinned actions.
- README, architecture guide, security policy, and security audit.

### Changed

- `.gitignore` now excludes the local `data/` directory and `.env.*` files.

## Repository created - 2020-12-20

### Added

- Initial repository containing a `.gitignore`. This commit is no longer part of the published history, which was rewritten on 2026-11-24 to keep only the 2026 modernization commits.
