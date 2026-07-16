/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `NcActions` (real component, popover-based) teleports its menu content
 * into a `v-popper__popper` node appended to `document.body` only after
 * the trigger button is clicked, and floating-ui positions it on a
 * macrotask (a plain `$nextTick()` is not enough — confirmed empirically
 * while building this harness). The popper wrapper itself stays
 * `aria-hidden="true"` in jsdom even once open (its visibility class is
 * driven by a CSS transition jsdom does not run), which would make
 * `axe-core` skip the whole menu if scanned from the component root — so
 * callers must scan the `[role="menu"]` node directly instead, which this
 * helper locates.
 *
 * @param {object} wrapper A mounted `@vue/test-utils` wrapper containing an `NcActions` trigger button.
 * @return {Promise<Element>} The opened menu's `<ul role="menu">` element.
 * @throws {Error} When no `[role="menu"]` appears in `document` after opening.
 */
async function openNcActionsMenu(wrapper) {
	await wrapper.find('button').trigger('click')
	await wrapper.vm.$nextTick()
	// eslint-disable-next-line no-promise-executor-return
	await new Promise((resolve) => setTimeout(resolve, 30))

	const menu = document.querySelector('[role="menu"]')
	if (!menu) {
		throw new Error('openNcActionsMenu: no [role="menu"] found in document after clicking the trigger button.')
	}
	return menu
}

module.exports = { openNcActionsMenu }
