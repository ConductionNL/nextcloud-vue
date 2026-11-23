/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An expandable row's header button draws its `icon` (board PqPipelines:
 * Bewerken with the pencil).
 *
 * @spec openspec/changes/expandable-row-as-drawn/specs/expandable-row-as-drawn/spec.md
 */
import { mount } from '@vue/test-utils'
import CnExpandableRow from '../../src/components/CnExpandableRow/CnExpandableRow.vue'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'

function mountRow(buttons) {
	return mount(CnExpandableRow, {
		props: { object: { id: 'p1', title: 'Verkoop' }, layout: { title: 'title', buttons } },
	})
}

describe('CnExpandableRow header button icon', () => {
	it('draws the named icon in the button', () => {
		const wrapper = mountRow([{ action: 'edit', label: 'Edit', icon: 'Pencil' }])
		const button = wrapper.find('[data-testid="cn-expandable-row-button-edit"]')
		const icon = wrapper.findComponent(CnIcon)
		expect(icon.exists()).toBe(true)
		expect(icon.props('name')).toBe('Pencil')
		expect(button.element.contains(icon.element)).toBe(true)
	})

	it('draws no icon when the button names none', () => {
		const wrapper = mountRow([{ action: 'edit', label: 'Edit' }])
		expect(wrapper.findComponent(CnIcon).exists()).toBe(false)
	})
})
