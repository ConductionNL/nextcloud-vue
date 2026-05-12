# SAFE_MARKDOWN_DOMPURIFY_CONFIG

Frozen DOMPurify configuration used everywhere `@conduction/nextcloud-vue`
renders untrusted markdown. Disallows `<script>`, all `on*` event-handler
attributes, `javascript:` URLs, `<iframe>`, `<style>`. Anchors keep `href`,
`target`, `rel`. Images keep `src`, `alt`, `title`.

## Usage

```js
import DOMPurify from 'dompurify'
import { cnRenderMarkdown, SAFE_MARKDOWN_DOMPURIFY_CONFIG } from '@conduction/nextcloud-vue'

const html = cnRenderMarkdown(userMarkdown)
const safe = DOMPurify.sanitize(html, SAFE_MARKDOWN_DOMPURIFY_CONFIG)
// safe is suitable for v-html
```

The constant is `Object.freeze`d so consumers cannot mutate it at runtime. Forks
that need stricter or looser policies should declare their own constant rather
than overriding this one.

## XSS coverage

Each of these inputs is stripped to safe output:

| Input | Output |
|---|---|
| `<script>alert(1)</script>` | (script tag removed) |
| `<a href="javascript:alert(1)">x</a>` | `<a>x</a>` (href stripped) |
| `<img src="x" onerror="alert(1)">` | `<img src="x">` (onerror stripped) |
| `<iframe src="evil"></iframe>` | (iframe removed) |
| `<style>body{display:none}</style>` | (style removed) |

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "SAFE_MARKDOWN_DOMPURIFY_CONFIG"
- Implementation: [src/utils/safeMarkdownDompurifyConfig.js](../../src/utils/safeMarkdownDompurifyConfig.js)
- Used by: [CnRoadmapItem](../components/cn-roadmap-item.md), [CnSuggestFeatureModal](../components/cn-suggest-feature-modal.md)
