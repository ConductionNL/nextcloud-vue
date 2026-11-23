# notification-preferences Delta: notification-rule-labels-and-runtime-version

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notification-rule-labels-and-runtime-version](../../)

## Purpose

A person reads words in their settings, and the version they see is the one
that is installed.

## ADDED Requirements

### Requirement: A notification rule reads as a label

CnNotificationPreferences SHALL label each switch from, in order: the entry's
own `label` or `title` (a string or a per-locale map, resolved in the current
language), the app's label keyed `<schema>.<key>` or `<key>` (CnAppRoot prop
`notificationLabels`, or the pane's `labels` prop), the library wording for the
generic object-event keys, a `subject` without `{{placeholders}}`, and finally
the key split into sentence-case words. It SHALL NOT show the raw key.

#### Scenario: A rule without a label

- **GIVEN** OpenRegister returns the rule `caseAssigned` with no label
- **WHEN** the person opens the notification pane
- **THEN** the switch reads "Case assigned"

#### Scenario: The app supplies a label

- **GIVEN** the app passes `notificationLabels` `{ 'case.caseAssigned': 'Een zaak is aan mij toegewezen' }` to CnAppRoot
- **WHEN** the person opens the notification pane
- **THEN** the switch for `case/caseAssigned` reads "Een zaak is aan mij toegewezen"

#### Scenario: A subject template is not a label

- **GIVEN** a rule whose only text is the subject `Zaak "{{title}}" aan je toegewezen`
- **WHEN** the pane labels it
- **THEN** it reads the key as words, not the template

### Requirement: The settings footer shows the installed version

`appVersionDefine(appId, fallback)` SHALL return a JavaScript expression for
`webpack.DefinePlugin` that, in the browser, returns the string in the
`initial-state-<appId>-version` input, and the fallback when that input is
absent or unreadable.

#### Scenario: The installed version differs from the build

- **GIVEN** a bundle built with info.xml `0.4.47-unstable` and a page that provides `version` `0.4.48-beta`
- **WHEN** the settings modal renders its footer
- **THEN** it reads `0.4.48-beta`

#### Scenario: The page provides no version

- **GIVEN** no `version` initial state on the page
- **WHEN** the define is evaluated
- **THEN** it returns the build version
