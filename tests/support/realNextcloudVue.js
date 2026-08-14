/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Real `@nextcloud/vue` components for the lanes that need genuine markup:
 * `check:a11y` (axe-core needs real ARIA) and `check:smoke` (the real-render
 * sweep needs real prop validation and real child resolution).
 *
 * Lives in `tests/support/` rather than `tests/a11y/support/` BECAUSE it is
 * shared. It was a11y-only until the smoke lane arrived; both now map
 * `@nextcloud/vue` here through the common base in
 * `tests/support/realNcJestBase.js`, so a component added below is real for
 * both lanes at once and the two can never disagree about what is real.
 *
 * WHY THIS FILE EXISTS: the repo's main `jest.config.js` maps
 * `@nextcloud/vue` to `tests/__mocks__/nextcloud-vue.js`, a set of generic
 * `<div class="stub">` wrappers (see that file's docblock). That mock is
 * the right choice for behavioural specs — it isolates the component under
 * test from @nextcloud/vue's internals — but it is the WRONG choice for
 * accessibility testing: a generic `<div>` carries none of the real
 * semantics (`<button>`, `<input>`/`<label for>` pairing, `role="dialog"`
 * `aria-modal`, ...) that `axe-core` actually inspects, so running axe
 * against the stub tree would silently pass almost everything — a false
 * sense of security, not an anchor.
 *
 * `jest.a11y.config.js` maps `@nextcloud/vue` to THIS file instead, so
 * every a11y spec mounts the real component tree and axe sees real markup.
 *
 * WHY NOT THE REAL PACKAGE BARREL: `require('@nextcloud/vue')` (the full
 * `dist/index.cjs`) eagerly `require()`s every chunk up front, including
 * `NcAvatar`'s status-message autolinker, which transitively pulls in the
 * ESM-only `unist-builder` → `unist-util-visit-parents` → ... chain. Jest's
 * CJS transform can't parse those (`SyntaxError: Unexpected token 'export'`)
 * and widening `transformIgnorePatterns` just uncovers the next ESM-only
 * package in the chain — confirmed experimentally while building this
 * harness (see `openspec/changes/wcag-a11y-anchor/design.md`, "Why a
 * curated real-component map"). `NcRichContenteditable` has the same
 * problem via `string-length` (ESM-only `strip-ansi`).
 *
 * The fix: `@nextcloud/vue` publishes a per-component entry point that
 * loads ONLY that component's own chunk. Every name in
 * REAL_COMPONENT_NAMES is REAL, individually verified to load cleanly
 * under jsdom without hitting the ESM chain.
 *
 * HOW THAT ENTRY POINT IS REACHED — this changed in `@nextcloud/vue` 9 and
 * is why the whole lane could not even load a single suite until it was
 * updated. The package went ESM-only: its `exports` map now offers ONLY an
 * `import` condition, so under Jest's CJS resolver NEITHER the bare
 * package name NOR a deep `dist/...` path resolves at all ("Cannot find
 * module '@nextcloud/vue'"). The per-component layout also moved from
 * `dist/Components/<Name>.js` (capital C, a single file) to
 * `dist/components/<Name>/index.mjs` (lowercase, a directory). Both are
 * solved the same way the sibling `tests/support/vueSingleton.js` and
 * `tests/support/vueTestUtilsCompat.js` solve their own version of this:
 * resolve the file through the filesystem by ABSOLUTE PATH, which bypasses
 * the `exports` map entirely. `jest.a11y.config.js` supplies the matching
 * `.mjs` transform and `moduleFileExtensions` entry so Babel converts the
 * ESM to CJS on the way in — hence the `.default` unwrap in the loop.
 *
 * `NcRichContenteditable` is the ONE name that still hits the ESM wall, so
 * it keeps a hand-written, markup-accurate stub below. That stub mirrors
 * the real component's actual accessibility contract (real `role`/`aria-*`,
 * real label wiring) closely enough that a consumer component which forgets
 * to pass an accessible name still fails the way it would against the real
 * thing — see the stub's own comment for the exact contract it mirrors and
 * where that contract is documented elsewhere in this codebase (e.g.
 * `hydra-gate-nc-input-labels`).
 *
 * `NcSelect` and `NcListItem` USED to need hand stubs for the same reason
 * (both reached the `unist-builder` chain through `NcAvatar`). On
 * `@nextcloud/vue` 9 they load for real — `NcSelect` once its ESM-only
 * `@nextcloud/vue-select` dependency is aliased by path in
 * `jest.a11y.config.js` — so their stubs are gone and axe-core now
 * inspects their genuine markup instead of our approximation of it. That
 * is a strict improvement: a hand stub can only ever encode the contract
 * we BELIEVE the component has.
 *
 * Extending this file: add the component to REAL_COMPONENT_NAMES first and
 * see whether it loads. If it dies on `Unexpected token 'export'` from a
 * node_modules path, check whether adding that ONE package to
 * `transformIgnorePatterns` in `jest.a11y.config.js` terminates the chain
 * (that is how `nostics` / `debounce` / `perfect-debounce` / `tributejs`
 * got there). Only fall back to a hand stub if the chain does not
 * terminate.
 */

const path = require('path')
// Resolved through the same `tests/support/vueSingleton.js` mapping the configs
// install, so this shares the ONE Vue instance the specs use.
const { h } = require('vue')

const REAL_COMPONENT_NAMES = [
	'NcButton',
	'NcTextField',
	'NcTextArea',
	'NcDialog',
	'NcModal',
	'NcCheckboxRadioSwitch',
	'NcActionButton',
	'NcActionLink',
	'NcActions',
	'NcActionSeparator',
	'NcActionCaption',
	'NcActionCheckbox',
	'NcLoadingIcon',
	'NcNoteCard',
	'NcAppSidebar',
	'NcAppSidebarTab',
	'NcPopover',
	'NcEmptyContent',
	'NcDateTime',
	'NcAppNavigation',
	'NcAppNavigationItem',
	'NcContent',
	// Real as of @nextcloud/vue 9 — previously hand-stubbed, see docblock.
	'NcSelect',
	'NcListItem',
	// Added with the `check:smoke` lane. Every one of these is referenced from
	// `src/` and was previously UNMAPPED, which means it resolved to nothing:
	// Vue logged `Failed to resolve component: <name>` and rendered an empty
	// placeholder. For the a11y lane that was a silent hole — axe inspected
	// markup with the component missing and passed. Each was verified to load
	// cleanly by the same method the docblock prescribes.
	'NcActionInput',
	'NcActionText',
	'NcAppContent',
	'NcAppNavigationCaption',
	'NcAppNavigationNew',
	'NcAppNavigationSearch',
	'NcAppNavigationSettings',
	'NcAppSettingsDialog',
	'NcAppSettingsSection',
	'NcColorPicker',
	'NcCounterBubble',
	'NcDateTimePicker',
	'NcDateTimePickerNative',
	'NcIconSvgWrapper',
	'NcInputField',
	'NcSelectTags',
	'NcSettingsSection',
]

/**
 * Names that CANNOT be loaded for real and fall back to the generic stub.
 *
 * All five die on `SyntaxError: Unexpected token 'export'` from the ESM-only
 * `unist-builder` / `string-length` chains described in the docblock above —
 * re-verified against `@nextcloud/vue` 9.9.0 when this list was written, by
 * requiring each per-component entry point directly.
 *
 * They are listed EXPLICITLY, rather than being caught by a try/catch around
 * the real loader, so that the set is visible and countable: the smoke lane
 * prints it on every run (see `tests/smoke/renderAll.smoke.spec.js`). A
 * silently-swallowed load failure would degrade a lane back into the
 * false-pass it exists to prevent, which is exactly the failure mode that
 * left the seventeen names above unmapped and unnoticed.
 *
 * Reviving one is a strict improvement — try the `transformIgnorePatterns`
 * route the docblock describes, and if the chain terminates, move the name up
 * into REAL_COMPONENT_NAMES.
 */
const STUBBED_COMPONENT_NAMES = [
	'NcAvatar',
	'NcRichText',
	'NcRichContenteditable',
	'NcDashboardWidget',
	'NcDashboardWidgetItem',
]

/**
 * Directory holding `@nextcloud/vue` 9's per-component entry points. Reached
 * by absolute path rather than by package name because the package's
 * `exports` map is `import`-only and would otherwise be unresolvable from
 * Jest's CJS resolver — see the module docblock.
 */
const COMPONENTS_DIR = path.join(__dirname, '../../node_modules/@nextcloud/vue/dist/components')

const real = {}
for (const name of REAL_COMPONENT_NAMES) {
	// Babel has transformed the `.mjs` to CJS, so the component sits on
	// `.default` (`index.mjs` is `export { N as default }`).
	// eslint-disable-next-line global-require, import/no-dynamic-require
	const mod = require(path.join(COMPONENTS_DIR, name, 'index.mjs'))
	real[name] = mod.default ?? mod
}

/**
 * Hand-written stand-in for `NcRichContenteditable` — real component's
 * `@mentions` autocomplete pulls in `string-length` (ESM-only), a separate
 * chain from the `NcAvatar` one above but the same root cause.
 *
 * This is the SAME stub already used by the default (non-a11y) mock file
 * (`tests/__mocks__/nextcloud-vue.js`) — reused here rather than
 * duplicated, since it already renders a real, correctly-labelled
 * `<textarea>` with a `placeholder`.
 */
// eslint-disable-next-line import/no-dynamic-require, global-require
const genericStubs = require('../__mocks__/nextcloud-vue.js')

/**
 * Minimal passthrough for a stubbed name the generic mock does not export.
 *
 * Renders its children so a parent's slot content still executes, which keeps
 * the failure mode "child chrome missing" rather than "whole subtree gone".
 *
 * @param {string} name Component name, used for the marker class.
 * @return {object} A render-only component definition.
 */
function passthroughStub(name) {
	return {
		name,
		render() {
			return h('div', { class: 'stub stub--' + name }, this.$slots.default?.())
		},
	}
}

const stubbed = {}
for (const name of STUBBED_COMPONENT_NAMES) {
	stubbed[name] = genericStubs[name] ?? passthroughStub(name)
}

module.exports = {
	__esModule: true,
	...real,
	...stubbed,
	/**
	 * Introspection for the smoke lane's coverage report. Not part of
	 * `@nextcloud/vue`'s surface — a component that reads these deserves to
	 * break.
	 */
	__cnRealNames: [...REAL_COMPONENT_NAMES],
	__cnStubbedNames: [...STUBBED_COMPONENT_NAMES],
}
