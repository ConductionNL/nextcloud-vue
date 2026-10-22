/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record can pick its quick actions (`quickActionsFrom`): a field path,
 * read like a `visibleWhen` field, whose list of declared header action ids
 * replaces `quickActions` for this record, so a case type names the three
 * actions its cases need most. Only declared actions are taken: the record's
 * data never defines an action of its own.
 *
 * @spec openspec/changes/detail-quick-actions-from/specs/detail-page/spec.md#requirement-a-record-can-pick-its-quick-actions
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const CASE_TYPES = {
	'ct-plain': { id: 'ct-plain' },
	'ct-youth': { id: 'ct-youth', quickActions: ['plan-meeting', 'message', 'not-declared', { id: 'evil', label: 'Run', type: 'api-call', url: '/x' }] },
}

const HEADER_ACTIONS = [
	{ id: 'message', type: 'open-modal', label: 'Message', target: 'MessageDialog' },
	{ id: 'document', type: 'open-modal', label: 'Document', target: 'DocumentDialog' },
	{ id: 'contact', type: 'open-modal', label: 'Contact', target: 'ContactDialog' },
	{ id: 'plan-meeting', type: 'open-modal', label: 'Plan a meeting', target: 'MeetingDialog' },
]

/**
 * @param {string} caseType The case type id on the record.
 * @return {object} The page.
 */
function mountPage(caseType) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'case-1',
			objectStore: {
				objects: { 'dossiq-case': { 'case-1': { id: 'case-1', caseType } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			headerActions: HEADER_ACTIONS,
			quickActions: ['message', 'document', 'contact'],
			quickActionsFrom: '@context.caseType.quickActions',
			visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

const pinned = (w) => w.vm.pinnedQuickActions.map((entry) => entry.id)

beforeEach(() => {
	mockFetchJson.mockReset()
	mockFetchJson.mockImplementation(async (url) => {
		const row = CASE_TYPES[url.split('/').pop()]
		if (!row) {
			throw new Error('404')
		}
		return row
	})
})

describe('CnDetailPage: a record picks its quick actions', () => {
	it('takes the declared actions the case type lists, in its order', async () => {
		const w = mountPage('ct-youth')
		await flushPromises()
		expect(pinned(w)).toEqual(['plan-meeting', 'message'])
	})

	it('never takes an action the record defines itself, nor an id nobody declared', async () => {
		const w = mountPage('ct-youth')
		await flushPromises()
		expect(pinned(w)).not.toContain('evil')
		expect(pinned(w)).not.toContain('not-declared')
	})

	it('keeps the declared quick actions for a case type that lists none', async () => {
		const w = mountPage('ct-plain')
		await flushPromises()
		expect(pinned(w)).toEqual(['message', 'document', 'contact'])
	})

	it('is accepted by the manifest schema', () => {
		const result = validateManifestV2({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'Case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', quickActionsFrom: '@context.caseType.quickActions' } }],
		})
		expect(result.errors).toEqual([])
	})
})
