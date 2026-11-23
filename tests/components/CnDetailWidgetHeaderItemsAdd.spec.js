const { mount } = require('@vue/test-utils')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A reported header action with `add: true` (a field list's title-row Add)
 * carries the `--add` modifier, which the board look draws as the card's 34px
 * control (r29 DqZaaktype "Variant toevoegen" read 40). Other actions keep
 * the plain class.
 */
const fs = require('fs')
const path = require('path')
const CnDetailWidgetHeaderItems = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Mount the header items with the given actions.
 *
 * @param {Array<object>} actions The reported actions.
 * @return {object} The wrapper.
 */
function mountItems(actions) {
	return mount(CnDetailWidgetHeaderItems, {
		props: { header: { pill: null, note: '', actions } },
		global: { stubs: { CnIcon: true, CnStatusBadge: true, NcButton: true } },
	})
}

describe('CnDetailWidgetHeaderItems add action', () => {
	it('marks an add action with the --add modifier', () => {
		const w = mountItems([{ label: 'Add a variant', icon: 'Plus', add: true, run: () => {} }])
		expect(w.find('.cn-detail-page__catalog-action').classes()).toContain('cn-detail-page__catalog-action--add')
	})

	it('leaves other actions without it', () => {
		const w = mountItems([{ label: 'Generate document', run: () => {} }])
		expect(w.find('.cn-detail-page__catalog-action').classes()).not.toContain('cn-detail-page__catalog-action--add')
	})

	it('draws the --add action 34px tall in the board look', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page__catalog-action--add:not(.cn-detail-page__side *):not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('height: 34px;')
		expect(body).toContain('min-height: 34px;')
	})
})
