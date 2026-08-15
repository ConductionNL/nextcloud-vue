// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { mount } from '@vue/test-utils'
import CnWidgetEditCog from '../../src/components/CnWidgetEditCog/CnWidgetEditCog.vue'

describe('CnWidgetEditCog', () => {
	it('emits edit when the Edit action is clicked', async () => {
		const w = mount(CnWidgetEditCog, { propsData: { editLabel: 'Edit' } })
		const editBtn = w.find('[data-testid="cn-widget-edit-cog-edit"]')
		expect(editBtn.exists()).toBe(true)
		await editBtn.trigger('click')
		expect(w.emitted('edit')).toBeTruthy()
	})

	it('emits remove when the Delete action is clicked', async () => {
		const w = mount(CnWidgetEditCog, { propsData: { deleteLabel: 'Delete' } })
		await w.find('[data-testid="cn-widget-edit-cog-delete"]').trigger('click')
		expect(w.emitted('remove')).toBeTruthy()
	})

	it('renders the provided labels', () => {
		const w = mount(CnWidgetEditCog, {
			propsData: { editLabel: 'Bewerken', deleteLabel: 'Verwijderen' },
		})
		expect(w.text()).toContain('Bewerken')
		expect(w.text()).toContain('Verwijderen')
	})
})
