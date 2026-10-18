/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record-list card that ends with one action which can say why it is
 * disabled (DqBezwaar Beroep: "Beroep registreren", "Kan zodra de beslissing
 * is verzonden").
 *
 * @spec openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-record-list-can-end-with-an-action-that-says-why-it-is-disabled
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

/** Let fetches and condition evaluation settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const ACTION = {
	label: 'Register appeal',
	icon: 'Gavel',
	type: 'handler',
	handler: 'lodgeAppeal',
	disabledWhen: { field: 'decisionSent', op: 'neq', value: true },
	disabledReason: 'Possible once the decision is sent',
}

/**
 * Mount the list on a record.
 *
 * @param {object} record The page's record.
 * @param {object} [extra] Extra content.
 * @param {object} [provide] Values to provide.
 * @return {import('@vue/test-utils').VueWrapper} The list.
 */
function mountList(record, extra = {}, provide = {}) {
	return mount(CnRecordListWidget, {
		props: {
			content: { register: 'dossiq', schema: 'beroep', filter: { case: '@objectId' }, emptyText: 'No appeal yet', footerAction: ACTION, ...extra },
			objectId: 'z-1',
			objectData: { id: 'z-1', ...record },
		},
		global: {
			provide,
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' }, NcLoadingIcon: true },
			mocks: { $router: { push: jest.fn() } },
		},
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
})

describe('CnRecordListWidget footerAction', () => {
	it('draws the action under the empty text, disabled with its reason while the condition holds', async () => {
		const w = mountList({ decisionSent: false })
		await flush()
		expect(w.find('[data-testid="cn-record-list-empty"]').text()).toBe('No appeal yet')
		const button = w.find('[data-testid="cn-record-list-footer-action"]')
		expect(button.text()).toContain('Register appeal')
		expect(button.attributes('disabled')).toBeDefined()
		const reason = w.find('[data-testid="cn-record-list-footer-reason"]')
		expect(reason.text()).toBe('Possible once the decision is sent')
		expect(button.attributes('aria-describedby')).toBe(reason.attributes('id'))
	})

	it('is enabled without a reason once the condition no longer holds, and dispatches', async () => {
		const dispatch = jest.fn()
		const w = mountList({ decisionSent: true }, {}, { cnDispatchAction: dispatch })
		await flush()
		const button = w.find('[data-testid="cn-record-list-footer-action"]')
		expect(button.attributes('disabled')).toBeUndefined()
		expect(w.find('[data-testid="cn-record-list-footer-reason"]').exists()).toBe(false)
		await button.trigger('click')
		expect(dispatch).toHaveBeenCalledWith({ label: 'Register appeal', icon: 'Gavel', type: 'handler', handler: 'lodgeAppeal' })
	})

	it('re-evaluates when the record changes', async () => {
		const w = mountList({ decisionSent: false })
		await flush()
		await w.setProps({ objectData: { id: 'z-1', decisionSent: true } })
		await flush()
		expect(w.find('[data-testid="cn-record-list-footer-action"]').attributes('disabled')).toBeUndefined()
	})

	it('reads the label and the reason through the host translate', async () => {
		const nl = { 'Register appeal': 'Beroep registreren', 'Possible once the decision is sent': 'Kan zodra de beslissing is verzonden' }
		const w = mountList({ decisionSent: false }, {}, { cnTranslate: (key) => nl[key] ?? key })
		await flush()
		expect(w.find('[data-testid="cn-record-list-footer-action"]').text()).toContain('Beroep registreren')
		expect(w.find('[data-testid="cn-record-list-footer-reason"]').text()).toBe('Kan zodra de beslissing is verzonden')
	})

	it('draws nothing without a footerAction', async () => {
		const w = mountList({}, { footerAction: undefined })
		await flush()
		expect(w.find('[data-testid="cn-record-list-footer"]').exists()).toBe(false)
	})
})
