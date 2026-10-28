/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column's secondary line can read the records a row points at
 * (`secondaryRefs`), and count what points at those records: board
 * PqNieuwsbrieven draws "Segment: verenigingen in Zuiddrecht · 412 contacten"
 * under a newsletter sent to a segment, and "Mailinglijst: Afvalnieuws ·
 * 2.180 abonnees" under one sent to a mailing list. `secondary` may list
 * templates; the first whose fields all hold a value is drawn.
 *
 * @spec openspec/changes/secondary-line-from-references/specs/data-table/spec.md
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const { mount } = require('@vue/test-utils')
const axios = jest.requireMock('@nextcloud/axios').default
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const { fillTemplate } = require('../../src/utils/fillTemplate.js')

const ROWS = [
	{ id: 'b1', name: 'Straatfeestseizoen: wat regel je', segmentId: 's1', listId: '' },
	{ id: 'b2', name: 'Afvalkalender 2027', segmentId: '', listId: 'l1' },
	{ id: 'b3', name: 'Ondernemersontbijt in oktober', segmentId: 's1' },
	{ id: 'b4', name: 'Zonder publiek' },
]

const COLUMN = {
	key: 'name',
	label: 'Nieuwsbrief',
	secondary: [
		'Segment: {segment.name|lowerfirst} · {segment.estimatedSize|number} contacten',
		'Mailinglijst: {list.name} · {list.subscribers|number} abonnees',
	],
	secondaryRefs: {
		segment: { field: 'segmentId', register: 'pipelinq', schema: 'segment' },
		list: {
			field: 'listId',
			register: 'pipelinq',
			schema: 'mailingList',
			counts: { subscribers: { register: 'pipelinq', schema: 'subscription', where: { listId: '@self.id', status: 'active' } } },
		},
	},
}

const ANSWERS = {
	'/index.php/apps/openregister/api/objects/pipelinq/segment/s1': { id: 's1', name: 'Verenigingen in Zuiddrecht', estimatedSize: 412 },
	'/index.php/apps/openregister/api/objects/pipelinq/mailingList/l1': { id: 'l1', name: 'Afvalnieuws' },
	'/index.php/apps/openregister/api/objects/pipelinq/subscription': { total: 2180, results: [] },
}

async function flush(wrapper) {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve))
		await wrapper.vm.$nextTick()
	}
}

function mountTable() {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns: [COLUMN], rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => (ANSWERS[url] ? Promise.resolve({ data: ANSWERS[url] }) : Promise.reject(new Error(`404 ${url}`))))
})

describe('CnDataTable secondary line from referenced records', () => {
	it('fills the first template whose fields all hold a value', async () => {
		const w = mountTable()
		await flush(w)
		const lines = w.findAll('[data-testid="cn-cell-secondary"]').map((s) => s.text())
		expect(lines[0]).toMatch(/^Segment: verenigingen in Zuiddrecht · 412 contacten$/)
		expect(lines[1]).toMatch(/^Mailinglijst: Afvalnieuws · 2[.,\u202f\u00a0]180 abonnees$/)
		expect(lines[2]).toMatch(/^Segment: verenigingen in Zuiddrecht/)
		expect(lines).toHaveLength(3)
	})

	it('fetches each referenced record once and counts per referenced record', async () => {
		const w = mountTable()
		await flush(w)
		const urls = axios.get.mock.calls.map((c) => c[0])
		expect(urls.filter((u) => u.endsWith('/segment/s1'))).toHaveLength(1)
		expect(urls.filter((u) => u.endsWith('/mailingList/l1'))).toHaveLength(1)
		const count = axios.get.mock.calls.find((c) => c[0].endsWith('/subscription'))
		expect(count[1]).toEqual({ params: { listId: 'l1', status: 'active', _limit: 0 } })
	})

	it('draws no line while a referenced record cannot be read', async () => {
		axios.get.mockImplementation(() => Promise.reject(new Error('down')))
		const w = mountTable()
		await flush(w)
		expect(w.findAll('[data-testid="cn-cell-secondary"]')).toHaveLength(0)
	})
})

describe('fillTemplate formats for the line', () => {
	it('lowers only the first letter with lowerfirst', () => {
		expect(fillTemplate('{name|lowerfirst}', { name: 'Verenigingen in Zuiddrecht' })).toBe('verenigingen in Zuiddrecht')
	})

	it('groups thousands with number, and keeps 0', () => {
		expect(fillTemplate('{n|number}', { n: 2180 })).toMatch(/^2[.,\u202f\u00a0]180$/)
		expect(fillTemplate('{n|number} abonnees', { n: 0 })).toBe('0 abonnees')
	})
})
