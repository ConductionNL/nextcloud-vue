---
kind: code
---

# Proposal: shipped-configuration-remove-set

## Summary

learniq's admin page lists the example sets the setup wizard loaded and lets
an admin remove one after a confirm (ExampleDataSettingsSection). Every app
with a setup wizard needs the same list. CnShippedConfigurationSection grows a
loaded-sets part: `setsUrl` lists the sets, `removeSetUrl` removes one after a
confirm and shows the server's answer. `endpoint` becomes optional so an app
without a shipped ledger can use only this part.

Builds on `shipped-configuration-section` (branch `dq-abstract-l2b-admin-sections`).
