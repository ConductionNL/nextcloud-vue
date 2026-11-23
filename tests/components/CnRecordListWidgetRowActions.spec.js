/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list of rows another app keeps (contact moments on a case):
 * absent, empty and failed stay three answers, each row carries an actions
 * menu, a refusal shows the server's sentence, and a line names the other
 * records a row is also on. Ported from dossiq's CasePipelinqContactMoments
 * specs (pipelinqCaseSurfaces).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-list-can-act-on-its-rows-and-link-onwards
 */
var mockGet = jest.fn()
var mockRequest = jest.fn()
var mockInstalled = { value: true }

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: (...a) => mockRequest(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url, params = {}) => '/nc' + url.replace(/\{(\w+)\}/g, (_m, k) => params[k] ?? `{${k}}`) }))
jest.mock('../../src/utils/appInstalled.js', () => ({ __esModule: true, isAppInstalled: () => mockInstalled.value }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const MOMENTS = [
	{ id: 'm-1', summary: 'Called about the permit', channel: 'phone', alsoOnCases: ['c-2', 'c-3'] },
	{ id: 'm-2', subject: 'Mail received', channel: 'email', alsoOnCases: [] },
]

const CONTENT = {
	endpointSource: { url: '/apps/x/api/items/@objectId/crm/contact-moments', responsePath: 'moments' },
	requiresApp: 'crm',
	absentText: 'The CRM is not installed on this instance',
	emptyText: 'No contact moments yet',
	errorText: 'The customer record could not be read',
	intro: 'From the CRM: every contact moment on this item.',
	presentation: 'rows',
	title: ['{summary}', '{subject}'],
	limit: 50,
	badges: [{ field: 'alsoOnCases', kind: 'count', one: 'Also on {count} other item', other: 'Also on {count} other items' }],
	links: { field: 'alsoOnCases', label: 'Also on:', fallback: 'item', route: { name: 'ItemDetail', params: { id: '{value}' } }, labelSource: { register: 'x', schema: 'item', template: '{identifier}' } },
	rowActionsLabel: 'Actions for this contact moment',
	rowActions: [
		{ label: 'Also file on another item', type: 'open-modal', target: 'FileDialog', props: { itemId: '@objectId' } },
		{ label: 'Take off this item', endpoint: '/apps/x/api/items/@objectId/crm/contact-moments/{id}', method: 'DELETE', errorText: 'It could not be taken off.' },
	],
}

function serve(moments = MOMENTS) {
	mockGet.mockImplementation((url) => {
		if (url.includes('/contact-moments')) {
			return moments instanceof Error ? Promise.reject(moments) : Promise.resolve({ data: { moments } })
		}
		const match = url.match(/objects\/x\/item\/(c-\d)/)
		if (match) {
			return Promise.resolve({ data: { identifier: `2026-${match[1]}` } })
		}
		return Promise.reject(new Error('404'))
	})
}

const stubs = {
	NcActions: { props: ['ariaLabel'], template: '<div data-actions :aria-label="ariaLabel"><slot /></div>' },
	NcActionButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	CnStatusBadge: { props: ['label'], template: '<span class="badge">{{ label }}</span>' },
	RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
}

function mountList(content = CONTENT, provide = {}) {
	return mount(CnRecordListWidget, {
		props: { content, objectId: 'r-1', objectData: { id: 'r-1' } },
		global: { stubs, provide, mocks: { $router: { push: jest.fn() } } },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockRequest.mockReset()
	mockInstalled.value = true
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget — rows from another app', () => {
	it('says the app is absent, and asks nothing', async () => {
		mockInstalled.value = false
		serve()
		const w = mountList()
		await flush()
		expect(w.find('[data-testid="cn-record-list-absent"]').text()).toBe('The CRM is not installed on this instance')
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('tells empty and failed apart', async () => {
		serve([])
		const empty = mountList()
		await flush()
		expect(empty.find('[data-testid="cn-record-list-empty"]').text()).toBe('No contact moments yet')
		invalidateEndpointSourceCache()
		serve(new Error('500'))
		const failed = mountList()
		await flush()
		expect(failed.find('[data-testid="cn-record-list-error"]').text()).toBe('The customer record could not be read')
	})

	it('draws the intro, the first title that fills, and the count badge', async () => {
		serve()
		const w = mountList()
		await flush()
		expect(w.find('[data-testid="cn-record-list-intro"]').text()).toBe('From the CRM: every contact moment on this item.')
		expect(w.findAll('.cn-record-list__title').map((t) => t.text())).toEqual(['Called about the permit', 'Mail received'])
		expect(w.findAll('[data-testid="cn-record-list-badge-count"]').map((b) => b.text())).toEqual(['Also on 2 other items'])
	})

	it('names the other records a row is on, as links', async () => {
		serve()
		const w = mountList()
		await flush()
		const line = w.find('[data-testid="cn-record-list-links"]')
		expect(line.text()).toContain('Also on:')
		expect(line.text()).toContain('2026-c-2')
		expect(JSON.parse(line.findAll('a')[0].attributes('data-to'))).toEqual({ name: 'ItemDetail', params: { id: 'c-2' } })
	})

	it('names the actions menu, opens a modal with the row, and calls an endpoint for it', async () => {
		serve()
		const dispatch = jest.fn()
		const w = mountList(CONTENT, { cnDispatchAction: dispatch })
		await flush()
		const menu = w.findAll('[data-testid="cn-record-list-row-actions"]')[0]
		expect(menu.attributes('aria-label')).toBe('Actions for this contact moment')
		await menu.find('[data-testid="cn-record-list-row-action-0"]').trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-modal', target: 'FileDialog', props: expect.objectContaining({ itemId: 'r-1', row: MOMENTS[0] }) }))
		mockRequest.mockResolvedValue({ data: {} })
		await menu.find('[data-testid="cn-record-list-row-action-1"]').trigger('click')
		await flush()
		expect(mockRequest).toHaveBeenCalledWith({ method: 'delete', url: '/nc/apps/x/api/items/r-1/crm/contact-moments/m-1' })
	})

	it('shows the server refusal of an endpoint action', async () => {
		serve()
		const w = mountList()
		await flush()
		mockRequest.mockRejectedValue({ response: { data: { error: 'The CRM refused: the moment is locked.' } } })
		await w.findAll('[data-testid="cn-record-list-row-action-1"]')[0].trigger('click')
		await flush()
		const error = w.find('[data-testid="cn-record-list-action-error"]')
		expect(error.text()).toBe('The CRM refused: the moment is locked.')
		expect(error.attributes('role')).toBe('alert')
	})
})
