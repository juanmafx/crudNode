# Security Audit

- **Date:** 2026-11-23
- **Version:** 1.0.0
- **Method:** manual code review, the automated test suite, local probes against a running server, and a gitleaks scan of the branch history with no findings. No third-party penetration test was run.

## Starting point

The repository held a single commit containing only a `.gitignore`. Its history had no source code, secrets, private keys, dependencies, or build artifacts. On 2026-11-24 the published history was rewritten to keep only the 2026 modernization commits, so that initial commit is no longer part of any branch or tag.

## Controls

| Risk | Control | Verified by |
| --- | --- | --- |
| Unauthorized access | Mandatory bearer token; server refuses to start without one | Tests, smoke run |
| Token timing leaks | Constant-time comparison of SHA-256 digests | Code review |
| Hardcoded secrets | Token comes from the environment; `.env` is gitignored | Code review |
| Injection | No SQL, shell, or dynamic code execution at runtime | Code review |
| Path traversal | Strict UUID ids, never used to build file paths | Tests |
| XSS | JSON-only responses, `nosniff`, restrictive CSP | Tests |
| CSRF | No cookies or ambient credentials; JSON content type required | Tests |
| Prototype pollution | Allow-listed fields; unknown keys rejected | Tests |
| Memory exhaustion | 64 KiB body limit, including chunked requests | Tests |
| Request flooding | Per-address rate limit on item routes, IPv6 grouped by /64, bounded tracking | Tests |
| Connection exhaustion | Limit of 1000 concurrent connections | Tests |
| Slow clients | Header and request timeouts, checked every second | Tests (configuration), local probe |
| Information leaks | Generic `500` responses | Tests |
| Data corruption | Atomic writes and validation on load | Tests |
| Data file exposure | File mode `0600`, directory created with `0700` | Tests (file mode) |
| Supply chain | No runtime or development packages; CI actions pinned to commit SHAs | Code review |
| CI privilege | Read-only `contents` permission, credentials not persisted | Code review |
| Two-factor authentication | Not applicable: no user accounts or passwords | Code review |

## Open items and accepted risks

| Item | Severity | Status |
| --- | --- | --- |
| No built-in TLS | Medium if exposed | Deploy behind a TLS-terminating proxy |
| Single shared token, no rotation without restart | Medium | Accepted for current scope |
| Rate limit is per process and shared behind a proxy | Low | Enforce limits at the proxy |
| Data file is not encrypted at rest | Low | Use encrypted storage if data is sensitive |
| Requests rejected by the HTTP parser lack the security headers | Low | Accepted; the response carries no request data |
| GitHub private vulnerability reporting is disabled | Low | Owner decision |
