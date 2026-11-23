---
kind: code
---

# Proposal: notification-matrix-default-per-channel

## Summary

OpenRegister notifications can now declare opt-in channels (e-mail off until a person switches it on). An event's shipped default in CnNotificationMatrix was one boolean for every channel, so an opt-in e-mail column would read on by default. `appDefault` may now be `{ [channelId]: boolean }`; a boolean still means every channel.

## Scope

- `CnNotificationMatrix.vue`, a jest test.
