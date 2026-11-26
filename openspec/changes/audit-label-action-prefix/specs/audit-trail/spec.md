# audit-trail Delta: audit-label-action-prefix

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-label-action-prefix](../../)

## Purpose

One label words every action under a prefix, and can name the tool an entry records.

## ADDED Requirements

### Requirement: An action label can cover every action under a prefix

An `actionLabels` key that ends in `.*` SHALL word every action that starts with the key's prefix followed by a dot. A
key for the exact action (with or without its state) SHALL win over a wildcard, and a longer wildcard SHALL win over a
shorter one. The prefix on its own SHALL NOT be covered.

#### Scenario: Every assistant action reads as the assistant's

- **GIVEN** the labels `{ "mcp.*": "Assistant: {toolId}" }`
- **WHEN** the history words an entry with action `mcp.search` and tool `stackiq.module.search`
- **THEN** it reads "Assistant: stackiq.module.search"

#### Scenario: The more specific label wins

- **GIVEN** the labels `mcp.*` and `mcp.lead.*`
- **WHEN** the history words an entry with action `mcp.lead.search`
- **THEN** it uses the `mcp.lead.*` label

### Requirement: A label can name the tool an entry records

A label's `{toolId}` token SHALL be filled with the entry's `toolId`, and SHALL be empty for an entry without one.

#### Scenario: An entry without a tool

- **GIVEN** the label "Assistant: {toolId}"
- **WHEN** the history words an entry that records no tool
- **THEN** it reads "Assistant: "
