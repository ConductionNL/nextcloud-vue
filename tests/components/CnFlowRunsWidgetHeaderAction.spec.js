/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow runs card's header action (`content.headerAction`, DqZaak's
 * "Flow uitvoeren"), reported through the `header` event like the facts
 * card's, dispatched through the page's action dispatcher.
 */
var mockRefetch = jest.fn(() => Promise.resolve())

jest.mock('../../src/composables/useEndpointSource.js', () => {
	const { computed } = require('vue')
	return {
		useEndpointSource: () => ({
			data: computed(() => ({ results: [], total: 0 })),
			loading: computed(() => false),
			error: computed(() => ''),
			refetch: mockRefetch,
		}),
	}
})

import { flushPromises, mount } from '@vue/test-utils'

const CnFlowRunsWidget = require('../../src/components/CnFlowRunsWidget/CnFlowRunsWidget.vue').default

const DUTCH = { 'Run flow': 'Flow uitvoeren' }

/**
 * @param {object} content The widget content.
 * @param {Function} dispatch The page's action dispatcher.
 * @return {object} The wrapper.
 */
function mountWidget(content, dispatch) {
	return mount(CnFlowRunsWidget, {
		props: { content: { pollSeconds: 0, ...content } },
		global: { provide: { cnTranslate: (s) => DUTCH[s] || s, cnDispatchAction: dispatch } },
	})
}

describe('CnFlowRunsWidget headerAction', () => {
	it('reports the action through the header event, translated', () => {
		const w = mountWidget({ headerAction: { label: 'Run flow', icon: 'Play', type: 'handler', handler: 'runCaseFlow' } }, jest.fn())
		const header = w.emitted('header').at(-1)[0]
		expect(header.action).toMatchObject({ label: 'Flow uitvoeren', icon: 'Play' })
		expect(typeof header.action.run).toBe('function')
	})

	it('dispatches the action and reads the runs again', async () => {
		const dispatch = jest.fn(() => Promise.resolve(true))
		const w = mountWidget({ headerAction: { label: 'Run flow', type: 'handler', handler: 'runCaseFlow' } }, dispatch)
		mockRefetch.mockClear()
		await w.emitted('header').at(-1)[0].action.run()
		await flushPromises()
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'handler', handler: 'runCaseFlow' }))
		expect(mockRefetch).toHaveBeenCalled()
	})

	it('reports no action without one', () => {
		const w = mountWidget({}, jest.fn())
		expect(w.emitted('header').at(-1)[0].action).toBeNull()
	})
})
