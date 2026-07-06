/**
 * Tests for the enriched CnWidgetObjectTable (list-widget-enrichment):
 * - declarative `source` self-fetch driving CnDataTable (register/schemaId/
 *   fetchParams/limit) with @-token resolution and ?-optional clause drop
 * - `@resolve:` register sentinel passed through unexpanded
 * - external rows always win (backward compatibility)
 * - compact-list pass-through props (hideHeader, borderless, emptyText,
 *   viewAllRoute/viewAllLabel, rowIcon, rowRoute → rowClickRoute)
 * - declarative actions[]: row-scoped patch/delete via CnRowActions,
 *   widget-scoped create footer affordance, confirm gating through
 *   CnConfirmDialog, RBAC-error surfacing without local mutation
 */

import { mount, shallowMount } from '@vue/test-utils'

jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(),
}))

const { useObjectStore } = require('../../../src/store/useObjectStore.js')
const CnWidgetObjectTable = require('../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue').default
const CnConfirmDialog = require('../../../src/dialogs/CnConfirmDialog.vue').default

const WrapperStub = { name: 'CnWidgetWrapper', template: '<div class="wrapper-stub"><slot /></div>' }

/**
 * Fake useObjectStore-shaped store.
 *
 * @param {object} [overrides] Method/state overrides.
 * @return {object} The fake store.
 */
function makeStore(overrides = {}) {
	return {
		objectTypeRegistry: {},
		errors: {},
		registerObjectType: jest.fn(function(slug, schemaId, registerId) {
			this.objectTypeRegistry[slug] = {
				schema: schemaId, register: registerId, registerSlug: null, schemaSlug: null,
			}
		}),
		saveObject: jest.fn().mockResolvedValue({ id: '1' }),
		deleteObject: jest.fn().mockResolvedValue(true),
		...overrides,
	}
}

beforeEach(() => {
	useObjectStore.mockReset()
	useObjectStore.mockReturnValue(makeStore())
	window.OC = { currentUser: 'alice' }
})

describe('CnWidgetObjectTable — declarative source self-fetch', () => {
	it('drives CnDataTable self-fetch with register/schemaId/fetchParams/limit from source', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { assignee: '@me' },
					order: { dueDate: 'asc' },
					limit: 5,
				},
				columns: ['title', 'dueDate'],
			},
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('register')).toBe('pipelinq')
		expect(table.props('schemaId')).toBe('case')
		expect(table.props('limit')).toBe(5)
		const params = table.props('fetchParams')
		// @me resolved before fetching
		expect(params.assignee).toBe('alice')
		expect(params['_order[dueDate]']).toBe('asc')
		// limit + 1 so the View-all footer can detect that more rows exist
		expect(params._limit).toBe(6)
	})

	it('drops a ?-optional clause whose @workspace token resolves to empty', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { assignee: '@me', status: '@workspace.openStatus?' },
				},
			},
		})
		const params = wrapper.findComponent({ name: 'CnDataTable' }).props('fetchParams')
		expect(params.assignee).toBe('alice')
		expect(params.status).toBeUndefined()
	})

	it('resolves a @workspace token from the provided workspace context', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { status: '@workspace.openStatus?' },
				},
			},
			provide: {
				cnWorkspaceContext: { value: { openStatus: 'open' } },
			},
		})
		const params = wrapper.findComponent({ name: 'CnDataTable' }).props('fetchParams')
		expect(params.status).toBe('open')
	})

	it('skips the fetch while a REQUIRED @workspace token is unresolved', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { client: '@workspace.selectedClient' },
				},
			},
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		// No register/schemaId → CnDataTable performs no self-fetch.
		expect(table.props('register')).toBeNull()
		expect(table.props('schemaId')).toBeNull()
	})

	it('passes an @resolve: register sentinel through unexpanded', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: { register: '@resolve:tenant_register', schema: 'case' },
			},
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('register')).toBe('@resolve:tenant_register')
	})

	it('serializes an IN-list array filter as the bare field with the array value', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { status: ['open', 'pending'], assignee: ['@me'] },
				},
			},
		})
		const params = wrapper.findComponent({ name: 'CnDataTable' }).props('fetchParams')
		// The array is kept as-is so axios serializes it as repeated
		// `status[]=open&status[]=pending` params — the buildQueryString /
		// useObjectStore shape OpenRegister parses as an IN filter.
		expect(params.status).toEqual(['open', 'pending'])
		expect(params.assignee).toEqual(['alice'])
	})

	it('flattens the { in: [...] } operator form onto the bare repeated field', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { status: { in: ['open', 'pending'] }, dueDate: { lt: '@today+7d' } },
				},
			},
		})
		const params = wrapper.findComponent({ name: 'CnDataTable' }).props('fetchParams')
		expect(params.status).toEqual(['open', 'pending'])
		expect(params['status[in]']).toBeUndefined()
		expect(params['dueDate[lt]']).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	})

	it('skips empty IN-list arrays entirely (no constraint)', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				source: {
					register: 'pipelinq',
					schema: 'case',
					filter: { status: [], client: { in: [] } },
				},
			},
		})
		const params = wrapper.findComponent({ name: 'CnDataTable' }).props('fetchParams')
		expect(params.status).toBeUndefined()
		expect(params.client).toBeUndefined()
	})

	it('external rows always win: no self-fetch wiring when rows are passed', () => {
		const rows = [{ id: '1', title: 'Row 1' }]
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				rows,
				columns: ['title'],
				source: { register: 'pipelinq', schema: 'case' },
			},
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('rows')).toEqual(rows)
		expect(table.props('register')).toBeNull()
		expect(table.props('schemaId')).toBeNull()
		expect(table.props('fetchParams')).toBeNull()
	})

	it('rows + columns without a source behave exactly as before (pure pass-through)', () => {
		const rows = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { rows, columns: ['name'], loading: false },
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('rows')).toEqual(rows)
		expect(table.props('columns')).toEqual(['name'])
		expect(table.props('register')).toBeNull()
	})
})

describe('CnWidgetObjectTable — compact-list pass-through props', () => {
	it('forwards hideHeader / borderless / emptyText / viewAllRoute / viewAllLabel / rowIcon', () => {
		const viewAllRoute = { name: 'cases' }
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				hideHeader: true,
				borderless: true,
				emptyText: 'No cases',
				viewAllRoute,
				viewAllLabel: 'All cases',
				rowIcon: 'FileDocumentOutline',
			},
		})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.props('hideHeader')).toBe(true)
		expect(table.props('borderless')).toBe(true)
		expect(table.props('emptyText')).toBe('No cases')
		expect(table.props('viewAllRoute')).toEqual(viewAllRoute)
		expect(table.props('viewAllLabel')).toBe('All cases')
		expect(table.props('rowIcon')).toBe('FileDocumentOutline')
	})

	it('leaves CnDataTable defaults intact when emptyText / viewAllLabel are unset', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {})
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		// CnDataTable's own translated defaults apply (not empty strings).
		expect(table.props('emptyText')).toBe('No items found')
		expect(table.props('viewAllLabel')).toBe('View all')
	})

	it('maps the rowRoute route name onto a rowClickRoute function with the row id', () => {
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { rowRoute: 'case-detail' },
		})
		const fn = wrapper.findComponent({ name: 'CnDataTable' }).props('rowClickRoute')
		expect(typeof fn).toBe('function')
		expect(fn({ id: '42' })).toEqual({ name: 'case-detail', params: { id: '42' } })
		expect(fn({ '@self': { id: 'uuid-7' } })).toEqual({ name: 'case-detail', params: { id: 'uuid-7' } })
		expect(fn({})).toBeNull()
	})

	it('forwards a host-supplied #footer scoped slot with { total, shown }', () => {
		const rows = [{ id: '1', t: 'a' }, { id: '2', t: 'b' }, { id: '3', t: 'c' }]
		const wrapper = mount(CnWidgetObjectTable, {
			propsData: { rows, columns: ['t'] },
			stubs: { CnWidgetWrapper: WrapperStub },
			scopedSlots: {
				footer: '<span class="host-footer">{{ props.shown }} of {{ props.total }}</span>',
			},
		})
		const footer = wrapper.find('.host-footer')
		expect(footer.exists()).toBe(true)
		expect(footer.text()).toBe('3 of 3')
	})
})

describe('CnWidgetObjectTable — declarative actions[]', () => {
	const source = { register: 'pipelinq', schema: 'case' }
	const rows = [{ id: '42', title: 'A case', status: 'open' }]

	/**
	 * Full-mount helper with the widget chrome stubbed out.
	 *
	 * @param {object} propsData Component props.
	 * @return {import('@vue/test-utils').Wrapper} The mounted wrapper.
	 */
	function mountWidget(propsData) {
		return mount(CnWidgetObjectTable, {
			propsData,
			stubs: { CnWidgetWrapper: WrapperStub },
		})
	}

	it('renders patch/delete object-op actions per row via CnRowActions (delete destructive)', () => {
		const wrapper = mountWidget({
			rows,
			columns: ['title'],
			source,
			actions: [
				{ id: 'accept', label: 'Accept', type: 'object-op', op: 'patch', values: { status: 'accepted' } },
				{ id: 'remove', label: 'Remove', type: 'object-op', op: 'delete' },
				{ id: 'add', label: 'Add case', type: 'object-op', op: 'create', values: { status: 'open' } },
			],
		})
		const rowActions = wrapper.findComponent({ name: 'CnRowActions' })
		expect(rowActions.exists()).toBe(true)
		const mapped = rowActions.props('actions')
		// create is NOT in the row menu
		expect(mapped.map((a) => a.label)).toEqual(['Accept', 'Remove'])
		expect(mapped[0].destructive).toBe(false)
		expect(mapped[1].destructive).toBe(true)
	})

	it('renders an object-op create action as a widget-scoped footer affordance', () => {
		const wrapper = mountWidget({
			rows,
			columns: ['title'],
			source,
			actions: [
				{ id: 'add', label: 'Add case', type: 'object-op', op: 'create', values: { status: 'open' } },
			],
		})
		const button = wrapper.find('[data-testid="cn-widget-create-add"]')
		expect(button.exists()).toBe(true)
		expect(button.text()).toContain('Add case')
		// And it never appears in a row actions menu.
		expect(wrapper.findComponent({ name: 'CnRowActions' }).exists()).toBe(false)
	})

	it('patch without confirm dispatches immediately via the object store (no dialog)', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const wrapper = mountWidget({
			rows,
			columns: ['title'],
			source,
			actions: [{ id: 'accept', label: 'Accept', type: 'object-op', op: 'patch', values: { status: 'accepted' } }],
		})
		await wrapper.vm.onActionTriggered(wrapper.vm.actions[0], rows[0])
		expect(store.saveObject).toHaveBeenCalledWith('pipelinq/case', {
			id: '42', title: 'A case', status: 'accepted',
		})
		expect(wrapper.findComponent(CnConfirmDialog).exists()).toBe(false)
	})

	it('patch with confirm: true is confirm-gated through CnConfirmDialog', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const action = { id: 'accept', label: 'Accept', type: 'object-op', op: 'patch', values: { status: 'accepted' }, confirm: true }
		const wrapper = mountWidget({ rows, columns: ['title'], source, actions: [action] })
		wrapper.vm.onActionTriggered(action, rows[0])
		await wrapper.vm.$nextTick()
		const dialog = wrapper.findComponent(CnConfirmDialog)
		expect(dialog.exists()).toBe(true)
		expect(store.saveObject).not.toHaveBeenCalled()
		// Confirming runs the dispatch and reports success into the dialog.
		await wrapper.vm.onConfirmConfirmed()
		expect(store.saveObject).toHaveBeenCalledWith('pipelinq/case', {
			id: '42', title: 'A case', status: 'accepted',
		})
		expect(dialog.vm.result).toEqual({ success: true })
	})

	it('delete ALWAYS confirms (variant error), regardless of confirm flag', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const action = { id: 'remove', label: 'Remove', type: 'object-op', op: 'delete', confirm: false }
		const wrapper = mountWidget({ rows, columns: ['title'], source, actions: [action] })
		wrapper.vm.onActionTriggered(action, rows[0])
		await wrapper.vm.$nextTick()
		const dialog = wrapper.findComponent(CnConfirmDialog)
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('variant')).toBe('error')
		expect(store.deleteObject).not.toHaveBeenCalled()
		await wrapper.vm.onConfirmConfirmed()
		expect(store.deleteObject).toHaveBeenCalledWith('pipelinq/case', '42')
	})

	it('a rejected (RBAC) write surfaces an error and mutates NO local state', async () => {
		const store = makeStore({ saveObject: jest.fn().mockResolvedValue(null) })
		useObjectStore.mockReturnValue(store)
		const action = { id: 'accept', label: 'Accept', type: 'object-op', op: 'patch', values: { status: 'accepted' } }
		const wrapper = mountWidget({ rows, columns: ['title'], source, actions: [action] })
		const before = JSON.parse(JSON.stringify(rows[0]))
		const outcome = await wrapper.vm.runAction(action, rows[0])
		expect(outcome.ok).toBe(false)
		// The passed row is untouched — no optimistic/local mutation.
		expect(rows[0]).toEqual(before)
		await wrapper.vm.$nextTick()
		const error = wrapper.find('[data-testid="cn-widget-object-table-error"]')
		expect(error.exists()).toBe(true)
		expect(error.text().length).toBeGreaterThan(0)
	})

	it('authorization-shaped fields on an action are never consulted', async () => {
		const store = makeStore()
		useObjectStore.mockReturnValue(store)
		const action = { id: 'accept', label: 'Accept', type: 'object-op', op: 'patch', values: { status: 'accepted' }, role: 'admin', allow: false }
		const wrapper = mountWidget({ rows, columns: ['title'], source, actions: [action] })
		const outcome = await wrapper.vm.runAction(action, rows[0])
		// Dispatches despite `allow: false` — the field has no client-side effect.
		expect(outcome.ok).toBe(true)
		expect(store.saveObject).toHaveBeenCalled()
	})

	it('reused non-mutating actions dispatch through the injected cnDispatchAction with the row appended', async () => {
		const cnDispatchAction = jest.fn()
		const action = { id: 'open', label: 'Open', handler: 'openCase', args: ['x'] }
		const wrapper = mount(CnWidgetObjectTable, {
			propsData: { rows, columns: ['title'], actions: [action] },
			stubs: { CnWidgetWrapper: WrapperStub },
			provide: { cnDispatchAction },
		})
		await wrapper.vm.runAction(action, rows[0])
		expect(cnDispatchAction).toHaveBeenCalledWith({
			id: 'open', label: 'Open', handler: 'openCase', args: ['x', rows[0]],
		})
	})
})
