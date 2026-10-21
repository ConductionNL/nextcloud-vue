/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A row action names fields of its row with `@row.<field>`: an api-call
 * posts to that row's url with that row's values, and an open-modal hands
 * the row's values to the modal.
 */

import { shallowMount } from '@vue/test-utils'
import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'

jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {} })),
}))

const row = { id: 'w-7', title: 'Rival BV', owner: { id: 'u-1' } }

/**
 * Mount the table with one action and a dispatcher spy.
 *
 * @param {object} action The row action.
 * @return {{wrapper: object, dispatch: Function}}
 */
function mountWith(action) {
	const dispatch = jest.fn()
	const wrapper = shallowMount(CnWidgetObjectTable, {
		propsData: { rows: [row], columns: ['title'], actions: [action] },
		provide: { cnDispatchAction: dispatch },
	})
	return { wrapper, dispatch }
}

describe('CnWidgetObjectTable — @row tokens in row actions', () => {
	it('posts an api-call row action to the url of its row', async () => {
		const action = {
			id: 'run',
			label: 'Run now',
			type: 'api-call',
			url: '/apps/pipelinq/api/competitor-watches/@row.id/run',
			payload: { name: '@row.title', owner: '@row.owner.id', fixed: 1 },
		}
		const { wrapper, dispatch } = mountWith(action)
		await wrapper.vm.runAction(action, row)
		expect(dispatch).toHaveBeenCalledWith({
			...action,
			url: '/apps/pipelinq/api/competitor-watches/w-7/run',
			payload: { name: 'Rival BV', owner: 'u-1', fixed: 1 },
		})
	})

	it('hands an open-modal row action the values of its row', async () => {
		const action = { id: 'override', label: 'Override', type: 'open-modal', target: 'ForecastOverrideModal', props: { ownerId: '@row.owner.id', amount: 5 } }
		const { wrapper, dispatch } = mountWith(action)
		await wrapper.vm.runAction(action, row)
		expect(dispatch).toHaveBeenCalledWith({ ...action, props: { ownerId: 'u-1', amount: 5 } })
	})

	it('leaves an action without row tokens as it is', async () => {
		const action = { id: 'open', label: 'Open', type: 'navigate', target: '/x' }
		const { wrapper, dispatch } = mountWith(action)
		await wrapper.vm.runAction(action, row)
		expect(dispatch).toHaveBeenCalledWith(action)
	})
})
