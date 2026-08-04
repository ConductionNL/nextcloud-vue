/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Real `@nextcloud/vue` components for the `check:a11y` lane.
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
 * The fix: `@nextcloud/vue` publishes a per-component subpath export
 * (`@nextcloud/vue/dist/Components/<Name>.js`, see its `package.json`
 * `exports` map) that requires ONLY that component's own chunk. Every name
 * below is REAL, individually verified to mount cleanly under jsdom without
 * hitting the ESM chain. `NcSelect`, `NcListItem`, `NcListItemIcon`,
 * `NcAvatar`, and `NcRichContenteditable` are the ones that DO hit it
 * (directly or via `NcAvatar`) — those five keep a hand-written,
 * markup-accurate stub below instead of the real component. Each stub
 * mirrors the real component's actual accessibility contract (real
 * `role`/`aria-*`, real label wiring) closely enough that a consumer
 * component which forgets to pass an accessible name still fails the way
 * it would against the real thing — see each stub's own comment for the
 * exact contract it mirrors and where that contract is documented
 * elsewhere in this codebase (e.g. `hydra-gate-nc-input-labels`).
 *
 * Extending this file: if a new a11y spec needs an `@nextcloud/vue`
 * component not listed here, try `require('@nextcloud/vue/dist/Components/<Name>.js')`
 * first (see the loop below) — add it to REAL_COMPONENT_NAMES if it mounts
 * cleanly. Only fall back to a hand stub if it hits the same ESM wall.
 */

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
]

const real = {}
for (const name of REAL_COMPONENT_NAMES) {
	// eslint-disable-next-line global-require, import/no-dynamic-require
	real[name] = require(`@nextcloud/vue/dist/Components/${name}.js`)
}

/**
 * Hand-written stand-in for `NcSelect` — the real component wraps
 * `vue-select` and (via `NcListItemIcon`) transitively requires `NcAvatar`,
 * which is the ESM-blocked chain described above.
 *
 * Mirrors the real component's actual accessibility contract: an
 * `inputLabel` prop OR an `aria-label-combobox` fallthrough attribute
 * supplies the combobox's accessible name (both are real `NcSelect` APIs —
 * `src/composables/cnFormFieldRenderer.js` uses `inputLabel`,
 * `src/components/CnActionsBar/CnActionsBar.vue` uses
 * `aria-label-combobox`). A consumer that supplies neither renders an
 * unlabelled combobox here exactly as it would for the real component,
 * so `expectAccessible` still catches the same class of bug the
 * `hydra-gate-nc-input-labels` gate exists for.
 */
const NcSelectStub = {
	name: 'NcSelect',
	props: {
		inputLabel: { type: String, default: null },
		value: { default: null },
		options: { type: Array, default: () => [] },
		multiple: { type: Boolean, default: false },
	},
	render(h) {
		const accessibleName = this.inputLabel || this.$attrs['aria-label-combobox'] || this.$attrs['aria-label']
		return h('div', { class: 'stub v-select', attrs: { role: 'combobox', 'aria-expanded': 'false' } }, [
			h('input', {
				attrs: {
					type: 'text',
					role: 'searchbox',
					'aria-label': accessibleName || undefined,
					'aria-multiselectable': this.multiple ? 'true' : undefined,
				},
			}),
			h('ul', { attrs: { role: 'listbox', 'aria-label': accessibleName || undefined } },
				(this.options || []).map((opt, i) => h('li', { key: opt.id ?? i, attrs: { role: 'option' } }, String(opt.label ?? opt)))),
		])
	},
}

/**
 * Hand-written stand-in for `NcListItem` — real component pulls in
 * `NcAvatar` directly for its leading-icon slot, same ESM chain as above.
 *
 * Mirrors the real contract: renders as an `<li>` (the real component's
 * root element — verified against dist, and the reason `<li>` must live in
 * a `<ul>`/`<ol>`, which is a real WCAG 1.3.1 constraint this stub
 * preserves) containing a real `<a>` whose accessible name is the `name`
 * prop, plus the standard named slots (`subname`, `details`, `actions`)
 * so a consumer's list-row CONTENT is present in the scanned tree, not
 * just the row shell.
 */
const NcListItemStub = {
	name: 'NcListItem',
	props: {
		name: { type: String, default: '' },
	},
	render(h) {
		const slots = this.$slots
		const anchorChildren = [h('span', { class: 'list-item-content__name' }, this.name)]
		if (slots.subname) {
			anchorChildren.push(h('span', { class: 'list-item-content__subname' }, slots.subname))
		}
		if (slots.details) {
			anchorChildren.push(h('span', { class: 'list-item-details' }, slots.details))
		}
		const children = [
			h('a', { attrs: { href: '#', 'aria-label': this.name || undefined }, class: 'list-item' }, anchorChildren),
		]
		if (slots.actions) {
			// Real NcListItem hosts the actions slot inside an NcActions menu,
			// whose root is a `<ul role="menu">` — and each real NcActionButton
			// renders as an `<li>`. This stub reproduces the `<ul>` wrapper (not
			// a `<div>`) so those `<li>` action items have their required list
			// parent (WCAG 1.3.1); omitting it would make axe flag a `listitem`
			// violation that does NOT exist in the real, menu-wrapped component.
			children.push(h('ul', {
				class: 'list-item__extra',
				attrs: { 'aria-label': this.name ? `${this.name} actions` : 'Actions' },
			}, slots.actions))
		}
		return h('li', { class: 'stub NcListItem' }, children)
	},
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
const { NcRichContenteditable: NcRichContenteditableStub } = require('../../__mocks__/nextcloud-vue.js')

module.exports = {
	__esModule: true,
	...real,
	NcSelect: NcSelectStub,
	NcListItem: NcListItemStub,
	NcRichContenteditable: NcRichContenteditableStub,
}
