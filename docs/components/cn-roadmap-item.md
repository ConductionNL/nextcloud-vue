# CnRoadmapItem

Single roadmap card. Renders one GitHub issue: title (links to `html_url` in a
new tab), submitter avatar + login, reaction count, relative created time,
sanitized markdown body, and filtered label chips.

## Security

- Markdown body flows through `cnRenderMarkdown()` → `DOMPurify.sanitize()` using
  the exported `SAFE_MARKDOWN_DOMPURIFY_CONFIG`. `v-html` is bound ONLY on the
  sanitized output; raw `item.body` is never templated.
- Label chips are filtered through `ROADMAP_LABEL_BLOCKLIST` so hydra workflow
  labels (`build:queued`, `code-review:running`, etc.) never appear in the UI.
- External links use `target="_blank" rel="noopener noreferrer"`.

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnRoadmapItem"
- Implementation: [src/components/CnRoadmapItem/CnRoadmapItem.vue](../../src/components/CnRoadmapItem/CnRoadmapItem.vue)
- Related utilities: [SAFE_MARKDOWN_DOMPURIFY_CONFIG](../utilities/safe-markdown-dompurify-config.md), [ROADMAP_LABEL_BLOCKLIST](../utilities/roadmap-label-blocklist.md)
