# Changelog

This project follows [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format.

## [1.0.0] - Unreleased

### Added

- CRUD REST API for items under `/api/v1/items`, using only the Node.js standard library.
- Bearer token authentication, rate limiting, body limits, server timeouts, and security headers.
- Atomic JSON file persistence with validation on load.
- Optional SQLite schema in `db/schema.sql`.
- Unit and integration tests with a committed test report.
- GitHub Actions CI with least-privilege permissions and SHA-pinned actions.
- README, architecture guide, security policy, and security audit.

### Changed

- `.gitignore` now excludes the local `data/` directory.

## [0.0.0] - 2020-12-20

### Added

- Initial repository containing a `.gitignore`.
