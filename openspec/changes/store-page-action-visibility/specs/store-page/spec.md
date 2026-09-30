## Purpose

Specifies the `type: "store"` page component: who sees its Install and Publish actions,
and where Publish leads. The consuming app resolves who may act; the page renders that
answer and falls back to administrators only when the app gives none.

**Files**: `src/components/CnStorePage/CnStorePage.vue`.

**Cross-references**: ADR-080 (store plane; install and publish stay app-owned),
ADR-023 (action authorization, which is where a consuming app resolves the answer).

## ADDED Requirements

### Requirement: REQ-STP-1 — The consuming app decides who sees Install

The store page SHALL accept a `canInstall` prop that is `true`, `false` or `null`. When it
is `true` every remote card SHALL show an Install button. When it is `false` no card SHALL
show one, administrators included. When it is `null` or not passed, the page SHALL show
Install to administrators only, which is the behaviour before this change.

#### Scenario: A teacher the app allows sees Install

- **GIVEN** a signed-in user who is not an administrator
- **AND** the app passes `canInstall: true`
- **WHEN** the registry answers with one card
- **THEN** that card shows an Install button

#### Scenario: The app can hide Install from an administrator

- **GIVEN** a signed-in administrator
- **AND** the app passes `canInstall: false`
- **WHEN** the registry answers with one card
- **THEN** no card shows an Install button

#### Scenario: No answer from the app keeps the administrator rule

- **GIVEN** the app passes no `canInstall`
- **WHEN** a non-administrator opens the page
- **THEN** no card shows an Install button
- **AND** WHEN an administrator opens the page, every card shows one

### Requirement: REQ-STP-2 — The consuming app decides who sees Publish, and where it leads

The store page SHALL accept a `canPublish` prop that is `true`, `false` or `null`, and a
`publishRoute` prop that is a route name (string) or a route location (object). The page
SHALL show a Publish button in its header only when `publishRoute` is set AND publishing
is allowed: `canPublish` is `true`, or `canPublish` is `null` and the user is an
administrator. Choosing Publish SHALL navigate to `publishRoute`; a string SHALL be read as
a route name. The page SHALL NOT send anything to a registry itself: publishing is the
app's own surface.

#### Scenario: A team lead the app allows sees Publish

- **GIVEN** a non-administrator
- **AND** the app passes `canPublish: true` and `publishRoute: "CoursePackageExport"`
- **WHEN** the page renders
- **THEN** the header shows a Publish button
- **AND** WHEN the user chooses it, the router navigates to the route named `CoursePackageExport`

#### Scenario: A teacher the app does not allow sees no Publish

- **GIVEN** the app passes `canPublish: false` and a `publishRoute`
- **WHEN** an administrator or anyone else opens the page
- **THEN** the header shows no Publish button

#### Scenario: No route means no Publish button

- **GIVEN** the app passes `canPublish: true` and no `publishRoute`
- **WHEN** the page renders
- **THEN** the header shows no Publish button

#### Scenario: An app that sets none of the new props renders as before

- **GIVEN** an app page that passes only `app`, `title` and `description`
- **WHEN** an administrator opens it
- **THEN** remote cards show Install and the header shows no Publish button

### Requirement: REQ-STP-3 — Visibility is presentation, not authorization

The component documentation SHALL state that `canInstall` and `canPublish` hide or show a
button and nothing more, and that the app's install and publish endpoints SHALL enforce
the same rule server-side. Install requests SHALL keep going to the declaring app's own
endpoint, unchanged.

#### Scenario: The install call is unchanged when the app allows a non-administrator

- **GIVEN** a non-administrator and `canInstall: true` on app `learniq`
- **WHEN** the user installs the card `course-package-demo`
- **THEN** the page posts to `/apps/learniq/api/store/items/course-package-demo/install`
- **AND** it renders the report the app returns, as for an administrator
