# Proposal: settings-section-footer-link

## Why

DqVthInstellingen ends two cards with a link to the app that owns their list: "Koppelingen beheren in integriq" under the
DSO activities, "Leges beheren in shillinq" under the fee rules, at the end of the card. A settings section had a footer
slot but no link, so each app would draw its own.

## What changes

CnSettingsSection takes `footerLink: { label, href }` and draws it as a link at the end of the card, after the content.
Without both, or with an href `safeHref` refuses, nothing is drawn.

## Scope

nextcloud-vue CnSettingsSection; dossiq's VTH settings use it (R22-DASH). A component prop, no manifest schema change.
