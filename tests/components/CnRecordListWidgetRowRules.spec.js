/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget row actions that depend on the row: an action shows
 * only on the rows its `visibleWhen` holds for, and an `href` action links to
 * an address read from the row (an invitation answered in-app or on an
 * external form).
 *
 * @spec openspec/changes/record-list-row-rules/specs/record-list-row-rules/spec.md#requirement-a-row-action-can-depend-on-the-row
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const INVITATIONS = [
	{ id: 'i-1', title: 'Course evaluation', instrumentKind: 'internal' },
	{ id: 'i-2', title: 'Employer survey', instrumentKind: 'external', externalUrl: 'https://forms.example.org/s/42' },
	{ id: 'i-3', title: 'Broken link', instrumentKind: 'external', externalUrl: 'javascript:alert(1)' },
]

const CONTENT = {
	endpointSource: { url: '/apps/x/api/invitations/me', responsePath: 'results' },
	presentation: 'rows',
	title: '{title}',
	rowActions: [
		{ label: 'Fill in', type: 'open-modal', target: 'AnswerDialog', visibleWhen: { field: 'instrumentKind', value: 'internal' } },
		{ label: 'Open the form', href: '{externalUrl}', visibleWhen: { field: 'instrumentKind', value: 'external' } },
	],
}

const stubs = {
	NcActions: { props: ['ariaLabel'], template: '<div data-actions :aria-label="ariaLabel"><slot /></div>' },
	NcActionButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcActionLink: { props: ['href', 'target'], template: '<a :href="href" :target="target" v-bind="$attrs"><slot /></a>' },
}

function mountList(content = CONTENT, provide = {}) {
	return mount(CnRecordListWidget, {
		props: { content },
		global: { stubs, provide, mocks: { $router: { push: jest.fn() } } },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: INVITATIONS } })
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget row actions that depend on the row', () => {
	it('shows an action only on the rows its visibleWhen holds for', async () => {
		const w = mountList()
		await flush()
		const menus = w.findAll('[data-testid="cn-record-list-row-actions"]')
		expect(menus).toHaveLength(2)
		expect(menus[0].text()).toBe('Fill in')
		expect(menus[1].text()).toBe('Open the form')
	})

	it('runs the visible action with its own row', async () => {
		const dispatch = jest.fn()
		const w = mountList(CONTENT, { cnDispatchAction: dispatch })
		await flush()
		await w.findAll('[data-testid="cn-record-list-row-actions"]')[0].find('button').trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-modal', target: 'AnswerDialog', props: expect.objectContaining({ row: INVITATIONS[0] }) }))
	})

	it('links an href action to the address on the row, in a new tab', async () => {
		const w = mountList()
		await flush()
		const link = w.findAll('[data-testid="cn-record-list-row-actions"]')[1].find('a')
		expect(link.attributes('href')).toBe('https://forms.example.org/s/42')
		expect(link.attributes('target')).toBe('_blank')
	})

	it('draws no menu on a row whose only action has an address that is not a web link', async () => {
		const w = mountList()
		await flush()
		const rows = w.findAll('[data-testid="cn-record-list-item"]')
		expect(rows[2].find('[data-testid="cn-record-list-row-actions"]').exists()).toBe(false)
	})
})
