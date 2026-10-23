---
kind: code
---

# Proposal: secret-address-card

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract components. learniq has two copies of one job: a
personal calendar feed address (TimetableCalendarFeedDialog) and a hall screen's address (DisplayScreenAddressView).
Both make an address with a secret token, show it once (the server keeps a hash), let the user copy it, reset it so the
old one stops working, and remove it. planninq and dossiq calendar subscriptions and integriq webhook URLs are the
same shape. CnCredentials is a vault for stored secrets, not this.

CnSecretAddressCard does the job over three endpoints (status, create, revoke). It sits in a settings section (the
calendar feed goes into the user settings dialog) or, with `dialog`, is the target of an `open-modal` action.

## Scope

New component, docs, unit tests.
