/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `datesSource`: the date the record reached each stage, from an endpoint of
 * its own (screens-stage-dates-source). dossiq lists the steps from the case
 * type's statuses, and `/blueprint?case=<id>` says when this case reached them.
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

const TYPES = {
	statusTypes: [
		{ id: 'st-new', name: 'Received', order: 1 },
		{ id: 'st-work', name: 'In progress', order: 2 },
		{ id: 'st-done', name: 'Closed', order: 3, isFinal: true },
	],
}

const REACHED = {
	statuses: [
		{ statusType: 'st-new', reachedAt: '2026-10-03T09:00:00Z' },
		{ statusType: 'st-work', reachedAt: '2026-10-04T09:00:00Z' },
		{ statusType: 'st-done', reachedAt: null },
	],
}

const stagesEndpoint = { url: '/apps/dossiq/api/case-types/@object.caseType/statuses', path: 'statusTypes', labelField: 'name', orderField: 'order', finalField: 'isFinal' }

function mountWidget(extra = {}, look = 'board') {
	const context = ref({ objectId: 'case-1', object: { id: 'case-1', caseType: 'ct-1', status: 'st-work' }, register: 'dossiq', schema: 'case' })
	return mount(CnStagesWidget, {
		props: { content: { variant: 'bars', currentField: 'status', stagesEndpoint, ...extra } },
		global: { provide: { cnObjectContext: context, cnLook: look } },
	})
}

function dates(w) {
	return w.findAll('.cn-stages-widget__bar-step').map((step) => {
		const d = step.find('.cn-stages-widget__bar-date')
		return d.exists() ? d.text() : null
	})
}

beforeAll(() => {
	Element.prototype.scrollIntoView = jest.fn()
})

beforeEach(() => {
	invalidateEndpointSourceCache()
	axios.get.mockReset()
	axios.get.mockImplementation((url) => {
		if (url.includes('/statuses')) {
			return Promise.resolve({ data: TYPES })
		}
		if (url.includes('/blueprint')) {
			return Promise.resolve({ data: REACHED })
		}
		return Promise.reject(new Error('unexpected GET ' + url))
	})
})

const datesSource = { url: '/apps/dossiq/api/case-types/@object.caseType/blueprint?case=@objectId', path: 'statuses', idField: 'statusType', dateField: 'reachedAt' }

describe('CnStagesWidget datesSource', () => {
	it('reads the dates once for this record and merges them into the steps by id', async () => {
		const w = mountWidget({ datesSource })
		await flush()
		const urls = axios.get.mock.calls.map((call) => call[0])
		const blueprint = urls.filter((u) => u.includes('/blueprint'))
		expect(blueprint).toHaveLength(1)
		expect(blueprint[0]).toContain('/case-types/ct-1/blueprint')
		expect(blueprint[0]).toContain('case=case-1')
		expect(dates(w)).toEqual([formatBoardDate('2026-10-03T09:00:00Z'), `since ${formatBoardDate('2026-10-04T09:00:00Z')}`, null])
	})

	it('defaults to id and reachedAt, and takes a response that is the list itself', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/blueprint') ? [{ id: 'st-new', reachedAt: '2026-10-03T09:00:00Z' }] : TYPES }))
		const w = mountWidget({ datesSource: { url: '/apps/dossiq/api/case-types/@object.caseType/blueprint?case=@objectId' } })
		await flush()
		expect(dates(w)).toEqual([formatBoardDate('2026-10-03T09:00:00Z'), null, null])
	})

	it('falls back to the stage list\'s own dates when the read fails', async () => {
		axios.get.mockImplementation((url) => (url.includes('/blueprint')
			? Promise.reject(new Error('500'))
			: Promise.resolve({ data: { statusTypes: TYPES.statusTypes.map((t) => ({ ...t, at: t.id === 'st-new' ? 'earlier' : null })) } })))
		const w = mountWidget({ datesSource, stagesEndpoint: { ...stagesEndpoint, dateField: 'at' } })
		await flush()
		expect(dates(w)).toEqual(['earlier', null, null])
	})

	it('shows the dates as written without the board look', async () => {
		const w = mountWidget({ datesSource }, 'nextcloud')
		await flush()
		expect(dates(w)).toEqual(['2026-10-03T09:00:00Z', '2026-10-04T09:00:00Z', null])
	})

	it('asks nothing extra without datesSource', async () => {
		mountWidget()
		await flush()
		expect(axios.get.mock.calls.some((call) => call[0].includes('/blueprint'))).toBe(false)
	})
})
