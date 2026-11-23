---
kind: code
---

# Proposal: notification-rule-labels-and-runtime-version

## Summary

The cloud check of 8 October 2026 found two things in the user-settings modal
of pipelinq and dossiq that come from this library.

1. The notification pane printed each rule's key next to its switch
   (`clientUpdated`, `caseAssigned`, `substitutionRegisteredForSubstitute`).
   The pane now shows a label: the rule's own `label` or `title` when
   OpenRegister passes one, else the app's label from the new CnAppRoot prop
   `notificationLabels`, else the library's wording for the generic keys, else
   the key split into words ("Case assigned"). It never shows the raw key.
2. The footer of the settings modal showed a version the app was never
   installed as ("pipelinq 0.1.0", "dossiq 0.4.47-unstable" on 0.4.48-beta).
   `@nextcloud/vue` prints the `appVersion` global, which apps defined at build
   time. The new `appVersionDefine(appId, fallback)` in
   `@conduction/nextcloud-vue/webpack` returns a define expression that reads
   the installed version from the page's `version` initial state in the
   browser, with the build version as fallback.

## What apps do to adopt

- Labels: pass `:notification-labels="{ '<schema>.<key>': t(appId, '…') }"` to
  CnAppRoot. Without it the pane already shows readable words.
- Version: in `webpack.config.js` use
  `appVersion: appVersionDefine('<appId>', <build version>)`, and provide the
  `version` initial state from the page controller
  (`IAppConfig::getValueString('<appId>', 'installed_version', '')`).

## Out of scope

OpenRegister passing a rule `label` on `/api/notification-preferences` entries.
The pane already reads it when present.
