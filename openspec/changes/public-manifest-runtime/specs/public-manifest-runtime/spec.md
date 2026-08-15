# public-manifest-runtime Delta: public-manifest-runtime

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [public-manifest-runtime](../../)

## Purpose

Lets the shared manifest runtime boot at a public origin, with the difference
confined to mount, URL resolution, transport authentication and router base.
Implements the runtime half of ADR-084 and the corresponding requirement in
`hydra/openspec/changes/portaliq-phase-two/specs/public-portal-runtime/spec.md`.
Related: ADR-071 (nc-vue owns the frontend runtime), ADR-005 (fail-closed).

## ADDED Requirements

### Requirement: bootstrapCnApp MUST accept a host mode and default to nextcloud

`bootstrapCnApp()` SHALL accept `host: 'nextcloud' | 'public'`, defaulting to
`'nextcloud'`. Under `'public'` it SHALL mount a caller-supplied element,
resolve URLs from a runtime-configured base, use bearer authentication in
`cnFetch`, and take the router base from configuration.

#### Scenario: An existing app booting without the option is unchanged

- **GIVEN** an app calling `bootstrapCnApp()` with no `host`
- **WHEN** it boots
- **THEN** its mount, URL resolution, transport and router base are byte-for-byte
  what they were before this change

#### Scenario: A public boot mounts the element it was given

- **GIVEN** `host: 'public'` and a caller-supplied element
- **WHEN** the app boots
- **THEN** it mounts into that element and does not look for `#app-content`

#### Scenario: An unrecognised host value is refused

- **GIVEN** `host: 'portal'`
- **WHEN** `bootstrapCnApp()` is called
- **THEN** it throws, naming the accepted values — it does not silently fall
  back to either mode

### Requirement: A manifest MUST render with no Nextcloud globals present

Under `host: 'public'`, boot and render SHALL succeed in an environment where
`OC`, `OCA`, `OCP` and the `requesttoken` element are absent.

#### Scenario: The globals-free boot succeeds

- **GIVEN** a page environment with those globals deleted
- **WHEN** a manifest-v2 app boots with `host: 'public'`
- **THEN** it mounts and renders its pages

#### Scenario: The positive control fails first

- **GIVEN** the same globals-free environment
- **WHEN** the same app boots with `host: 'nextcloud'`
- **THEN** it fails
- **AND** this failure is asserted, so a passing public-mode test cannot be
  explained by the environment quietly supplying the globals

#### Scenario: A component reaching for a Nextcloud global is named

- **GIVEN** a `Cn*` component referencing a Nextcloud global directly
- **WHEN** the globals-free render covers a page containing it
- **THEN** the test fails and names the component

### Requirement: Public transport MUST use a bearer credential and MUST NOT leak it

Under `host: 'public'`, `cnFetch` SHALL send the configured bearer credential
and SHALL NOT send a `requesttoken` header. The credential SHALL NOT appear in
a URL, a log line, or an error payload.

#### Scenario: No Nextcloud CSRF token is sent

- **GIVEN** a booted public app
- **WHEN** any request is issued
- **THEN** it carries the bearer credential and no `requesttoken` header

#### Scenario: A failed request does not echo the credential

- **GIVEN** a request that fails
- **WHEN** the resulting error is inspected
- **THEN** it contains no part of the credential

#### Scenario: URLs resolve from the configured base

- **GIVEN** a configured API base
- **WHEN** a request is issued
- **THEN** its URL derives from that base and `generateUrl` is not called

### Requirement: No component MUST branch on the host

No `Cn*` component SHALL accept a `host` prop or read the host mode.

#### Scenario: A host prop is refused

- **GIVEN** a component declaring a `host` prop
- **WHEN** the gate runs
- **THEN** it fails, naming the component
- **AND** the guidance directs the fix into the component's own dependency,
  not into a branch at the call site
