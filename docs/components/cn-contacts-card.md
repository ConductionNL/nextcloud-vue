# CnContactsCard

Single-entity card for the `contacts` integration leaf. Renders one or many vCard contacts linked to an OpenRegister object as a compact avatar chip (single-entity mode) or a horizontal list (detail-page mode).

Reads the same `ContactLink` payload as [`CnContactsTab`](./cn-contacts-tab.md), so `avatarUrl` / `phone` / `org` come straight from the Tier-2 widened service response.

## Usage

```vue
<CnContactsCard
  :object-id="objectId"
  :register="registerId"
  :schema="schemaId" />
```

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `objectId` | `String` | — | (required) The OR object's UUID. |
| `register` | `String` | `''` | The register slug or numeric id. |
| `schema` | `String` | `''` | The schema slug or numeric id. |
| `apiBase` | `String` | `/apps/openregister/api` | Base path for the OR REST API. |
