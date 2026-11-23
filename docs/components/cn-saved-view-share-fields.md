# CnSavedViewShareFields

The sharing section of a saved view: a group picker over Nextcloud's sharee API (`/ocs/v2.php/apps/files_sharing/api/v1/sharees`, the source the Files share dialog uses) and, per chosen group, a "May edit" switch. Without it the group's members may only read the view; with it they may also save changes to its query, sort, columns and presentation. Never delete it, never change its audience.

Used by [`CnSaveViewDialog`](./cn-save-view-dialog.md) and [`CnSavedViewShareDialog`](./cn-saved-view-share-dialog.md). The section renders nothing when the sharee API answers no groups (sharing off, or no group the user may share with) and no group is already chosen.

```vue
<CnSavedViewShareFields v-model="sharedWith" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | Array | `[]` | The chosen audience, `[{ group, mode }]` with `mode` `read` or `write`. |
| `disabled` | Boolean | `false` | Disable the fields. |
| `shareGroups` | String \| Array | `'all'` | Which groups the picker offers. `all` offers every group the sharee API answers; `mine` only the groups the current user is in; an array of group ids only those groups. People are offered either way, and groups already on the view stay listed. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Array<{ group, mode }>` | The audience; `[]` when no group is picked. |

## Limiting the groups

A page whose views belong to teams can keep the picker to the reader's own groups:

```vue
<CnSavedViewShareFields v-model="sharedWith" shareGroups="mine" />
```

On a manifest index page set `config.savedViewsShareGroups: "mine"`; `CnIndexPage` hands it to both the save dialog and the share dialog.
