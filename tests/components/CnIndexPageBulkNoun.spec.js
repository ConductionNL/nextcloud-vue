/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board bulk band names what is selected: "Met de geselecteerde zaken"
 * (DqZaken, DqZakenSorteren, DqFilterInMenu). A page names the plural with
 * `config.bulkNoun`, read through the app's translate, when its schema
 * carries none; without either the band says "items".
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const stubs = { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true, CnActionsBar: { name: 'CnActionsBar', props: ['bulkNoun'], template: '<div />' } }

/**
 * The noun the actions bar gets.
 *
 * @param {object} props Extra props.
 * @param {object} schema The schema.
 * @return {string}
 */
function nounFor(props, schema = { title: 'Case', properties: { title: { type: 'string' } } }) {
	const w = mount(CnIndexPage, {
		propsData: { title: 'Zaken', schema, objects: [{ id: '1', title: 'A' }], ...props },
		global: { stubs, provide: { cnTranslate: (key) => ({ Cases: 'Zaken' })[key] || key } },
	})
	return w.findComponent({ name: 'CnActionsBar' }).props('bulkNoun')
}

describe('bulkNoun', () => {
	it('names the plural through the app translate, lower-cased', () => {
		expect(nounFor({ bulkNoun: 'Cases' })).toBe('zaken')
	})

	it('wins over the schema plural', () => {
		expect(nounFor({ bulkNoun: 'Cases' }, { title: 'Case', titlePlural: 'Records', properties: {} })).toBe('zaken')
	})

	it('leaves the schema plural, else nothing, without it', () => {
		expect(nounFor({}, { title: 'Case', titlePlural: 'Records', properties: {} })).toBe('records')
		expect(nounFor({})).toBe('')
	})
})
