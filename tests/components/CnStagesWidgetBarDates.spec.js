/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bars' date line in the board look (screens-stage-bar-dates-parity):
 * DqZaak reads "Ontvangen 3 okt" and "In behandeling sinds 4 okt". A date
 * value takes the board's short form; the current step's says "since".
 * Without the board look the line shows as written, as before.
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((path) => path) }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStagesWidget from '../../src/components/CnStagesWidget/CnStagesWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'
import { formatBoardDate } from '../../src/utils/boardDate.js'

async function flush() {
	for (let i = 0; i < 12; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

const BLUEPRINT = {
	statusTypes: [
		{ id: 'st-new', name: 'Received', order: 1, reachedAt: '2026-10-03T09:00:00Z' },
		{ id: 'st-work', name: 'In progress', order: 2, reachedAt: '2026-10-04T09:00:00Z' },
		{ id: 'st-text', name: 'Decision', order: 3, reachedAt: 'expected soon' },
		{ id: 'st-done', name: 'Closed', order: 4, isFinal: true },
	],
}

const content = {
	variant: 'bars',
	currentField: 'status',
	stagesEndpoint: { url: '/apps/dossiq/api/case-types/@object.caseType/blueprint', path: 'statusTypes', labelField: 'name', orderField: 'order', finalField: 'isFinal', dateField: 'reachedAt' },
}

function mountWidget(look) {
	const context = ref({ objectId: 'case-1', object: { id: 'case-1', caseType: 'ct-1', status: 'st-work' }, register: 'dossiq', schema: 'case' })
	return mount(CnStagesWidget, { props: { content }, global: { provide: { cnObjectContext: context, cnLook: look } } })
}

function dates(w) {
	return w.findAll('.cn-stages-widget__bar-step').map((s) => {
		const d = s.find('.cn-stages-widget__bar-date')
		return d.exists() ? d.text() : null
	})
}

beforeAll(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockImplementation((url) => (url.includes('blueprint') ? Promise.resolve({ data: BLUEPRINT }) : Promise.reject(new Error('unexpected GET ' + url))))
})

describe('CnStagesWidget bars: the date line', () => {
	it('reads the board short date, "since" on the current step, under the board look', async () => {
		const w = mountWidget('board')
		await flush()
		const received = formatBoardDate('2026-10-03T09:00:00Z')
		const current = formatBoardDate('2026-10-04T09:00:00Z')
		expect(received).not.toBe('')
		expect(dates(w)).toEqual([received, `since ${current}`, 'expected soon', null])
	})

	it('shows the value as written without the board look', async () => {
		const w = mountWidget('nextcloud')
		await flush()
		expect(dates(w)).toEqual(['2026-10-03T09:00:00Z', '2026-10-04T09:00:00Z', 'expected soon', null])
	})
})
