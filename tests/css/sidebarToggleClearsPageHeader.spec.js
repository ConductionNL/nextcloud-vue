/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * With the object sidebar closed, NcAppSidebar's open toggle sits over the
 * content's top-right corner. The page headers leave it room and the toggle
 * keeps its square size under a theme, so it no longer covers "Acties"
 * (buildiq, larpinq character page). Read from the stylesheet text.
 *
 * @spec openspec/changes/sidebar-toggle-clears-page-header/specs/sidebar-toggle-clears-page-header/spec.md#requirement-the-page-header-leaves-room-for-the-closed-sidebars-toggle
 */
const fs = require('fs')
const path = require('path')

/**
 * The bodies of the rules in a stylesheet whose selector list holds this selector.
 *
 * @param {string} file The stylesheet under src/css.
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(file, selector) {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('the closed sidebar toggle and the page header', () => {
	it.each(['.cn-page-header', '.cn-detail-page__header', '.cn-dashboard-page__header'])('%s ends with the sidebar offset in the Nextcloud look', (header) => {
		expect(rulesFor('page-header.css', `${header}:not(.cn-look-board *)`)).toContain('padding-inline-end: var(--app-sidebar-offset, 0px)')
	})

	it('keeps the toggle square at the clickable area', () => {
		const rule = rulesFor('patches.css', '.app-sidebar__toggle.button-vue.button-vue')
		expect(rule).toContain('width: var(--default-clickable-area)')
		expect(rule).toContain('height: var(--default-clickable-area)')
		expect(rule).toContain('padding: 0')
	})
})
