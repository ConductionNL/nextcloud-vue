---
kind: code
---

# Proposal: notification-matrix-group-row

## Summary

In the board look a group row of the notification matrix ("Lead", "Ticket") was 60px against the boards' 34 (PqPersoonlijk, DqPersoonlijkeInstellingen): its cell took the event rows' 10px padding and the group button took Nextcloud's 34px clickable height and 3px margin. The boards draw the group as a 13px/600 muted line, 14px above and 4px below, over the soft rule. The group cell drops the event rows' padding and the button holds the 14px and 4px itself, without a clickable height or margin, so the whole line still folds the group.

## Scope

- `CnNotificationMatrix.vue` style, a css test.
