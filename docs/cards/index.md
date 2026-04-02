---
sidebar_position: 4
---

# Cards

Reusable card components for displaying entities in grid or list layouts.

| Component | Description |
|-----------|-------------|
| [CnCard](./cn-card.md) | Generic prop-driven card with title, icon, description, labels, stats, and active state |

## Existing Card Components

The library also includes card components in other categories:

- **[CnObjectCard](../components/cn-object-card.md)** (Data Display) — Schema-driven card that derives title, description, and metadata from a JSON Schema configuration
- **[CnItemCard](../components/cn-item-card.md)** (Data Display) — Compact card for sidebar list items with icon, title, and actions
- **[CnCardGrid](../components/cn-card-grid.md)** (Data Display) — Responsive CSS grid layout for card instances

## When to Use Which Card

| Card | Use When |
|------|----------|
| **CnCard** | You know the fields at build time and want direct prop control (title, stats, labels, active state) |
| **CnObjectCard** | Fields are determined at runtime from a JSON Schema (schema-driven views) |
| **CnItemCard** | You need a minimal card for sidebar lists (icon + title + slot) |
