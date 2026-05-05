CnUserActionMenu shows a popover with avatar and contextual actions (message, chat, email, meeting) when the user name is clicked. Action availability depends on which Nextcloud apps (Talk, Mail, Calendar) are installed.

Basic — click the user name to open the popover:

```vue
<template>
  <div style="display: flex; align-items: center; gap: 8px; padding: 8px;">
    <span style="font-size: 14px;">Assigned to:</span>
    <CnUserActionMenu
      user-id="jane"
      display-name="Jane Smith"
      user-email="jane@example.com"
      :interactive="true" />
  </div>
</template>
```

Non-interactive — just displays the name without popover:

```vue
<div style="display: flex; flex-direction: column; gap: 8px;">
  <div style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 12px; color: var(--color-text-maxcontrast);">Owner:</span>
    <CnUserActionMenu user-id="admin" display-name="Administrator" :interactive="false" />
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <span style="font-size: 12px; color: var(--color-text-maxcontrast);">Reviewer:</span>
    <CnUserActionMenu user-id="bob" display-name="Bob Jones" :interactive="true" />
  </div>
</div>
```
