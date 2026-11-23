/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action shown by a workspace value follows that value: PqWerkplekKlant's
 * "Log contact" header button hides while a call is on, and the call starts
 * after the page has mounted.
 *
 * @spec openspec/changes/action-visible-follows-workspace/specs/action-buttons/spec.md#requirement-an-actions-workspace-condition-follows-the-workspace
 */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'

/**
 * Let the async visibility pass finish.
 *
 * @return {Promise<void>}
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const actions = [
	{ id: 'log-contact', label: 'Log contact', type: 'navigate', route: 'Tickets', visibleWhen: { workspace: 'callActive', op: 'neq', value: true } },
	{ id: 'always', label: 'Always', type: 'navigate', route: 'Tickets' },
]

describe('CnActionButtons: a workspace condition follows the workspace', () => {
	it('hides the action when the workspace value changes after mount, and shows it again', async () => {
		const workspace = ref({})
		const wrapper = mount(CnActionButtons, {
			propsData: { actions },
			provide: { cnWorkspaceContext: workspace },
			mocks: { $router: { push: jest.fn() } },
		})
		await flush()
		expect(wrapper.vm.visibleActions.map((a) => a.id)).toEqual(['log-contact', 'always'])

		workspace.value.callActive = true
		await flush()
		expect(wrapper.vm.visibleActions.map((a) => a.id)).toEqual(['always'])

		workspace.value.callActive = false
		await flush()
		expect(wrapper.vm.visibleActions.map((a) => a.id)).toEqual(['log-contact', 'always'])
	})
})
