/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.addPlacement: "header"` puts the list's Add in its card's title row
 * instead of below the rows (board PqTicketContactmomenten "Contact
 * vastleggen", an outlined button beside "Contactmomenten").
 *
 * @spec openspec/changes/list-add-in-panel-heading/specs/object-list/spec.md#requirement-a-list-can-put-its-add-in-the-title-row
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

function mountList(content) {
	return shallowMount(CnObjectListWidget, {
		propsData: {
			content: { register: 'pipelinq', schema: 'ticket', columns: [{ key: 'title', label: 'Subject' }], addLabel: 'Log contact', ...content },
			presetRows: [{ id: 't-1', title: 'Belde over de vergunning' }],
		},
		provide: { cnTranslate: (key) => ({ 'Log contact': 'Contact vastleggen' }[key] ?? key) },
		stubs: { CnDataTable: true },
	})
}

const headers = (w) => (w.emitted('header') || []).map(([header]) => header)

describe('CnObjectListWidget add in the title row', () => {
	it('reports the Add as an outlined title-row action and draws none below the rows', async () => {
		const w = mountList({ addPlacement: 'header', addIcon: 'Phone' })
		await flushPromises()
		const last = headers(w).at(-1)
		expect(last.actions).toHaveLength(1)
		const [add] = last.actions
		expect(add).toMatchObject({ label: 'Contact vastleggen', icon: 'Phone', add: true, variant: 'secondary' })
		const open = jest.spyOn(w.vm, 'openCreate').mockImplementation(() => {})
		add.run()
		expect(open).toHaveBeenCalled()
		expect(w.find('.cn-object-list-widget__add').exists()).toBe(false)
	})

	it('keeps the Add below the rows by default', async () => {
		const w = mountList({})
		await flushPromises()
		expect(headers(w).some((h) => Array.isArray(h.actions) && h.actions.length > 0)).toBe(false)
	})
})
