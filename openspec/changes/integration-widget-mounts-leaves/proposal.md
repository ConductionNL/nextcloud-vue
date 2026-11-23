# Proposal: integration-widget-mounts-leaves

## Why

dossiq wraps two decidiq leaves (decisions on a case, the approval chain on a document) in components of its own,
because CnIntegrationWidget's single mode cannot mount a mount-mode leaf and a detail page's `integration` widget
renders nothing when the leaf is not registered. filinq's DocumentLeafTabs does the same.

## What changes

In single mode (`only`) CnIntegrationWidget mounts a mount-mode leaf through CnLeafMountHost, forwards
`objectLabel`, can tell the leaf another surface (`leafSurface`), and with `appName` shows "{App} not available" for a
leaf that is not registered. CnDetailWidgetHost shows that state for an `integration` widget whose leaf is absent.

## Scope

Additive: without the new keys every component behaves as before.
