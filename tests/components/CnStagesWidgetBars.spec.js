/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `variant: "bars"` draws the stages as the Zuiddrecht case page does: a
 * thin bar per step coloured by state, the label under it, a date line
 * when the source names one, no description. The default is the dot strip,
 * unchanged.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-stages-widget-draws-bars
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((path) => path) }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStagesWidget from '../../src/components/CnStagesWidget/CnStagesWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 12; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const BLUEPRINT = {
	statusTypes: [
		{ id: 'st-new', name: 'Received', description: 'The request came in', order: 1, reachedAt: '1 Oct' },
		{ id: 'st-work', name: 'In progress', description: 'Being handled', order: 2, reachedAt: '3 Oct' },
		{ id: 'st-done', name: 'Closed with a very long name that will not fit', description: 'Closed', order: 3, isFinal: true },
	],
}

function stagesEndpoint(extra = {}) {
	return {
		url: '/apps/dossiq/api/case-types/@object.caseType/blueprint',
		path: 'statusTypes',
		labelField: 'name',
		descriptionField: 'description',
		orderField: 'order',
		finalField: 'isFinal',
		...extra,
	}
}

function mountWidget(content) {
	const context = ref({ objectId: 'case-1', object: { id: 'case-1', caseType: 'ct-1', status: 'st-work' }, register: 'dossiq', schema: 'case' })
	return mount(CnStagesWidget, { props: { content }, global: { provide: { cnObjectContext: context } } })
}

beforeAll(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockImplementation((url) => (url.includes('blueprint') ? Promise.resolve({ data: BLUEPRINT }) : Promise.reject(new Error('unexpected GET ' + url))))
})

describe('CnStagesWidget — bars variant', () => {
	it('draws the dot strip with descriptions by default', async () => {
		const w = mountWidget({ currentField: 'status', stagesEndpoint: stagesEndpoint() })
		await flush()
		expect(w.find('[data-testid="cn-stages-widget-bars"]').exists()).toBe(false)
		expect(w.findAll('.cn-timeline-stages__stage')).toHaveLength(3)
		expect(w.text()).toContain('Being handled')
	})

	it('draws a bar per step with its state, no description, the current step named for a screen reader', async () => {
		const w = mountWidget({ variant: 'bars', currentField: 'status', stagesEndpoint: stagesEndpoint({ dateField: 'reachedAt' }) })
		await flush()
		const list = w.find('[data-testid="cn-stages-widget-bars"]')
		expect(list.exists()).toBe(true)
		expect(w.find('.cn-timeline-stages__stage').exists()).toBe(false)
		const steps = list.findAll('.cn-stages-widget__bar-step')
		expect(steps.map((s) => s.classes().find((c) => c.startsWith('cn-stages-widget__bar-step--')))).toEqual([
			'cn-stages-widget__bar-step--done',
			'cn-stages-widget__bar-step--current',
			'cn-stages-widget__bar-step--todo',
		])
		expect(steps[1].attributes('aria-current')).toBe('step')
		expect(steps[1].find('.cn-stages-widget__sr-only').text()).toBe('(current step)')
		expect(steps[0].find('.cn-stages-widget__sr-only').exists()).toBe(false)
		expect(w.text()).not.toContain('Being handled')
		expect(steps.map((s) => s.find('.cn-stages-widget__bar').exists())).toEqual([true, true, true])
		expect(steps[0].find('.cn-stages-widget__bar-date').text()).toBe('1 Oct')
		expect(steps[2].find('.cn-stages-widget__bar-date').exists()).toBe(false)
		const long = steps[2].find('.cn-stages-widget__bar-label')
		expect(long.attributes('title')).toBe('Closed with a very long name that will not fit')
	})

	it('offers the other steps as buttons when the strip is interactive, and the current one as text', async () => {
		const w = mountWidget({ variant: 'bars', currentField: 'status', transition: { kind: 'field' }, stagesEndpoint: stagesEndpoint() })
		await flush()
		const labels = w.findAll('.cn-stages-widget__bar-label')
		expect(labels.map((l) => l.element.tagName)).toEqual(['BUTTON', 'SPAN', 'BUTTON'])
		const spy = jest.spyOn(w.vm, 'onStageClick').mockImplementation(() => {})
		await labels[2].trigger('click')
		expect(spy).toHaveBeenCalledWith({ stage: expect.objectContaining({ id: 'st-done' }) })
	})
})
