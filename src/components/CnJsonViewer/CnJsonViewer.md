Read-only JSON display:

```vue
<CnJsonViewer
  :value="JSON.stringify({ name: 'Jane Smith', email: 'jane@example.com', status: 'active', roles: ['admin', 'user'] }, null, 2)"
  :read-only="true"
  height="200px" />
```

Editable JSON with format button:

```vue
<template>
  <div>
    <CnJsonViewer :value="json" height="180px" @update:value="json = $event" />
    <p style="font-size: 12px; color: var(--color-text-maxcontrast); margin-top: 4px;">
      Type invalid JSON to see the error indicator.
    </p>
  </div>
</template>
<script>
export default {
  data() {
    return {
      json: '{\n  "key": "value",\n  "count": 42\n}',
    }
  },
}
</script>
```

XML mode:

```vue
<CnJsonViewer
  language="xml"
  :read-only="true"
  height="160px"
  :value="`<?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot;?>\n<person>\n  <name>Jane Smith</name>\n  <email>jane@example.com</email>\n  <role>admin</role>\n</person>`" />
```

Auto-detect mode — sniffs JSON, XML/HTML, or falls back to plain text:

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <p style="font-size: 12px; margin-bottom: 4px; color: var(--color-text-maxcontrast);">JSON (auto-detected)</p>
      <CnJsonViewer language="auto" :read-only="true" height="80px" value='{"detected": "json"}' />
    </div>
    <div>
      <p style="font-size: 12px; margin-bottom: 4px; color: var(--color-text-maxcontrast);">Plain text (fallback)</p>
      <CnJsonViewer language="auto" :read-only="true" height="60px" value="Just plain text, no markup." />
    </div>
  </div>
</template>
```
