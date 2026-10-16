# Tasks: tabs-widget-header-link

### Task 1: The tab strip draws the open panel's header link
- **spec_ref**: `openspec/changes/tabs-widget-header-link/specs/tabs-widget-header-link/spec.md#requirement-the-tab-strip-draws-the-open-panels-header-link`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/utils/contentHeaderLink.js`, `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`
- [x] Implement: link beside the strip from the open tab's widget, router link or anchor, translated label; CnWidgetWrapper shares the link target helper
- [x] Test: `tests/components/CnTabsWidgetHeaderLink.spec.js`, `tests/utils/contentHeaderLink.spec.js`; e2e `e2e/l18-tabs-header-link.e2e.js` (`?l7=l18-tabs-header-link`)
