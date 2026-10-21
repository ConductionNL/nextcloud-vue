/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMatrixWidget — the `matrix` widget (abstract-matrix-widget).
 *
 * Guarded: rows from an object's array field labelled through a lookup,
 * columns from another object's array field, cells pivoted by row and column
 * key; a typed cell creates or patches the cell object, a locked cell is not
 * written, text that is not a number is refused; an endpoint write; field mode
 * re-reads and PATCHes one field; a norm row; a row transition; a bulk
 * transition per column with a confirm and a refusal report; registration.
 *
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()
var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		patch: (...args) => mockPatch(...args),
		post: (...args) => mockPost(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url, params = {}) => `/index.php${url.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? key)}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { LIBRARY_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnMatrixWidget/index.js'

const CnMatrixWidget = require('../../src/components/CnMatrixWidget/CnMatrixWidget.vue').default

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const BASE = '/index.php/apps/openregister/api/objects/school'

const plan = { id: 'plan-1', components: [{ componentId: 'c1', name: 'Test 1' }, { componentId: 'c2', name: 'Test 2' }] }
const profiles = [{ id: 'p1', ncUserId: 'anna', givenName: 'Anna', familyName: 'de Vries' }, { id: 'p2', ncUserId: 'bram', givenName: 'Bram', familyName: 'Smit' }]
function entries() {
	return [
		{ id: 'e1', learnerId: 'anna', componentId: 'c1', value: 7.5, lifecycle: 'concept' },
		{ id: 'e2', learnerId: 'anna', componentId: 'c2', value: 6, lifecycle: 'published' },
		{ id: 'e3', learnerId: 'bram', componentId: 'c1', value: 5, lifecycle: 'concept' },
	]
}

const GRADEBOOK = {
	rows: {
		from: 'learnerIds',
		header: 'Learner',
		lookup: { register: 'school', schema: 'learner-profile', match: 'ncUserId', label: '{givenName} {familyName}' },
	},
	columns: { source: { register: 'school', schema: 'curriculum-plan', id: '@object.planId', path: 'components' }, key: 'componentId', label: '{name}', type: 'number', markBelow: 5.5, markLabel: 'Fail' },
	cells: { register: 'school', schema: 'grade-entry', filter: { cohortId: '@objectId' }, rowKey: 'learnerId', columnKey: 'componentId', value: 'value' },
	write: { cells: { values: { cohortId: '@objectId', curriculumPlanId: '@object.planId' }, lockedWhen: { lifecycle: 'published' }, lockedText: 'This mark is published.' } },
	totals: { columns: true },
	bulkAction: { label: 'Publish', transition: 'publish', when: { lifecycle: 'concept' }, perColumn: true },
}

const cohort = { id: 'cohort-1', planId: 'plan-1', learnerIds: ['anna', 'bram'] }

/**
 * Answer the reads a gradebook makes.
 *
 * @param {Array<object>} cells The grade entries the server holds.
 * @return {void}
 */
function serveGradebook(cells) {
	mockGet.mockImplementation((url, config) => {
		if (url === `${BASE}/curriculum-plan/plan-1`) {
			return Promise.resolve({ data: plan })
		}
		if (url === `${BASE}/learner-profile`) {
			const wanted = config.params.ncUserId
			return Promise.resolve({ data: { results: profiles.filter((p) => wanted.includes(p.ncUserId)), total: 2 } })
		}
		if (url === `${BASE}/grade-entry`) {
			return Promise.resolve({ data: { results: cells, total: cells.length } })
		}
		return Promise.reject(new Error(`unexpected GET ${url}`))
	})
}

/**
 * Mount the widget.
 *
 * @param {object} content The widget content.
 * @param {object} [object] The page object.
 * @return {object} The wrapper.
 */
function mountWidget(content, object = cohort) {
	return mount(CnMatrixWidget, {
		props: { content, objectData: object, objectId: object.id, register: 'school', schema: 'cohort' },
	})
}

/**
 * Type into a cell through CnDataMatrix.
 *
 * @param {object} wrapper The widget wrapper.
 * @param {string} rowId The row id.
 * @param {string} colKey The column key.
 * @param {string} text The typed text.
 * @return {Promise<void>}
 */
async function type(wrapper, rowId, colKey, text) {
	await wrapper.find(`[data-row-id="${rowId}"][data-col-key="${colKey}"] .cn-data-matrix__cell-value`).trigger('keydown', { key: 'Enter' })
	const input = wrapper.find('.cn-data-matrix__cell-input')
	input.element.value = text
	await input.trigger('keydown.enter')
	await flush()
}

describe('CnMatrixWidget', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPost.mockReset()
	})

	it('registers `matrix` as a content-only library widget', () => {
		expect(getWidgetTypeEntry('matrix').renderer).toBe(CnMatrixWidget)
		expect(isContentOnlyWidgetDef({ type: 'matrix' })).toBe(true)
		expect(LIBRARY_WIDGET_KEYS).toContain('matrix')
	})

	it('pivots the cells into labelled rows and columns', async () => {
		serveGradebook(entries())
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		const headers = wrapper.findAll('thead th').map((th) => th.text())
		expect(headers).toEqual(['Learner', 'Test 1', 'Test 2'])
		const rowHeaders = wrapper.findAll('tbody .cn-data-matrix__row-header').map((th) => th.text())
		expect(rowHeaders).toEqual(['Anna de Vries', 'Bram Smit'])
		expect(wrapper.find('[data-row-id="anna"][data-col-key="c1"]').text()).toContain('7.5')
		expect(wrapper.find('[data-row-id="bram"][data-col-key="c2"]').text()).toBe('')
		expect(wrapper.find('[data-row-id="bram"][data-col-key="c1"]').text()).toContain('Fail')
		const gradeRead = mockGet.mock.calls.find(([url]) => url === `${BASE}/grade-entry`)
		expect(gradeRead[1].params).toMatchObject({ cohortId: 'cohort-1', _page: 1 })
	})

	it('creates a cell object for an empty cell, with the row, the column and the values', async () => {
		serveGradebook(entries())
		mockPost.mockResolvedValue({ data: { id: 'e9' } })
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		await type(wrapper, 'bram', 'c2', '6,5')
		expect(mockPost).toHaveBeenCalledWith(`${BASE}/grade-entry`, {
			cohortId: 'cohort-1',
			curriculumPlanId: 'plan-1',
			learnerId: 'bram',
			componentId: 'c2',
			value: 6.5,
		})
		expect(wrapper.find('[data-row-id="bram"][data-col-key="c2"]').text()).toContain('6.5')
	})

	it('patches an existing cell object', async () => {
		serveGradebook(entries())
		mockPatch.mockResolvedValue({ data: { id: 'e1', value: 8 } })
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		await type(wrapper, 'anna', 'c1', '8')
		expect(mockPatch).toHaveBeenCalledWith(`${BASE}/grade-entry/e1`, { value: 8 })
	})

	it('does not write a locked cell, and says why', async () => {
		serveGradebook(entries())
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		await type(wrapper, 'anna', 'c2', '9')
		expect(mockPatch).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain('This mark is published.')
	})

	it('refuses text that is not a number', async () => {
		serveGradebook(entries())
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		await type(wrapper, 'bram', 'c2', 'abc')
		expect(mockPost).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain('Type a number in Test 2.')
	})

	it('shows the server refusal and keeps the stored value', async () => {
		serveGradebook(entries())
		mockPatch.mockRejectedValue({ response: { data: { error: 'Marking is closed' } } })
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		await type(wrapper, 'anna', 'c1', '9')
		expect(wrapper.text()).toContain('Marking is closed')
		expect(wrapper.find('[data-row-id="anna"][data-col-key="c1"]').text()).toContain('7.5')
	})

	it('sends a cell to an endpoint when write.endpoint is set', async () => {
		serveGradebook(entries())
		mockPost.mockResolvedValue({ data: { id: 'e1', learnerId: 'anna', componentId: 'c1', value: 4 } })
		const wrapper = mountWidget({ ...GRADEBOOK, write: { endpoint: { url: '/apps/school/api/attempts/{row}/score', body: { assessmentId: '@objectId' } } } })
		await flush()
		await type(wrapper, 'anna', 'c1', '4')
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/school/api/attempts/anna/score', { assessmentId: 'cohort-1', row: 'anna', column: 'c1', value: 4 })
		expect(wrapper.find('[data-row-id="anna"][data-col-key="c1"]').text()).toContain('4')
	})

	it('publishes one column after a confirm and reports each refusal', async () => {
		serveGradebook(entries())
		mockPost.mockImplementation((url) => (url.includes('/e3/')
			? Promise.reject({ response: { data: { error: 'A fraud case is open' } } })
			: Promise.resolve({ data: {} })))
		const wrapper = mountWidget(GRADEBOOK)
		await flush()
		wrapper.vm.bulkColumn = { id: 'c1', label: 'Test 1' }
		await flush()
		expect(wrapper.vm.bulkTargetList.map((e) => e.id)).toEqual(['e1', 'e3'])
		const start = wrapper.findAll('.cn-matrix-widget__bulk .NcButton').find((b) => b.text().startsWith('Publish'))
		await start.trigger('click')
		expect(wrapper.text()).toContain('Publish: 2 records. Continue?')
		const confirm = wrapper.findAll('.cn-matrix-widget__confirm .NcButton')[0]
		await confirm.trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/e1/transition', { action: 'publish' })
		expect(mockPost).toHaveBeenCalledTimes(2)
		const report = wrapper.find('.cn-matrix-widget__report').text()
		expect(report).toContain('1 record done.')
		expect(report).toContain('Bram Smit, Test 1: A fraud case is open')
	})

	it('runs a row transition on a row object', async () => {
		const cards = [{ id: 'card-1', learner: 'Anna', lifecycle: 'draft' }, { id: 'card-2', learner: 'Bram', lifecycle: 'finalised' }]
		mockGet.mockImplementation((url) => (url === `${BASE}/report-card`
			? Promise.resolve({ data: { results: cards, total: 2 } })
			: Promise.resolve({ data: { results: [], total: 0 } })))
		mockPost.mockResolvedValue({ data: {} })
		const wrapper = mountWidget({
			rows: { source: { register: 'school', schema: 'report-card' }, label: '{learner}' },
			columns: { list: [{ key: 'mentorComment', label: 'Comment', type: 'text' }] },
			rowActions: [{ id: 'finalise', label: 'Finalise', transition: 'finalise', when: { lifecycle: 'draft' } }],
		})
		await flush()
		const buttons = wrapper.findAll('.cn-data-matrix__actions-cell .NcButton')
		expect(buttons).toHaveLength(1)
		expect(buttons[0].attributes('aria-label')).toBe('Finalise: Anna')
		await buttons[0].trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/card-1/transition', { action: 'finalise' })
	})

	it('edits an array field of the page object with one PATCH after re-reading it', async () => {
		const stored = { id: 'hp-1', activities: [{ activityId: 'a1', name: 'Reading', w1: 2 }, { activityId: 'a2', name: 'Maths', w1: 4, w2: 1 }] }
		mockGet.mockResolvedValue({ data: stored })
		mockPatch.mockImplementation((url, body) => Promise.resolve({ data: { ...stored, ...body } }))
		const page = { id: 'hp-1', activities: [{ activityId: 'a1', name: 'Reading', w1: 2 }], norms: [{ week: 'w1', hours: 5 }] }
		const wrapper = mount(CnMatrixWidget, {
			props: {
				content: {
					field: { name: 'activities', rowKey: 'activityId', label: '{name}', header: 'Activity' },
					columns: { list: [{ key: 'w1', label: 'Week 1' }, { key: 'w2', label: 'Week 2' }] },
					totals: { columns: true },
					norms: { label: 'Norm', from: 'norms', key: 'week', value: 'hours' },
				},
				objectData: page,
				objectId: 'hp-1',
				register: 'school',
				schema: 'hour-plan',
			},
		})
		await flush()
		expect(wrapper.find('.cn-data-matrix__norm-row').text()).toContain('5')
		await type(wrapper, 'a1', 'w2', '3')
		expect(mockGet).toHaveBeenCalledWith(`${BASE}/hour-plan/hp-1`)
		expect(mockPatch).toHaveBeenCalledWith(`${BASE}/hour-plan/hp-1`, {
			activities: [{ activityId: 'a1', name: 'Reading', w1: 2, w2: 3 }, { activityId: 'a2', name: 'Maths', w1: 4, w2: 1 }],
		})
		const totals = wrapper.findAll('.cn-data-matrix__totals-row .cn-data-matrix__total-cell')
		expect(totals[0].classes()).toContain('cn-data-matrix__total-cell--over')
	})

	it('says the grid is incomplete past maxRows instead of showing it as whole', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }], total: 3 } })
		const wrapper = mountWidget({ rows: { source: { register: 'school', schema: 'thing' } }, columns: { list: [{ key: 'a', label: 'A' }] }, maxRows: 2 })
		await flush()
		expect(wrapper.text()).toContain('Only the first 2 records are shown.')
	})
})
