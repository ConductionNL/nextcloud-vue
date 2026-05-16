# CnRoadmapTab

Reaction-sorted GitHub issues feed for the Features & Roadmap surface. Fetches
`labels=enhancement,feature` from OpenRegister's `github-issue-proxy` on mount,
renders each result via `<CnRoadmapItem>`, and handles four documented degraded
states with distinct localized messages.

## States

| State | Trigger | UI |
|---|---|---|
| Loading | initial mount | `NcLoadingIcon` |
| Disabled | `disabled` prop = `true` | "Roadmap disabled by admin" empty state |
| PAT not configured | API returns `hint: github_pat_not_configured` | "Ask your admin to configure GitHub PAT" empty state |
| Rate limited | API returns `429 github_rate_limited` | "GitHub temporarily unavailable" message |
| Network error | axios rejects | Generic error with Retry button |
| Empty | API returns 200 with `items: []` | "No roadmap items yet" empty state |
| Populated | items present | Reaction-sorted list rendered via `<CnRoadmapItem>` |

## Backend contract

`GET /index.php/apps/openregister/api/github/issues?repo=<owner/repo>&labels=enhancement,feature`
— see [`openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`](https://github.com/ConductionNL/openregister/tree/development/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy).
The `labels` filter is hardcoded per design D23 in the openregister change.

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnRoadmapTab"
- Implementation: [src/components/CnRoadmapTab/CnRoadmapTab.vue](../../src/components/CnRoadmapTab/CnRoadmapTab.vue)
