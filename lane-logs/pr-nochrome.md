The add and edit widget modal drew the Appearance block (Show title, Custom title, Background, Icon) for every widget type, the divider included, although a divider draws none of them. A registry entry can now declare `noChrome: true`, and the modal then leaves the whole Appearance block out. The divider registers with it, so its edit form holds only its own style fields (LaunchPad REQ-DIV-002).

What ran locally:
- `tests/dialogs/CnAddWidgetModalNoChrome.spec.js`: 2 passed; on main both fail.
- Jest for the CnAddWidgetModal, CnDivider and registry suites: 6 suites, 38 tests passed.
- eslint on the changed files: clean.
- `npm run build`: exit 0.

This change was written with AI assistance (Claude Code) and reviewed before merge.
