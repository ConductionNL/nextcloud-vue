/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqCatalogus's menu (Case types, Attributes, Templates, Object types) is a
 * CnMenuWidget whose labels are manifest strings; it drew them raw. They now
 * go through the app's translate, children included, so a Dutch reader sees
 * "Zaaktypen".
 */
import { mount } from '@vue/test-utils'
import CnMenuWidget from '@/components/CnMenuWidget/CnMenuWidget.vue'

const DUTCH = { 'Case types': 'Zaaktypen', Attributes: 'Kenmerken', Catalogue: 'Catalogus', 'Object types': 'Objecttypen' }
const translate = (key) => DUTCH[key] || key

const ITEMS = [
	{ label: 'Case types', url: '/case-types', icon: '', children: [] },
	{ label: 'Catalogue', url: '', icon: '', children: [{ label: 'Object types', url: '/object-types', icon: '', children: [] }] },
	{ label: 'Attributes', url: '/attributes', icon: '', children: [] },
]

describe('CnMenuWidget labels', () => {
	it('draws the top-level labels through the app\'s translate', () => {
		const w = mount(CnMenuWidget, { propsData: { content: { style: 'dropdown', items: ITEMS } }, global: { provide: { cnTranslate: translate } } })
		expect(w.findAll('.cn-menu-widget__bar-button .cn-menu-widget__label').map((b) => b.text())).toEqual(['Zaaktypen', 'Catalogus', 'Kenmerken'])
	})

	it('translates the children too, and leaves the config untouched', () => {
		const content = { style: 'tree', items: ITEMS }
		const w = mount(CnMenuWidget, { propsData: { content }, global: { provide: { cnTranslate: translate } } })
		expect(w.vm.items[1].children[0].label).toBe('Objecttypen')
		expect(content.items[1].children[0].label).toBe('Object types')
	})

	it('draws the labels as written without a translate', () => {
		const w = mount(CnMenuWidget, { propsData: { content: { style: 'dropdown', items: ITEMS } } })
		expect(w.findAll('.cn-menu-widget__bar-button').at(0).text()).toContain('Case types')
	})
})
