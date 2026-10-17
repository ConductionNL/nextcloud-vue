/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget `format: "user"`: a user id reads as the display name
 * (board DqZaak, the handler on the Behandeling card).
 *
 * @spec openspec/changes/facts-user-format/specs/facts-widget/spec.md
 */
var mockUser = jest.fn()

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	__esModule: true,
	resolveNextcloudUser: (...args) => mockUser(...args),
	searchNextcloudUsers: jest.fn(),
	searchNextcloudGroups: jest.fn(),
}))

import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default
const { clearUserDisplayNames } = require('../../src/utils/userDisplayName.js')

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mountFacts(content, objectData) {
	return mount(CnFactsWidget, {
		propsData: { content, objectData },
		provide: { cnTranslate: (key) => key },
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFactsWidget user format', () => {
	beforeEach(() => {
		clearUserDisplayNames()
		mockUser.mockReset()
	})

	it('shows the display name once read, and reads each id once', async () => {
		mockUser.mockResolvedValue({ id: 'pieter', label: 'Pieter Jansen' })
		const w = mountFacts({ fields: [
			{ path: 'handler', label: 'Handler', format: 'user' },
			{ as: 'line', parts: [{ path: 'handler', format: 'user', label: 'by' }] },
		] }, { id: 'z-1', handler: 'pieter' })

		expect(w.find('[data-testid="cn-fact-handler"]').exists()).toBe(false)
		await flush()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-fact-handler"] .cn-facts-widget__value').text()).toBe('Pieter Jansen')
		expect(w.text()).toContain('by Pieter Jansen')
		expect(mockUser).toHaveBeenCalledTimes(1)
	})

	it('reads an unknown user as the id', async () => {
		mockUser.mockResolvedValue({ id: 'ghost', label: 'ghost' })
		const w = mountFacts({ fields: [{ path: 'handler', label: 'Handler', format: 'user' }] }, { id: 'z-2', handler: 'ghost' })
		await flush()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-fact-handler"] .cn-facts-widget__value').text()).toBe('ghost')
	})
})
