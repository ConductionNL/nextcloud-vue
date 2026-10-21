---
sidebar_position: 12
---

# CnSearchIndexStatus

The state of OpenRegister's search indexes: the tables in scope, the indexes on them, when maintenance last ran, and whether a rebuild locks a table. Read live from OpenRegister and never copied. The acts are named, not offered: a rebuild walks every table in scope and nothing stops one from a settings page, so the `occ` verbs are printed for somebody with a shell. A failed read is shown as the failure, not as a row of zeroes.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | String | `'/apps/openregister/api/settings/search-index'` | The app path OpenRegister reports its indexes at |
| `command` | String | `'occ openregister:tables:search-index'` | The command named in the closing line |

## Helpers

`lastRunTime(report)` reads OpenRegister's `lastRun` (a run report or `[]`) as an ISO time or null; `SEARCH_INDEX_COMMAND` is the default command.

## Example

```vue
<CnSettingsSection :name="t('myapp', 'Search index')">
	<CnSearchIndexStatus />
</CnSettingsSection>
```
