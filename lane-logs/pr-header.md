LaunchPad REQ-HDR-009, as amended, keeps the four header height presets as the starting height of a header when it is added; after that the header is resized on the grid. The form had dropped the control, so a new header always started at medium. The Height select is back for new headers (small, medium, large, extra large, medium by default) with a short hint that the height is changed on the dashboard afterwards. It is not offered when editing a placed header. The preset labels and hint now have Dutch translations.

What ran locally:
- `tests/components/CnHeaderWidgetFormHeight.spec.js`: 3 passed; on main 2 of the 3 fail.
- Jest for the CnHeaderWidget and l10n suites: 42 suites, 182 tests passed.
- eslint on the changed files: clean.
- `npm run build`: exit 0.

This change was written with AI assistance (Claude Code) and reviewed before merge.
