/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One record list card drawing several sources as sections, and the row
 * options the grant rows of dossiq's Toegang card need (DqZaakBetrokkenen):
 * an origin line from `meta.cases`, a group icon in the avatar, rows hidden
 * by a condition and a refusal in the app's own words.
 *
 * @spec openspec/changes/record-list-sections-and-grant-rows/specs/record-list/spec.md
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

function answer(status, message) {
	const error = new Error(`Request failed with status code ${status}`)
	error.response = { status, data: message ? { message } : {} }
	return error
}

const LINKS = [{ id: 'l1', label: 'Jan Bakker' }]

const GRANTS = [
	{ id: 'rule:schema:group:woo-team', principal: { type: 'group', id: 'woo-team', displayName: 'Team Woo en informatie' }, origin: 'rule', matchedOn: ['caseType'], role: null, sharedBy: null },
	{ id: 'shared:ocinternal:41', principal: { type: 'group', id: 'juridische-zaken', displayName: 'Juridische zaken' }, origin: 'shared', matchedOn: [], sharedBy: { id: 'pjansen', displayName: 'Pieter Jansen' } },
	{ id: 'inherited:ocinternal:60', principal: { type: 'user', id: 'tvisser', displayName: 'Tom Visser' }, origin: 'inherited', matchedOn: [], sharedBy: { id: 'pjansen', displayName: 'Pieter Jansen' } },
	{ id: 'shared:ocinternal:42', principal: { type: 'user', id: 'kvries', displayName: 'Kees de Vries' }, origin: 'shared', matchedOn: [], sharedBy: { id: 'weg', displayName: null } },
	{ id: 'rule:schema:user:dossiq-background-service', principal: { type: 'user', id: 'dossiq-background-service', displayName: 'Dossiq' }, origin: 'rule', matchedOn: [], role: null },
]

const ORIGIN = {
	cases: [
		{ when: { all: [{ field: 'origin', op: 'eq', value: 'rule' }, { field: 'matchedOn', op: 'contains', value: 'caseType' }] }, text: 'via the case type' },
		{ when: { all: [{ field: 'origin', op: 'eq', value: 'rule' }, { field: 'role', op: 'notEmpty' }] }, text: 'via the role {role}' },
		{ when: { field: 'origin', op: 'eq', value: 'rule' }, text: 'via a rule on all cases' },
		{ when: { all: [{ field: 'origin', op: 'in', value: ['shared'] }, { field: 'sharedBy.displayName', op: 'empty' }] }, text: 'shared by a former user' },
		{ when: { field: 'origin', op: 'eq', value: 'shared' }, text: 'shared by {sharedBy.displayName}' },
		{ when: { field: 'origin', op: 'eq', value: 'inherited' }, text: 'via the main case, shared by {sharedBy.displayName}' },
	],
}

function card(extra = {}) {
	return {
		presentation: 'rows',
		ruleAbove: true,
		footnote: 'Whoever reads the BSN is recorded in the processing log.',
		sections: [
			{
				endpointSource: { url: '/apps/dossiq/api/access-links/case/c1', responsePath: 'results' },
				avatar: { text: '{label}', size: 32 },
				title: 'Link for {label}',
				emptyText: 'No links on this case yet',
				errorText: 'Only the people this case is assigned to can see its links',
			},
			{
				endpointSource: { url: '/apps/openregister/api/objects/dossiq/case/c1/grants', params: { principalTypes: 'user,group' }, responsePath: 'results' },
				avatar: { text: '{principal.displayName}', size: 32, icon: { field: 'principal.type', map: { group: 'AccountGroup' } } },
				title: ['{principal.displayName}', '{principal.id}'],
				meta: ORIGIN,
				hideWhen: { field: 'principal.id', op: 'in', value: ['dossiq-background-service'] },
				emptyText: 'Nobody else has access to this case',
				refusalText: 'Only the people this case is assigned to can see who has access',
				errorText: 'Could not read who has access',
			},
		],
		...extra,
	}
}

function respond(grants) {
	axios.get.mockImplementation((url) => {
		if (url.includes('/access-links/')) {
			return Promise.resolve({ data: { results: LINKS } })
		}
		return typeof grants === 'function' ? grants() : Promise.resolve({ data: { results: grants } })
	})
}

function section(w, index) {
	return w.find(`[data-testid="cn-record-list-section-${index}"]`)
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget sections', () => {
	it('draws each section from its own source, in order, with the card\'s look', async () => {
		respond(GRANTS)
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		expect(w.findAll('[data-testid^="cn-record-list-section-"]')).toHaveLength(2)
		expect(section(w, 0).findAll('.cn-record-list__title').map((n) => n.text())).toEqual(['Link for Jan Bakker'])
		expect(section(w, 1).findAll('.cn-record-list__title').map((n) => n.text())).toEqual(['Team Woo en informatie', 'Juridische zaken', 'Tom Visser', 'Kees de Vries'])
		expect(section(w, 1).classes()).toContain('cn-record-list--rule-above')
		expect(axios.get.mock.calls.some(([url, config]) => url.endsWith('/case/c1/grants') && config?.params?.principalTypes === 'user,group')).toBe(true)
	})

	it('puts the card\'s footnote under the last section only', async () => {
		respond(GRANTS)
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		expect(w.findAll('[data-testid="cn-record-list-footnote"]')).toHaveLength(1)
		expect(section(w, 1).find('[data-testid="cn-record-list-footnote"]').exists()).toBe(true)
	})

	it('writes the origin line from the first meta case that holds', async () => {
		respond(GRANTS)
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		expect(section(w, 1).findAll('.cn-record-list__meta').map((n) => n.text())).toEqual([
			'via the case type',
			'shared by Pieter Jansen',
			'via the main case, shared by Pieter Jansen',
			'shared by a former user',
		])
	})

	it('draws the group icon for a group and initials for a user, and hides the service account', async () => {
		respond(GRANTS)
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		const avatars = section(w, 1).findAll('[data-testid="cn-record-list-avatar"]')
		expect(avatars).toHaveLength(4)
		expect(avatars[0].find('[data-testid="cn-record-list-avatar-icon"]').exists()).toBe(true)
		expect(avatars[0].text()).toBe('')
		expect(avatars[2].text()).toBe('TV')
		expect(section(w, 1).text()).not.toContain('Dossiq')
	})

	it('shows a refused section in the app\'s words and leaves the other section standing', async () => {
		respond(() => Promise.reject(answer(403, 'Reading who has access to this object needs the right to read its grants')))
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		expect(section(w, 1).find('[data-testid="cn-record-list-error"]').text()).toBe('Only the people this case is assigned to can see who has access')
		expect(section(w, 0).findAll('.cn-record-list__title').map((n) => n.text())).toEqual(['Link for Jan Bakker'])
	})

	it('shows a failed section\'s error text, never an empty list', async () => {
		respond(() => Promise.reject(answer(500, 'boom')))
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		expect(section(w, 1).find('[data-testid="cn-record-list-error"]').text()).toBe('Could not read who has access')
		expect(section(w, 1).find('[data-testid="cn-record-list-empty"]').exists()).toBe(false)
	})

	it('shows a section\'s empty text when it answers no rows', async () => {
		respond([])
		const w = mount(CnRecordListWidget, { props: { content: card() } })
		await flush()

		expect(section(w, 1).find('[data-testid="cn-record-list-empty"]').text()).toBe('Nobody else has access to this case')
	})

	it('keeps the single-source shape, and a meta without a matching case falls back to its text', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'r1', name: 'A', state: 'odd' }] } })
		const w = mount(CnRecordListWidget, {
			props: { content: { endpointSource: { url: '/apps/x/api/rows', responsePath: 'results' }, title: '{name}', meta: { cases: [{ when: { field: 'state', op: 'eq', value: 'live' }, text: 'Live' }], text: 'Other: {state}' } } },
		})
		await flush()

		expect(w.find('[data-testid^="cn-record-list-section-"]').exists()).toBe(false)
		expect(w.find('.cn-record-list__meta').text()).toBe('Other: odd')
	})
})
