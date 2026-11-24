# Architecture

crudNode is a single-process, backend-only HTTP service. It has no client code, so there is no `frontend/` and `backend/` split.

## Module structure

```text
src/
  main.js                          Composition root and process lifecycle
  config/
    load-config.js                 Environment parsing and validation
  domain/
    errors.js                      Domain error types
    items/
      item-service.js              Use cases
      item-validation.js           Input and stored-record rules
  http/
    create-app.js                  Routing and error mapping
    create-server.js               Server timeouts and limits
    authenticate.js                Bearer token check
    rate-limiter.js                Fixed-window limiter
    read-json-body.js              Bounded JSON body reader
    http-error.js                  HTTP error type
  infrastructure/
    persistence/
      item-repository.js           Serialized in-process state
      json-file-store.js           Atomic JSON file load and save
```

## Dependency direction

```text
main.js --> http --> domain <-- infrastructure
```

The domain imports neither HTTP nor file system modules. `ItemService` receives its repository through the constructor, which keeps it testable and makes the storage replaceable. The file store imports the domain's record validator so that loaded data meets the same rules as new data.

## Request flow

1. `create-app.js` splits the path and query without resolving them against a host.
2. `/health` answers immediately. Unknown paths return `404`.
3. Item routes pass the rate limiter, then authentication.
4. Write requests pass the content-type check and bounded body reader.
5. `ItemService` validates input and calls the repository.
6. The response is JSON with security headers. Unexpected errors are logged and returned as a generic `500`.

## Persistence design

- Writes run through a promise queue, so read-modify-write cycles cannot interleave within the process.
- Each write builds the next state, persists it, and only then swaps it into memory. A failed write leaves the visible state unchanged.
- Files are written to a unique temporary file with mode `0600`, flushed with `fsync`, and renamed over the target.
- Startup validates the entire file and refuses to run on corrupt data instead of overwriting it.

## Recommended architecture for growth

The current design suits one instance with a small dataset. If requirements grow:

1. Add a SQL-backed repository with the same methods as `ItemRepository`, starting from `db/schema.sql`.
2. Replace the shared token with per-user identity (OIDC or short-lived JWTs) and authorization checks in the service layer.
3. Move rate limiting to the reverse proxy or a shared store.
4. Run behind a TLS-terminating proxy, with structured logs and metrics.
