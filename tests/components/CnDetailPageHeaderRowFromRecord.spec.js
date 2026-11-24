/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record names its header row: `primaryActionFrom` picks the declared header
 * action drawn as the primary button, while that action's own `visibleWhen`
 * shows it, and `quickActionsFrom` reads a list of paths, the first that names
 * a declared action winning. The record's data never defines or widens an action.
 *
 * @spec openspec/changes/detail-header-row-from-record/specs/detail-page/spec.md#requirement-a-record-can-name-its-primary-action
 * @spec openspec/changes/detail-header-row-from-record/specs/detail-page/spec.md#requirement-quick-actions-can-be-read-from-more-than-one-path
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
	'ct-old': { id: 'ct-old', quickActions: ['plan-meeting'] },
	'ct-complaint': { id: 'ct-complaint', headerActions: ['schedule-hearing', 'message'], quickActions: ['plan-meeting'], primaryAction: 'record-finding' },
	'ct-undeclared': { id: 'ct-undeclared', headerActions: ['nobody-declares'], primaryAction: 'nobody-declares' },
}

const HEADER_ACTIONS = [
	{ id: 'message', type: 'open-modal', label: 'Message', target: 'MessageDialog' },
	{ id: 'document', type: 'open-modal', label: 'Document', target: 'DocumentDialog' },
	{ id: 'plan-meeting', type: 'open-modal', label: 'Plan a meeting', target: 'MeetingDialog' },
	{ id: 'schedule-hearing', type: 'open-modal', label: 'Schedule hearing', target: 'HearingDialog' },
	{ id: 'record-finding', type: 'open-modal', label: 'Record finding', target: 'FindingDialog' },
	{ id: 'take-on', type: 'open-modal', label: 'Take on', target: 'TakeOnDialog' },
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
				objects: { 'dossiq-case': { 'case-1': { id: 'case-1', caseType, status: 'new' } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			headerActions: HEADER_ACTIONS,
			quickActions: ['message', 'document'],
			quickActionsFrom: ['@context.caseType.headerActions', '@context.caseType.quickActions'],
			primaryActionFrom: '@context.caseType.primaryAction',
			primaryActionByStage: { new: 'take-on' },
			visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

/**
 * The menu entries CnActionButtons would emit: one per action its own
 * `visibleWhen` shows.
 *
 * @param {Array<string>} ids The visible action ids.
 * @return {Array<object>} The entries.
 */
const visible = (ids) => ids.map((id) => ({ id, label: HEADER_ACTIONS.find((a) => a.id === id).label, run: jest.fn() }))

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

describe('CnDetailPage: a record names its header row', () => {
	it('draws the action the case type names as the primary button', async () => {
		const w = mountPage('ct-complaint')
		await flushPromises()
		w.vm.menuHeaderActions = visible(HEADER_ACTIONS.map((a) => a.id))
		await flushPromises()
		expect(w.vm.stagePrimary.id).toBe('record-finding')
		expect(w.vm.effectivePrimaryLabel).toBe('Record finding')
	})

	it('keeps the stage primary when the named action is hidden by its own visibleWhen', async () => {
		const w = mountPage('ct-complaint')
		await flushPromises()
		w.vm.menuHeaderActions = visible(['message', 'document', 'take-on', 'schedule-hearing'])
		await flushPromises()
		expect(w.vm.stagePrimary.id).toBe('take-on')
	})

	it('ignores an id no header action declares', async () => {
		const w = mountPage('ct-undeclared')
		await flushPromises()
		w.vm.menuHeaderActions = visible(HEADER_ACTIONS.map((a) => a.id))
		await flushPromises()
		expect(w.vm.recordPrimary).toBeNull()
		expect(w.vm.stagePrimary.id).toBe('take-on')
		expect(pinned(w)).toEqual(['message', 'document'])
	})

	it('reads the first path that names a declared action', async () => {
		const w = mountPage('ct-complaint')
		await flushPromises()
		expect(pinned(w)).toEqual(['schedule-hearing', 'message'])
	})

	it('falls back to the next path, then to quickActions', async () => {
		const old = mountPage('ct-old')
		await flushPromises()
		expect(pinned(old)).toEqual(['plan-meeting'])
		const plain = mountPage('ct-plain')
		await flushPromises()
		expect(pinned(plain)).toEqual(['message', 'document'])
	})

	it('is accepted by the manifest schema', () => {
		const result = validateManifestV2({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{
				id: 'Case',
				route: '/cases/:id',
				type: 'detail',
				title: 'Case',
				config: {
					register: 'r',
					schema: 's',
					quickActionsFrom: ['@context.caseType.headerActions', '@context.caseType.quickActions'],
					primaryActionFrom: '@context.caseType.primaryAction',
				},
			}],
		})
		expect(result.errors).toEqual([])
	})
})
