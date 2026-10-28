/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list can end in one ruled row: a bold lead, a prompt read from the
 * same answer the rows come from while the list is empty, and the action at
 * the end (DqZaak Zaakplan: "Doelen nog geen doelen: wat wil de verzoeker dat
 * er verandert?" with "Doel toevoegen").
 *
 * @spec openspec/changes/record-list-footer-prompt/specs/record-list/spec.md#requirement-a-record-lists-footer-can-be-a-row-with-a-lead-and-a-prompt-from-the-answer
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

/** Let fetches settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const NL = { Goals: 'Doelen', 'Add goal': 'Doel toevoegen', 'no goals yet: what does the requester want to change?': 'nog geen doelen: wat wil de verzoeker dat er verandert?' }

const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/cases/@objectId/goals', responsePath: 'results' },
	presentation: 'rows',
	title: '{title}',
	emptyText: '',
	footerAction: { label: 'Add goal', icon: 'Plus', layout: 'row', note: { path: 'prompt', lead: 'Goals' }, type: 'handler', handler: 'x' },
}

const stubs = {
	CnIcon: true,
	NcLoadingIcon: true,
	NcButton: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
}

/**
 * Mount the list over an answer.
 *
 * @param {object} answer The endpoint's answer.
 * @return {import('@vue/test-utils').VueWrapper} The list.
 */
function mountList(answer) {
	mockGet.mockResolvedValue({ data: answer })
	const context = ref({ objectId: 'z-1', object: { id: 'z-1' }, register: 'dossiq', schema: 'case' })
	return mount(CnRecordListWidget, {
		props: { content: CONTENT, objectId: 'z-1', objectData: { id: 'z-1' } },
		global: { stubs, provide: { cnObjectContext: context, cnTranslate: (s) => NL[s] || s } },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget footer prompt', () => {
	it('draws one row: the lead, the prompt from the answer, the action', async () => {
		const w = mountList({ results: [], prompt: 'no goals yet: what does the requester want to change?' })
		await flush()
		const footer = w.find('[data-testid="cn-record-list-footer"]')
		expect(footer.classes()).toContain('cn-record-list__footer--row')
		expect(w.find('[data-testid="cn-record-list-footer-lead"]').text()).toBe('Doelen')
		expect(w.find('[data-testid="cn-record-list-footer-note"]').text()).toBe('Doelen nog geen doelen: wat wil de verzoeker dat er verandert?')
		expect(w.find('[data-testid="cn-record-list-footer-action"]').text()).toContain('Doel toevoegen')
		expect(mockGet).toHaveBeenCalledTimes(1)
	})

	it('keeps the lead but drops the prompt once the list has rows', async () => {
		const w = mountList({ results: [{ id: 'g-1', title: 'De verzoeker weet waarom' }], prompt: 'no goals yet: what does the requester want to change?' })
		await flush()
		expect(w.findAll('[data-testid="cn-record-list-item"]')).toHaveLength(1)
		expect(w.find('[data-testid="cn-record-list-footer-note"]').text()).toBe('Doelen')
	})
})
