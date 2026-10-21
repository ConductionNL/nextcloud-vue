const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The index side panel in the board look, against DqFilterBeheren and the
 * IndexZijpaneel board: a 20px bold title without the schema icon, and the
 * tabs as a row of 40px labels, 14px weight 600 in the soft ink, the open one
 * underlined 2px in the primary colour on the strip's rule. Read from the
 * stylesheet text; the root class is checked on the mounted component.
 *
 * @spec openspec/changes/board-index-sidebar-tabs/specs/board-index-sidebar-tabs/spec.md#requirement-the-board-index-side-panel-draws-the-boards-header-and-tab-row
 */
const fs = require('fs')
const path = require('path')
const CnIndexSidebar = require('../../src/components/CnIndexSidebar/CnIndexSidebar.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const panel = '.cn-look-board .cn-index-sidebar-panel'

describe('CnIndexSidebar: the board side panel', () => {
	it('names its root so the board rules reach only this panel', () => {
		const w = mount(CnIndexSidebar, {
			props: { open: true, schema: { title: 'Case', properties: {} } },
			global: { stubs: { NcAppSidebar: { template: '<aside><slot /></aside>' }, NcAppSidebarTab: { template: '<div><slot /></div>' }, NcTextField: true, NcSelect: true, NcPopover: true, NcCheckboxRadioSwitch: true, CnDateRangePicker: true, CnIcon: true, CnSavedViewsPanel: true } },
		})
		expect(w.find('aside').classes()).toContain('cn-index-sidebar-panel')
	})

	it('titles the panel 20px bold, without the schema icon', () => {
		expect(rule(`${panel} .app-sidebar-header__desc .app-sidebar-header__name-container .app-sidebar-header__mainname-container h2.app-sidebar-header__mainname`)).toContain('font-weight: 700')
		expect(rule(`${panel} .app-sidebar-header__figure:has(> .cn-index-sidebar__header-icon)`)).toContain('display: none')
	})

	it('draws the tabs as one row on the strip\'s rule', () => {
		const nav = rule(`${panel} .app-sidebar-tabs__nav[role="tablist"]`)
		expect(nav).toContain('gap: 4px')
		expect(nav).toContain('padding: 14px 12px 0')
		expect(rule(`${panel} .app-sidebar-tabs__highlight`)).toContain('display: none')
	})

	it('draws a tab as a 40px label at 14px weight 600 in the soft ink', () => {
		const tab = rule(`${panel} .app-sidebar-tabs__tab[role="tab"]`)
		expect(tab).toContain('flex-direction: row')
		expect(tab).toContain('height: 40px')
		expect(tab).toContain('padding: 0 10px')
		expect(tab).toContain('font-size: 14px')
		expect(tab).toContain('font-weight: 600')
		expect(tab).toContain('color: var(--cn-board-text-soft)')
	})

	it('underlines the open tab 2px in the primary colour', () => {
		const open = rule(`${panel} .app-sidebar-tabs__tab[role="tab"][aria-selected="true"]`)
		expect(open).toContain('border-bottom-color: var(--color-primary-element)')
		expect(open).toContain('color: var(--color-primary-element-light-text)')
		expect(rule(`${panel} .app-sidebar-tabs__tab[role="tab"]::after`)).toContain('content: none')
	})
})
