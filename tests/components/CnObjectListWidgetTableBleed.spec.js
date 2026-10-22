/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.tableBleed: true` marks an object list whose table runs edge to
 * edge in its card (the board's case-tab tables, DqZaakContact "Contactmomenten
 * op deze zaak"); without it the table stays inside the card's padding
 * (DqTenant "Mandaten").
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

function mountList(content) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'contactMoment', columns: [{ key: 'date', label: 'Date' }], ...content } },
		stubs: { CnDataTable: true },
	})
}

describe('CnObjectListWidget — tableBleed', () => {
	it('marks the widget when the manifest asks for an edge-to-edge table', () => {
		expect(mountList({ tableBleed: true }).classes()).toContain('cn-object-list-widget--bleed')
	})

	it('keeps the table inset by default', () => {
		expect(mountList({}).classes()).not.toContain('cn-object-list-widget--bleed')
	})

	it('only takes a literal true', () => {
		expect(mountList({ tableBleed: 'yes' }).classes()).not.toContain('cn-object-list-widget--bleed')
	})
})
