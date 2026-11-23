/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A report card can carry actions of its own (`cardActions`), shown per the
 * card's state (`cardState`), as hermiq's Reports page offers Subscribe and
 * Cancel on each card.
 *
 * @spec openspec/changes/reports-card-actions/specs/reports-card-actions/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => p }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const CONFIG = {
	cards: [
		{ id: 'AiOversight', label: 'AI oversight', route: 'AiOversight' },
		{ id: 'Usage', label: 'Usage', route: 'Usage' },
	],
	cardState: { url: '/apps/hermiq/api/report-subscriptions', keyField: 'report' },
	cardActions: [
		{ id: 'subscribe', label: 'Send weekly', type: 'api-call', url: '/apps/hermiq/api/report-subscriptions', payload: { report: '@objectId', frequency: 'weekly' }, visibleWhen: { field: 'state.frequency', op: 'empty' } },
		{ id: 'cancel', label: 'Cancel subscription', type: 'api-call', method: 'DELETE', url: '/apps/hermiq/api/report-subscriptions/@objectId', visibleWhen: { field: 'state.frequency', op: 'notEmpty' } },
	],
}
function mountPage(config = CONFIG) {
	return mount(CnReportsPage, {
		props: { page: { id: 'Reports', title: 'Reports', config } },
		global: { mocks: { $router: { push: () => Promise.resolve(), resolve: ({ name }) => ({ href: `/r/${name}` }) } } },
	})
}

function actionIds(w, card) {
	return w.vm.actionsFor(w.vm.resolvedCards.find((c) => c.id === card)).map((a) => a.id)
}

describe('CnReportsPage card actions', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		axios.delete.mockReset()
		axios.get.mockResolvedValue({ data: [{ report: 'Usage', frequency: 'monthly' }] })
		axios.post.mockResolvedValue({ data: { ok: true } })
	})

	it('offers each card the actions its state allows', async () => {
		const w = mountPage()
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/apps/hermiq/api/report-subscriptions')
		expect(actionIds(w, 'AiOversight')).toEqual(['subscribe'])
		expect(actionIds(w, 'Usage')).toEqual(['cancel'])
		expect(w.findAll('[data-testid="cn-report-card-actions"]')).toHaveLength(2)
	})

	it('runs an action with the card as its object and reads the states again', async () => {
		const w = mountPage()
		await flushPromises()
		await w.find('[data-testid="cn-report-card-action-subscribe"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/apps/hermiq/api/report-subscriptions', { report: 'AiOversight', frequency: 'weekly' })
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('draws no actions without cardActions, and reads no state without cardState', async () => {
		const w = mountPage({ cards: CONFIG.cards })
		await flushPromises()
		expect(w.find('[data-testid="cn-report-card-actions"]').exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})
})
