/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget for a request's Termijn and Gekoppelde zaak cards (pipelinq
 * request-term-and-case-link): a title row drawn at a declared size, and an
 * action that asks for the update right on the page's record.
 *
 * @spec openspec/changes/facts-title-size-and-update-right/specs/facts-widget/spec.md#requirement-a-facts-title-row-can-take-a-size
 * @spec openspec/changes/facts-title-size-and-update-right/specs/facts-widget/spec.md#requirement-a-facts-action-can-ask-for-the-update-right
 */
var mockScope = jest.fn()

jest.mock('../../src/utils/objectPermissions.js', () => ({
	__esModule: true,
	...jest.requireActual('../../src/utils/objectPermissions.js'),
	fetchCallerScope: (...args) => mockScope(...args),
}))

import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const TICKET = { id: 't-1', slaDeadline: '2026-10-11T17:00:00+02:00', priority: 'normal', caseReference: '' }

/**
 * Mount the widget on the ticket.
 *
 * @param {object} content The card content.
 * @return {object} The wrapper.
 */
function mountFacts(content) {
	return mount(CnFactsWidget, {
		props: { content, objectData: TICKET, objectId: 't-1' },
		global: {
			provide: { cnObjectContext: { register: 'pipelinq', schema: 'ticket' } },
			stubs: {
				NcLoadingIcon: true,
				CnActionButtons: {
					name: 'CnActionButtons',
					props: ['actions'],
					template: '<div><button v-for="a in actions" :key="a.id">{{ a.label }}</button></div>',
				},
			},
		},
	})
}

const SET_TERM = { id: 'set-term', type: 'open-form', label: 'Set the term', requires: 'update' }
const LINK_CASE = { id: 'link-case', type: 'open-form', label: 'Link an existing case', requires: 'update' }

describe('CnFactsWidget: the Termijn card', () => {
	beforeEach(() => mockScope.mockReset())

	it('draws a title row at its declared size', async () => {
		mockScope.mockResolvedValue(null)
		const w = mountFacts({ fields: [{ as: 'title', path: 'priority', size: 26 }] })
		await flush()
		expect(w.find('[data-testid="cn-fact-priority"]').attributes('style')).toContain('font-size: 26px')
		w.unmount()
	})

	it('keeps a title row without a size at the card\'s own size', async () => {
		mockScope.mockResolvedValue(null)
		const w = mountFacts({ fields: [{ as: 'title', path: 'priority' }] })
		await flush()
		expect(w.find('[data-testid="cn-fact-priority"]').attributes('style')).toBeUndefined()
		w.unmount()
	})

	it('draws an action that asks for the update right to a user who may update the record', async () => {
		mockScope.mockResolvedValue({ actions: ['read', 'update'] })
		const w = mountFacts({ fields: [{ label: 'Priority', path: 'priority' }], actions: [SET_TERM] })
		await flush()
		expect(mockScope).toHaveBeenCalledWith({ register: 'pipelinq', schema: 'ticket' })
		expect(w.findComponent({ name: 'CnActionButtons' }).props('actions').map((a) => a.id)).toEqual(['set-term'])
		w.unmount()
	})

	it('leaves it out for a reader, also among the empty card\'s actions', async () => {
		mockScope.mockResolvedValue({ actions: ['read'] })
		const w = mountFacts({ fields: [{ label: 'Case', path: 'caseReference' }], hideEmpty: true, emptyText: 'No case linked yet.', emptyActions: [LINK_CASE], actions: [SET_TERM] })
		await flush()
		expect(w.findComponent({ name: 'CnActionButtons' }).exists()).toBe(false)
		expect(w.text()).toContain('No case linked yet.')
		expect(w.text()).not.toContain('Link an existing case')
		w.unmount()
	})

	it('draws it while the right cannot be read: the server decides', async () => {
		mockScope.mockResolvedValue(null)
		const w = mountFacts({ fields: [{ label: 'Case', path: 'caseReference' }], hideEmpty: true, emptyText: 'No case linked yet.', emptyActions: [LINK_CASE] })
		await flush()
		expect(w.text()).toContain('Link an existing case')
		w.unmount()
	})
})
