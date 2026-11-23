/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The "what now" title and its `after` line can name record fields, and can be
 * a list of candidates: board DqZaak reads "Wat nu? Stap 2: in behandeling",
 * the case's public status label in lower case. A candidate whose field is
 * empty gives way to the next.
 *
 * @spec openspec/changes/next-step-title-tokens/specs/next-step-title-tokens/spec.md#requirement-a-what-now-title-can-name-record-fields
 */
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnNextStepWidget from '../../src/components/CnNextStepCard/CnNextStepWidget.vue'
import { resolveNextStep } from '../../src/utils/detailActionModel.js'
import { fillTemplate } from '../../src/utils/fillTemplate.js'

jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: async () => null }
})

const STAGES = {
	'in-progress': {
		title: ['What now? Step 2: {statusPublicLabel|lower}', 'What now? Handle the case'],
		after: 'Then: on to step 3, the decision',
		checklist: [{ label: 'Choose a handler', doneField: 'assignee' }],
	},
}

describe('next-step title tokens', () => {
	it('lower-cases a value with |lower', () => {
		expect(fillTemplate('Step 2: {label|lower}', { label: 'In behandeling' })).toBe('Step 2: in behandeling')
	})

	it('passes a list of candidates through resolveNextStep', () => {
		const card = resolveNextStep({ stages: STAGES }, { status: 'in-progress' })
		expect(card.title).toEqual(STAGES['in-progress'].title)
		expect(card.after).toBe('Then: on to step 3, the decision')
	})

	it('drops a candidate list with no text', () => {
		expect(resolveNextStep({ stages: { a: { title: [], checklist: [{ label: 'x' }] } } }, { status: 'a' }).title).toBe('')
	})

	it('fills the title from the record in the widget, else the next candidate', () => {
		const filled = mount(CnNextStepWidget, { props: { content: { field: 'statusRole', stages: STAGES }, objectData: { statusRole: 'in-progress', statusPublicLabel: 'In behandeling' } } })
		expect(filled.find('.cn-next-step-card__title').text()).toBe('What now? Step 2: in behandeling')
		const fallback = mount(CnNextStepWidget, { props: { content: { field: 'statusRole', stages: STAGES }, objectData: { statusRole: 'in-progress' } } })
		expect(fallback.find('.cn-next-step-card__title').text()).toBe('What now? Handle the case')
	})

	it('fills the title on the detail page after translating it', async () => {
		const w = shallowMount(CnDetailPage, {
			props: {
				title: 'Case',
				register: 'dossiq',
				schema: 'case',
				objectId: 'case-1',
				objectStore: {
					objects: { 'dossiq-case': { 'case-1': { id: 'case-1', statusRole: 'in-progress', statusPublicLabel: 'In behandeling' } } },
					schemas: {},
					objectTypeRegistry: {},
					registerObjectType: jest.fn(),
					fetchObject: jest.fn(async () => null),
					fetchSchema: jest.fn(async () => null),
				},
				widgets: [{ id: 'facts', type: 'facts' }],
				layout: [{ id: '0', widgetId: 'facts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
				stageField: 'statusRole',
				nextStep: { stages: STAGES },
			},
			global: {
				provide: { cnTranslate: (text) => ({ 'What now? Step 2: {statusPublicLabel|lower}': 'Wat nu? Stap 2: {statusPublicLabel|lower}', 'Then: on to step 3, the decision': 'Daarna: naar stap 3, besluit' }[text] || text) },
				mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } },
			},
		})
		await flushPromises()
		expect(w.vm.nextStepCard.title).toBe('Wat nu? Stap 2: in behandeling')
		expect(w.vm.nextStepCard.after).toBe('Daarna: naar stap 3, besluit')
	})
})

describe('the manifest schema for next-step titles', () => {
	it('takes a title or after as a string or a list of strings', () => {
		const schema = require('../../src/schemas/app-manifest-v2.schema.json')
		const text = JSON.stringify(schema)
		expect(text).toContain('a list is candidates, the first whose fields all have a value is used')
	})
})
