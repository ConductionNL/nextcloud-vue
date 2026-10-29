# Proposal: stage-primary-icon

## Summary

The detail page's stage primary button (`primaryActionByStage`) draws the icon its action declares, as a quick action does.

## Why

Measurement pl3 (28 October 2026), pipelinq board PqOfferte: "Naar klant sturen" is drawn with its send icon. The action declares `icon: "SendOutline"`, but the primary button rendered only its label.

## What changes

- `CnDetailPage` gains `primaryActionIconName` (the stage entry's `iconName`) and draws it in the header and the next-step card's primary button.
- `tests/components/CnDetailPageStagePrimaryIcon.spec.js`.
