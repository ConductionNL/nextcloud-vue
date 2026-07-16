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

HTML mode — showcases highlighting across markup, inline `<style>`, and inline `<script>`:

```vue
<CnJsonViewer
  language="html"
  :read-only="true"
  height="320px"
  :value="`<!DOCTYPE html>\n<html lang=&quot;en&quot;>\n  <head>\n    <title>Hello</title>\n    <style>\n      body { font-family: system-ui, sans-serif; padding: 16px; }\n      .greeting { color: #0082c9; font-weight: 600; }\n      .greeting:hover { text-decoration: underline; }\n    </style>\n  </head>\n  <body>\n    <h1 class=&quot;greeting&quot;>Hello, world!</h1>\n    <p>Welcome to <a href=&quot;https://example.com&quot;>example.com</a>.</p>\n    <button id=&quot;wave&quot; type=&quot;button&quot;>Wave</button>\n    <script>\n      const btn = document.getElementById('wave')\n      btn.addEventListener('click', () => {\n        const greeting = document.querySelector('.greeting')\n        greeting.textContent = greeting.textContent === 'Hello, world!'\n          ? 'Hello again!'\n          : 'Hello, world!'\n      })\n    <\/script>\n  </body>\n</html>`" />
```

Custom error text — use `errorText` to replace the built-in "Invalid JSON format" banner with a caller-controlled message. The banner shows when `errorText` is a non-empty string and hides when it is empty:

```vue
<template>
  <div>
    <CnJsonViewer
      :value="json"
      height="160px"
      :error-text="parseError"
      @update:value="validate($event)" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      json: '{"key": "value"}',
      parseError: '',
    }
  },
  methods: {
    validate(val) {
      this.json = val
      try { JSON.parse(val); this.parseError = '' }
      catch (e) { this.parseError = e.message }
    },
  },
}
</script>
```

Auto-detect mode — sniffs JSON, HTML, XML, or falls back to plain text. The component emits `detected-language` with the resolved language whenever it changes (and once on mount):

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 8px; align-items: center;">
      <label style="font-size: 13px;">Sample:</label>
      <select v-model="sample" style="padding: 4px;">
        <option value="json">JSON</option>
        <option value="html">HTML</option>
        <option value="xml">XML</option>
        <option value="text">Plain text</option>
      </select>
      <span style="font-size: 13px; color: var(--color-text-maxcontrast);">
        Detected: <strong>{{ detected || '—' }}</strong>
      </span>
    </div>
    <CnJsonViewer
      language="auto"
      height="140px"
      :value="samples[sample]"
      @detected-language="detected = $event" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      sample: 'json',
      detected: '',
      samples: {
        json: '{\n  "detected": "json",\n  "count": 42\n}',
        html: '<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>',
        xml: '<?xml version="1.0"?>\n<note>\n  <to>Tove</to>\n  <body>Hi!</body>\n</note>',
        text: 'Just plain text, no markup.',
      },
    }
  },
}
</script>
```
