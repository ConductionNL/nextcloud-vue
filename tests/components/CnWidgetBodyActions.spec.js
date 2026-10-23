/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget can declare `bodyActions`: buttons a leaf draws in its own button
 * row inside the card body, after its own. DqZaakBetrokkenen draws
 * "Partij toevoegen" beside "Contact koppelen" and "Nieuw contact" in the
 * Partijen card.
 */
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import CnContactsTab from '../../src/integrations/builtin/contacts/CnContactsTab.vue'
import { resolveWidgetHeaderActions, WIDGET_BODY_ACTIONS } from '../../src/utils/widgetHeaderActions.js'

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })
})
afterEach(() => {
	delete global.fetch
})

describe('widget bodyActions', () => {
	it('resolves bodyActions like headerActions, with the record\'s tokens', () => {
		const dispatch = jest.fn()
		const widget = { bodyActions: [{ label: 'Add party', icon: 'AccountPlus', action: { type: 'open-modal', target: 'CasePartyDialog', props: { caseId: '@objectId' } } }] }
		const [button] = resolveWidgetHeaderActions(widget, { objectId: 'case-1', translate: () => 'Partij toevoegen', dispatch }, 'bodyActions')
		expect(button.label).toBe('Partij toevoegen')
		button.run()
		expect(dispatch).toHaveBeenCalledWith({ type: 'open-modal', target: 'CasePartyDialog', props: { caseId: 'case-1' } })
		expect(resolveWidgetHeaderActions(widget, { dispatch })).toEqual([])
	})

	it('draws them after the contacts tab\'s own buttons', async () => {
		const run = jest.fn()
		const wrapper = mount(CnContactsTab, {
			props: { objectId: 'o1', register: 'r1', schema: 's1' },
			global: { provide: { [WIDGET_BODY_ACTIONS]: computed(() => [{ key: '0-Add party', label: 'Partij toevoegen', icon: '', variant: 'secondary', run }]) } },
		})
		await new Promise((resolve) => setTimeout(resolve))
		const labels = wrapper.findAll('.cn-contacts-tab__header .stub.NcButton').map((button) => button.text())
		expect(labels.at(-1)).toBe('Partij toevoegen')
		wrapper.unmount()
	})
})
