# Proposal: settings-form-control-height

## Why

CnSettingsFormWidget draws its text fields and selects 40px tall, as the boards do (PtPortalInstellingen "Gemeente
Zuiddrecht", "Mijn Zuiddrecht", "zuiddrecht"). Live they are 34px: Nextcloud's core stylesheet sets a text input's
height through a selector of about eleven attribute tests, which the component's class does not outrank. COMPDIFF pq2:
`h 40>34` on 4 fields; still 34px on :8080 with nc-vue 2.124.

## What changes

The settings form's control also sets `min-height` to the control height. Core sets an input's min-height only through
a bare `input` selector, so the component's value holds and the control is 40px again.

## Scope

nextcloud-vue, CnSettingsFormWidget. Both looks: the component meant 40px in both.
