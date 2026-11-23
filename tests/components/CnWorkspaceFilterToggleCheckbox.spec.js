/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A workspace-filter toggle drawn as a checkbox (`control: "checkbox"`),
 * as board PqMijnWerk draws "Toon afgerond"; a switch stays the default.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnWorkspaceFilterWidget from '../../src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

/**
 * @param {object} content widget content
 * @return {{wrapper: object, workspace: object}} mounted
 */
function mountFilter(content) {
	const workspace = ref({})
	const wrapper = mount(CnWorkspaceFilterWidget, {
		props: { content },
		global: {
			provide: { cnWorkspaceContext: workspace, cnTranslate: (key) => key },
			stubs: {
				NcCheckboxRadioSwitch: {
					props: ['modelValue', 'type'],
					emits: ['update:modelValue'],
					template: '<label :data-type="type"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>',
				},
				NcSelect: { template: '<div />' },
			},
		},
	})
	return { wrapper, workspace }
}

const TOGGLE = { style: 'toggle', label: 'Show completed', writes: '@workspace.showDone' }

describe('workspace-filter toggle as a checkbox', () => {
	it('draws a switch by default', async () => {
		const { wrapper } = mountFilter(TOGGLE)
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-workspace-filter-toggle"]').attributes('data-type')).toBe('switch')
	})

	it('draws a checkbox with control "checkbox", and still writes on and off', async () => {
		const { wrapper, workspace } = mountFilter({ ...TOGGLE, control: 'checkbox' })
		await flushPromises()
		const toggle = wrapper.find('[data-testid="cn-workspace-filter-toggle"]')
		expect(toggle.attributes('data-type')).toBe('checkbox')
		expect(toggle.classes()).toContain('cn-workspace-filter-widget__toggle--checkbox')
		await toggle.find('input').setValue(true)
		expect(workspace.value.showDone).toBe(true)
	})
})
