/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The "what now" card's stages can come from the record (`nextStep.stagesFrom`,
 * read like a `visibleWhen` field): a case type keeps its own stage texts and
 * checklist, and the manifest's `stages` stay for a case type without them.
 *
 * @spec openspec/changes/detail-next-step-from-record/specs/detail-page/spec.md#requirement-the-next-step-stages-can-come-from-the-record
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const OWN = {
	in_behandeling: { title: 'Stap 2: in behandeling', checklist: [{ label: 'Beoordeel de documenten', doneField: 'documentsReviewed' }, { label: 'Stel het besluit op' }] },
}
const CASE_TYPES = {
	'ct-own': { id: 'ct-own', nextStep: OWN },
	'ct-wrapped': { id: 'ct-wrapped', nextStep: { stages: OWN } },
	'ct-none': { id: 'ct-none' },
}

const NEXT_STEP = {
	field: 'status',
	stagesFrom: '@context.caseType.nextStep',
	stages: { in_behandeling: { title: 'In progress', checklist: [{ label: 'Handle the case' }] } },
}

/**
 * Mount a case page.
 *
 * @param {string} caseType The case type id.
 * @param {object} [nextStep] The nextStep config.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The page.
 */
async function mountPage(caseType, nextStep = NEXT_STEP) {
	const w = shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'case-1',
			objectStore: {
				objects: { 'dossiq-case': { 'case-1': { id: 'case-1', caseType, status: 'in_behandeling', documentsReviewed: true } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			widgets: [{ id: 'facts', type: 'facts' }],
			layout: [{ id: '0', widgetId: 'facts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			nextStep,
			visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
		},
		global: { mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } } },
	})
	await flushPromises()
	return w
}

beforeEach(() => {
	mockFetchJson.mockReset()
	mockFetchJson.mockImplementation(async (url) => CASE_TYPES[url.split('/').pop()])
})

describe('CnDetailPage nextStep stages from the record', () => {
	it('takes the case type\'s own stages', async () => {
		const card = (await mountPage('ct-own')).vm.nextStepCard
		expect(card.title).toBe('Stap 2: in behandeling')
		expect(card.items.map((item) => [item.label, item.done])).toEqual([['Beoordeel de documenten', true], ['Stel het besluit op', false]])
	})

	it('reads a stages map wrapped in an object with stages', async () => {
		expect((await mountPage('ct-wrapped')).vm.nextStepCard.title).toBe('Stap 2: in behandeling')
	})

	it('keeps the declared stages when the record holds none', async () => {
		expect((await mountPage('ct-none')).vm.nextStepCard.title).toBe('In progress')
	})

	it('changes nothing without stagesFrom', async () => {
		const { stagesFrom, ...plain } = NEXT_STEP
		expect((await mountPage('ct-own', plain)).vm.nextStepCard.title).toBe('In progress')
	})
})
