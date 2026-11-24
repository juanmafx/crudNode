# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes |

## Reporting a vulnerability

Please do not describe vulnerabilities in public issues. Use GitHub private vulnerability reporting from this repository's **Security** tab. If it is not available, open a public issue that asks for a private contact and leave out all technical details.

Include the affected version, the impact, and the steps needed to reproduce the problem. This is a personal project, so responses are best effort and no response time is guaranteed.

## Deployment guidance

- Generate `API_TOKEN` with a cryptographically secure random source and never commit it.
- Keep the default loopback binding unless a TLS-terminating reverse proxy is in front of the service.
- Run the service as an unprivileged user and restrict access to the data directory.

The current review is in [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md).
