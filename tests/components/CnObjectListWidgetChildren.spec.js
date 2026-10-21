/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list that shows each row's child records under it, as a course shows its
 * lessons under each module: the children of every row come from one query,
 * each row's children are a list of the same kind (reorder, row actions, add),
 * and a row action can address the row it is on.
 *
 * @spec openspec/changes/object-list-children/specs/object-list-widget/spec.md#requirement-a-list-can-show-each-rows-child-records-under-it
 * @spec openspec/changes/object-list-children/specs/object-list-widget/spec.md#requirement-a-list-value-in-a-filter-matches-any-of-its-values
 * @spec openspec/changes/object-list-children/specs/object-list-widget/spec.md#requirement-a-row-action-can-address-its-row
 */
import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import { h } from 'vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import { interpolateRowTokens, resolveRowFilter, rowTokenField } from '../../src/utils/rowTokens.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p = {}) => u.replace(/\{(\w+)\}/g, (_, k) => p[k]) }))

const MODULES = [
	{ id: 'm1', name: 'Plants', order: 1 },
	{ id: 'm2', name: 'Cells', order: 2 },
]
const LESSONS = [
	{ id: 'l1', courseId: 'm1', name: 'Leaves', order: 1 },
	{ id: 'l2', courseId: 'm1', name: 'Roots', order: 2 },
	{ id: 'l3', courseId: 'm2', name: 'Nucleus', order: 1 },
	{ id: 'lx', courseId: 'other', name: 'Stray', order: 1 },
]
const CHILDREN = {
	schema: 'lesson',
	filter: { courseId: '@row.id' },
	columns: [{ key: 'name', label: 'Lesson' }],
	reorder: { field: 'order' },
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('row tokens', () => {
	it('names the field of a whole-value token only', () => {
		expect(rowTokenField('@row.id')).toBe('id')
		expect(rowTokenField('@row.@self.owner')).toBe('@self.owner')
		expect(rowTokenField('x @row.id')).toBe('')
		expect(rowTokenField(3)).toBe('')
	})

	it('resolves a filter against a row, reading the id from @self too', () => {
		expect(resolveRowFilter({ courseId: '@row.id', lifecycle: 'draft' }, { '@self': { id: 'm9' } }))
			.toEqual({ courseId: 'm9', lifecycle: 'draft' })
	})

	it('fills a route with encoded row values', () => {
		expect(interpolateRowTokens('/lessons/@row.id/compose?c=@row.courseId', { id: 'a/b', courseId: 'm1' }))
			.toBe('/lessons/a%2Fb/compose?c=m1')
		expect(interpolateRowTokens('/lessons/@row.missing', {})).toBe('/lessons/')
	})
})

describe('CnObjectListWidget children', () => {
	const mountParent = (content = {}) => shallowMount(CnObjectListWidget, {
		propsData: {
			content: { register: 'learniq', schema: 'course', columns: [{ key: 'name', label: 'Module' }], reorder: { field: 'order' }, children: CHILDREN, ...content },
		},
		stubs: { CnDataTable: true },
	})

	beforeEach(() => {
		axios.get.mockReset()
		axios.patch.mockReset()
		axios.get.mockImplementation((url) => Promise.resolve({
			data: url.endsWith('/lesson')
				? { results: LESSONS.map((r) => ({ ...r })), total: LESSONS.length }
				: { results: MODULES.map((r) => ({ ...r })), total: MODULES.length },
		}))
		axios.patch.mockResolvedValue({ data: {} })
	})

	it('reads the children of every row in one query on the list of row ids', async () => {
		const w = mountParent()
		await flush()
		const childCalls = axios.get.mock.calls.filter(([url]) => url.endsWith('/lesson'))
		expect(childCalls).toHaveLength(1)
		expect(childCalls[0][0]).toBe('/apps/openregister/api/objects/learniq/lesson')
		expect(childCalls[0][1].params).toMatchObject({ courseId: ['m1', 'm2'], '_order[order]': 'asc', _page: 1 })
		expect(w.vm.childRowsFor(MODULES[0]).map((r) => r.id)).toEqual(['l1', 'l2'])
		expect(w.vm.childRowsFor(MODULES[1]).map((r) => r.id)).toEqual(['l3'])
		expect(Object.keys(w.vm.childRows)).not.toContain('other')
	})

	it('gives each row a child list scoped to that row, in the parent register', async () => {
		const w = mountParent()
		await flush()
		expect(w.vm.childContentFor(MODULES[1])).toMatchObject({ register: 'learniq', schema: 'lesson', filter: { courseId: 'm2' } })
	})

	it('reads no children without a link token', async () => {
		const w = mountParent({ children: { ...CHILDREN, filter: { courseId: 'fixed' } } })
		await flush()
		expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/lesson'))).toHaveLength(0)
		expect(w.vm.childLink).toBeNull()
	})

	it('reads children again when a nested list says its rows are stale', async () => {
		const w = mountParent()
		await flush()
		await w.vm.fetchChildren()
		expect(axios.get.mock.calls.filter(([url]) => url.endsWith('/lesson'))).toHaveLength(2)
	})
})

describe('CnObjectListWidget with preset rows', () => {
	const mountNested = (rows) => shallowMount(CnObjectListWidget, {
		propsData: {
			content: { register: 'learniq', schema: 'lesson', filter: { courseId: 'm1' }, columns: [{ key: 'name', label: 'Lesson' }], reorder: { field: 'order' } },
			presetRows: rows,
		},
		stubs: { CnDataTable: true },
	})

	beforeEach(() => {
		axios.get.mockReset()
		axios.patch.mockReset()
		axios.patch.mockResolvedValue({ data: {} })
	})

	it('shows the rows it is given and reads nothing itself', async () => {
		const w = mountNested(LESSONS.slice(0, 2))
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.vm.rows.map((r) => r.id)).toEqual(['l1', 'l2'])
		expect(w.vm.showPager).toBe(false)
	})

	it('asks its owner for new rows instead of reading', async () => {
		const w = mountNested(LESSONS.slice(0, 2))
		await w.vm.fetchRows()
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.emitted('rows-stale')).toHaveLength(1)
	})

	it('reorders its rows from place 1 and writes only the order', async () => {
		const w = mountNested(LESSONS.slice(0, 2).map((r) => ({ ...r })))
		await w.vm.moveRowBy(w.vm.rows[0], 1)
		expect(axios.patch.mock.calls).toEqual([
			['/apps/openregister/api/objects/learniq/lesson/l2', { order: 1 }],
			['/apps/openregister/api/objects/learniq/lesson/l1', { order: 2 }],
		])
		expect(w.vm.reorderStatus).toBe('Leaves moved to place 2 of 2')
	})

	it('starts a new child last and on its row', async () => {
		const w = mountNested(LESSONS.slice(0, 2))
		w.vm.createSchema = { properties: { name: {}, order: {}, courseId: {} } }
		expect(w.vm.createInitialData).toEqual({ courseId: 'm1', order: 3 })
		expect(w.vm.createLockedFields).toEqual(['courseId'])
	})

	it('takes new rows from its owner', async () => {
		const w = mountNested(LESSONS.slice(0, 2))
		await w.setProps({ presetRows: LESSONS.slice(0, 1) })
		expect(w.vm.rows.map((r) => r.id)).toEqual(['l1'])
	})
})

describe('CnObjectListWidget list filter values', () => {
	it('sends a list as field[] so any of its values matches', async () => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'learniq', schema: 'learning-plan', filter: { learnerId: ['a', 'b'], lifecycle: 'active' } } },
			stubs: { CnDataTable: true },
		})
		await flush()
		expect(axios.get.mock.calls[0][1].params).toMatchObject({ learnerId: ['a', 'b'], lifecycle: 'active' })
	})
})

describe('CnObjectListWidget row action on its row', () => {
	it('fills @row tokens in a navigate target before dispatching, and renders it as no static link', async () => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
		const dispatch = jest.fn()
		const action = { type: 'navigate', label: 'Compose', target: '/courses/m1/lessons/@row.id/compose' }
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'learniq', schema: 'lesson', rowActions: [action] } },
			global: { provide: { cnDispatchAction: dispatch } },
			stubs: { CnDataTable: true },
		})
		await flush()
		expect(w.vm.rowActionLink(action)).toEqual({})
		w.vm.runRowAction(action, { id: 'l2' })
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ target: '/courses/m1/lessons/l2/compose' }))
	})
})

describe('CnDataTable row detail', () => {
	it('renders a full-width row under each data row when the slot is given', () => {
		const w = mount(CnDataTable, {
			props: { columns: [{ key: 'name', label: 'Name' }], rows: MODULES, selectable: true },
			slots: { 'row-detail': ({ row }) => h('span', { class: 'detail' }, `${row.name} lessons`) },
		})
		const details = w.findAll('[data-testid="cn-row-detail"]')
		expect(details).toHaveLength(2)
		expect(details[1].text()).toBe('Cells lessons')
		expect(details[0].find('td').attributes('colspan')).toBe('2')
		expect(details[0].attributes('draggable')).toBeUndefined()
	})

	it('renders no detail row without the slot', () => {
		const w = mount(CnDataTable, { props: { columns: [{ key: 'name', label: 'Name' }], rows: MODULES } })
		expect(w.findAll('[data-testid="cn-row-detail"]')).toHaveLength(0)
	})
})
