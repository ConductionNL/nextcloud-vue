/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record can pick its tabs and their order (detail-tabs-from): `tabsFrom`
 * names a field path, read like a `visibleWhen` field, whose list of tab ids
 * keeps those tabs of the page's `tabs` widget in that order (DqAanbesteding:
 * Inschrijvingen, Publicaties, Bestanden, Historie). A record that lists
 * nothing keeps the declared tabs.
 *
 * @spec openspec/changes/detail-tabs-from/specs/detail-page/spec.md#requirement-a-record-can-pick-its-tabs-and-their-order
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const CASE_TYPES = {
	'ct-plain': { id: 'ct-plain' },
	'ct-empty': { id: 'ct-empty', tabs: [] },
	'ct-tender': { id: 'ct-tender', tabs: ['submissions', 'publications', 'files', 'history', 'unknown'] },
}

const TABS = {
	id: 'case-tabs',
	type: 'tabs',
	content: {
		tabs: [
			{ id: 'overview', widgetId: 'facts', label: 'Overview' },
			'files',
			{ widgetId: 'submissions', label: 'Submissions' },
			{ id: 'publications', widgetId: 'pubs', label: 'Publications' },
			{ id: 'history', widgetId: 'audit', label: 'History' },
		],
	},
}

const WIDGETS = [
	TABS,
	{ id: 'facts', type: 'facts' },
	{ id: 'files', type: 'files' },
	{ id: 'submissions', type: 'record-list' },
	{ id: 'pubs', type: 'record-list' },
	{ id: 'audit', type: 'audit-trail' },
]

/**
 * A minimal object store.
 *
 * @param {object} object The record.
 * @return {object} The store.
 */
function makeStore(object) {
	return {
		objects: { 'dossiq-case': { 'case-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

/**
 * Mount a case page.
 *
 * @param {string} caseType The case type id.
 * @param {object} [extra] Extra props.
 * @return {import('@vue/test-utils').VueWrapper} The page.
 */
function mountPage(caseType, extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'case-1',
			objectStore: makeStore({ id: 'case-1', caseType }),
			widgets: WIDGETS,
			layout: [{ id: '0', widgetId: 'case-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 6 }],
			tabsFrom: '@context.caseType.tabs',
			visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
			...extra,
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

function tabIds(w) {
	return w.vm.bodyGridWidgets.find((widget) => widget.id === 'case-tabs').content.tabs
		.map((tab) => (typeof tab === 'string' ? tab : tab.id ?? tab.widgetId))
}

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

describe('CnDetailPage: a record picks its tabs and their order', () => {
	it('shows the listed tabs in the listed order, leaving the rest out', async () => {
		const w = mountPage('ct-tender')
		await flushPromises()
		expect(tabIds(w)).toEqual(['submissions', 'publications', 'files', 'history'])
	})

	it('keeps the declared tabs when the record lists none', async () => {
		for (const caseType of ['ct-plain', 'ct-empty']) {
			const w = mountPage(caseType)
			await flushPromises()
			expect(tabIds(w)).toEqual(['overview', 'files', 'submissions', 'publications', 'history'])
		}
	})

	it('changes nothing without tabsFrom, and never mutates the declared widget', async () => {
		const w = mountPage('ct-tender', { tabsFrom: '' })
		await flushPromises()
		expect(tabIds(w)).toEqual(['overview', 'files', 'submissions', 'publications', 'history'])
		const picked = mountPage('ct-tender')
		await flushPromises()
		expect(tabIds(picked)).toHaveLength(4)
		expect(TABS.content.tabs).toHaveLength(5)
	})
})
