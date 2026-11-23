/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqOfferte "Status": the quote's stages are a fixed list (Concept,
 * Verzonden, Geaccepteerd, Afgewezen, Verlopen), declared in the manifest
 * (`content.stages`) rather than read from an endpoint, and drawn as a list
 * of choices (`variant: "list"`) with "you are here" beside the current one
 * and a stage's hint ("after 30 days") beside the others.
 *
 * @spec openspec/changes/stages-declared-list/specs/stages-widget/spec.md#requirement-stages-can-be-declared-in-the-manifest
 * @spec openspec/changes/stages-declared-list/specs/stages-widget/spec.md#requirement-stages-can-be-drawn-as-a-list
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((path) => path) }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStagesWidget from '../../src/components/CnStagesWidget/CnStagesWidget.vue'

async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const STAGES = [
	{ id: 'draft', label: 'Draft' },
	{ id: 'sent', label: 'Sent' },
	{ id: 'accepted', label: 'Accepted' },
	{ id: 'rejected', label: 'Rejected' },
	{ id: 'expired', label: 'Expired', hint: 'after 30 days' },
]

function mountWidget(content) {
	const context = ref({ objectId: 'q-1', object: { id: 'q-1', status: 'draft' }, register: 'pipelinq', schema: 'salesQuote' })
	return mount(CnStagesWidget, {
		props: { content },
		global: { provide: { cnObjectContext: context, cnTranslate: (key) => `T(${key})` } },
	})
}

beforeAll(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { actions: [] } })
})

describe('CnStagesWidget declared stages', () => {
	it('draws the declared stages without reading a stage list', async () => {
		const w = mountWidget({ currentField: 'status', stages: STAGES })
		await flush()
		expect(w.findAll('.cn-timeline-stages__stage')).toHaveLength(5)
		expect(w.text()).toContain('T(Draft)')
		expect(axios.get.mock.calls.map(([url]) => url).filter((url) => !url.includes('available-actions'))).toEqual([])
	})
})

describe('CnStagesWidget list variant', () => {
	it('draws one row per stage and marks the current one', async () => {
		const w = mountWidget({ currentField: 'status', stages: STAGES, variant: 'list' })
		await flush()
		const list = w.find('[data-testid="cn-stages-widget-list"]')
		expect(list.exists()).toBe(true)
		const rows = list.findAll('li')
		expect(rows).toHaveLength(5)
		expect(rows[0].classes()).toContain('cn-stages-widget__list-step--current')
		expect(rows[0].attributes('aria-current')).toBe('step')
		expect(rows[0].text()).toContain('you are here')
		expect(rows[4].text()).toContain('T(after 30 days)')
		expect(rows[1].classes()).not.toContain('cn-stages-widget__list-step--current')
	})

	it('keeps the dot strip without the variant', async () => {
		const w = mountWidget({ currentField: 'status', stages: STAGES })
		await flush()
		expect(w.find('[data-testid="cn-stages-widget-list"]').exists()).toBe(false)
	})
})
