# Security Policy

## Supported Versions

Only the latest release of `@conduction/nextcloud-vue` receives security fixes.

## Reporting a Vulnerability

Please report security vulnerabilities to **security@conduction.nl** rather than opening a public GitHub issue.

We aim to acknowledge reports within 2 business days and to ship a fix within 14 days for critical vulnerabilities.

## Known Accepted Risks

### Vue 2 End-of-Life (ReDoS — low severity)

`vue@2.7.x` has a known ReDoS vulnerability (low severity) in its template compiler that is unfixable without migrating to Vue 3. Vue 2 reached end-of-life in December 2023.

**Accepted posture:** The Vue 3 migration is planned. Until it lands, consumers should be aware that:

- All user-supplied content rendered via `v-html` in this library passes through `DOMPurify.sanitize()` using the `SAFE_MARKDOWN_DOMPURIFY_CONFIG` configuration.
- The Vue 2 ReDoS affects template compilation, not runtime rendering of data. Applications that do not compile untrusted strings as Vue templates at runtime are not exposed.

### `vue-template-compiler` (build-time only)

`vue-template-compiler` is a **devDependency** — it is only required at build time to compile `.vue` SFC templates. It is not included in the published `dist/` bundle and is not installed when consumers add `@conduction/nextcloud-vue` to their own `node_modules` via npm. Any CVEs reported against this package do not affect end users of the built library.

## Dependency Audit

Run `npm audit` in the project root for the current vulnerability list. A number of vulnerabilities reported are in build-time devDependencies only and are not present in the distributed bundle.
