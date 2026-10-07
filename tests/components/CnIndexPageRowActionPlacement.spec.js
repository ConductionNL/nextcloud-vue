/**
 * Tests for placing CnIndexPage's built-in row actions among app actions with "builtin:<id>" placeholders (row-action-builtin-placement).
 * They also cover the right-click menu staying the same menu as the row actions menu.
 */

const { mount, shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const CnRowActions = require('../../src/components/CnRowActions/CnRowActions.vue').default

const schema = { title: 'Publication', properties: { title: { type: 'string' } } }
const objects = [{ id: 'p1', title: 'One' }, { id: 'p2', title: 'Two' }]

const PUBLICATIONS_ACTIONS = [
	'builtin:edit',
	'builtin:copy',
	{ id: 'file-list', label: 'File list', icon: 'FormatListBulleted', handler: 'openPublicationFiles' },
	'builtin:delete',
]

/**
 * @param {object} propsData Extra props.
 * @return {object} The mounted page.
 */
function mountPage(propsData = {}) {
	return shallowMount(CnIndexPage, { propsData: { title: 'Publications', objects, schema, ...propsData } })
}

/**
 * Render a row's menu the way the page does and read it back.
 *
 * @param {Array<object>} actions The row's actions.
 * @return {{labels: string[], keys: string[], testids: string[]}} The rendered menu.
 */
function renderMenu(actions) {
	const menu = mount(CnRowActions, { propsData: { actions, row: objects[0] } })
	return {
		labels: menu.vm.renderedActions.map(({ action }) => action.label),
		keys: menu.vm.renderedActions.map(({ action }) => menu.vm.actionKey(action)),
		testids: menu.findAll('[data-testid^="cn-action-item-"]').map((w) => w.attributes('data-testid')),
	}
}

/**
 * The CnIndexPage messages among console.warn calls.
 *
 * @param {object} spy The console.warn spy.
 * @return {string[]} The messages.
 */
function ownWarnings(spy) {
	return spy.mock.calls.map((c) => String(c[0])).filter((m) => m.startsWith('[CnIndexPage]'))
}

describe('CnIndexPage — placing built-in row actions', () => {
	let warn

	beforeEach(() => {
		warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
	})

	it('renders the OpenCatalogi Publications menu as Edit, Copy, File list, Delete', () => {
		const wrapper = mountPage({ actions: PUBLICATIONS_ACTIONS, showViewAction: false })
		expect(renderMenu(wrapper.vm.rowActionsFor(objects[0])).labels).toEqual(['Edit', 'Copy', 'File list', 'Delete'])
		expect(ownWarnings(warn)).toEqual([])
	})

	it('appends the enabled built-ins the array does not place', () => {
		const wrapper = mountPage({ actions: ['builtin:edit', { id: 'archive', label: 'Archive' }] })
		expect(wrapper.vm.mergedActions.map((a) => a.label)).toEqual(['Edit', 'Archive', 'View', 'Copy', 'Delete'])
	})

	it('renders nothing for a placeholder whose toggle is off, without a runtime warning', () => {
		// A toggle turned off at runtime (permissions, readOnly) is legitimate; the validator flags a static one.
		const wrapper = mountPage({ actions: ['builtin:edit', 'builtin:copy'], showCopyAction: false })
		expect(wrapper.vm.mergedActions.map((a) => a.label)).toEqual(['Edit', 'View', 'Delete'])
		expect(ownWarnings(warn)).toEqual([])
	})

	it('names the page in its development warnings', () => {
		mountPage({ actions: ['builtin:delete', 'builtin:edit'] })
		expect(ownWarnings(warn)[0]).toContain('"Publications"')
	})

	it('honours Delete placed first, and warns in development', () => {
		const wrapper = mountPage({ actions: ['builtin:delete', 'builtin:edit'] })
		expect(wrapper.vm.mergedActions.map((a) => a.label)).toEqual(['Delete', 'Edit', 'View', 'Copy'])
		expect(ownWarnings(warn).some((m) => m.includes('builtin:delete'))).toBe(true)
	})

	it('runs the first resolved action as the keyboard primary action', async () => {
		const wrapper = mountPage({ actions: ['builtin:edit', { id: 'file-list', label: 'File list' }] })
		await wrapper.setData({ focusedRowIndex: 0 })
		wrapper.vm.runPrimaryRowAction()
		expect(wrapper.vm.showFormDialogVisible).toBe(true)
		expect(wrapper.vm.editItem).toEqual(objects[0])
		expect(wrapper.emitted('action')).toEqual([[{ action: 'Edit', row: objects[0], id: 'edit', builtin: true }]])
	})

	it('skips a hidden or disabled first action for the keyboard primary action', async () => {
		const hidden = jest.fn()
		const greyed = jest.fn()
		const gated = jest.fn()
		const files = jest.fn()
		const wrapper = mountPage({
			showViewAction: false,
			actions: [
				{ id: 'hidden', label: 'Hidden', handler: hidden, visible: false },
				{ id: 'greyed', label: 'Greyed', handler: greyed, disabled: (row) => row.id === 'p1' },
				{ id: 'gated', label: 'Gated', handler: gated, visibleWhen: { field: 'title', op: 'eq', value: 'Other' } },
				{ id: 'file-list', label: 'File list', handler: files },
			],
		})
		await wrapper.setData({ focusedRowIndex: 0 })
		expect(wrapper.vm.primaryRowActionFor(objects[0]).id).toBe('file-list')
		wrapper.vm.runPrimaryRowAction()
		expect(files).toHaveBeenCalledWith(objects[0])
		expect([hidden, greyed, gated].every((fn) => fn.mock.calls.length === 0)).toBe(true)
	})

	it('offers no keyboard primary action when the menu enables nothing', async () => {
		const wrapper = mountPage({
			showViewAction: false,
			showEditAction: false,
			showCopyAction: false,
			showDeleteAction: false,
			listShortcuts: true,
			actions: [{ id: 'hidden', label: 'Hidden', handler: jest.fn(), visible: false }],
		})
		await wrapper.setData({ focusedRowIndex: 0 })
		expect(wrapper.vm.primaryRowActionFor(objects[0])).toBeNull()
		expect(wrapper.vm.listShortcutHandlers['row-primary']).toBeUndefined()
	})
})

describe('CnIndexPage — existing fleet patterns render unchanged', () => {
	it('a page with its own View and the built-in View off', () => {
		const wrapper = mountPage({
			showViewAction: false,
			actions: [{ id: 'view', label: 'View', icon: 'Eye', handler: 'navigate', route: 'item-detail' }],
		})
		const menu = renderMenu(wrapper.vm.rowActionsFor(objects[0]))
		expect(menu.labels).toEqual(['View', 'Edit', 'Copy', 'Delete'])
		expect(menu.keys).toEqual(['View', 'builtin:edit', 'builtin:copy', 'builtin:delete'])
		expect(menu.testids).toEqual(['cn-action-item-view', 'cn-action-item-edit', 'cn-action-item-copy', 'cn-action-item-delete'])
	})

	it('openconnector: an app action with id "edit" beside the built-in Edit', () => {
		const wrapper = mountPage({ actions: [{ id: 'edit', label: 'Open editor', icon: 'Pencil', handler: 'openEditor' }] })
		const menu = renderMenu(wrapper.vm.rowActionsFor(objects[0]))
		expect(menu.labels).toEqual(['Open editor', 'View', 'Edit', 'Copy', 'Delete'])
		expect(new Set(menu.keys).size).toBe(menu.keys.length)
		expect(menu.testids).toEqual(['cn-action-item-open-editor', 'cn-action-item-view', 'cn-action-item-edit', 'cn-action-item-copy', 'cn-action-item-delete'])
	})

	it('portaliq: Edit and Copy off, with its own Change', () => {
		const wrapper = mountPage({
			showEditAction: false,
			showCopyAction: false,
			actions: [{ id: 'change', label: 'Change', handler: 'openChange' }],
		})
		const menu = renderMenu(wrapper.vm.rowActionsFor(objects[0]))
		expect(menu.labels).toEqual(['Change', 'View', 'Delete'])
		expect(menu.keys).toEqual(['Change', 'builtin:view', 'builtin:delete'])
		expect(menu.testids).toEqual(['cn-action-item-change', 'cn-action-item-view', 'cn-action-item-delete'])
	})
})

describe('CnIndexPage — the right-click menu is the row menu', () => {
	/**
	 * Right-click a row and read the actions the context menu receives.
	 *
	 * @param {object} wrapper The mounted page.
	 * @param {object} row The row.
	 * @return {Promise<Array<object>>} The context menu's actions.
	 */
	async function rightClick(wrapper, row) {
		wrapper.vm.onRowContextMenu({ row, event: { clientX: 1, clientY: 1 } })
		await wrapper.vm.$nextTick()
		return wrapper.findComponent({ name: 'CnContextMenu' }).props('actions')
	}

	it('gets the same entries, in the same order, as the row menu', async () => {
		const wrapper = mountPage({ actions: PUBLICATIONS_ACTIONS, showViewAction: false })
		const row = objects[0]
		const contextActions = await rightClick(wrapper, row)
		expect(contextActions).toEqual(wrapper.vm.rowActionsFor(row))
		expect(contextActions.map((a) => a.label)).toEqual(['Edit', 'Copy', 'File list', 'Delete'])
	})

	it('drops what the row\'s availability block refuses, as the row menu does', async () => {
		const wrapper = mountPage({ actions: PUBLICATIONS_ACTIONS, showViewAction: false })
		const row = { id: 'p3', title: 'Three', '@self': { actions: ['edit', 'delete'] } }
		const contextActions = await rightClick(wrapper, row)
		expect(contextActions.map((a) => a.label)).toEqual(['Edit', 'Delete'])
		expect(contextActions).toEqual(wrapper.vm.rowActionsFor(row))
	})

	it('keeps the closing menu\'s row and entries through the hide animation', async () => {
		const wrapper = mountPage({ actions: PUBLICATIONS_ACTIONS, showViewAction: false })
		const row = { id: 'p3', title: 'Three', '@self': { actions: ['edit', 'delete'] } }
		await rightClick(wrapper, row)
		wrapper.vm.closeContextMenu()
		await wrapper.vm.$nextTick()
		const menu = wrapper.findComponent({ name: 'CnContextMenu' })
		expect(menu.props('targetItem')).toEqual(row)
		expect(menu.props('actions').map((a) => a.label)).toEqual(['Edit', 'Delete'])
	})

	it('does not let a late close null the row of a menu just reopened', async () => {
		const wrapper = mountPage({ actions: PUBLICATIONS_ACTIONS, showViewAction: false })
		await rightClick(wrapper, objects[0])
		await rightClick(wrapper, objects[1])
		wrapper.vm.closeContextMenu()
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnContextMenu' }).props('targetItem')).toEqual(objects[1])
	})
})

describe('CnIndexPage — telling a built-in from an app action with its id', () => {
	it('suppresses only the handler:"none" app action, not the built-in Edit beside it', () => {
		const wrapper = mountPage({ actions: [{ id: 'edit', label: 'Open editor', handler: 'none' }] })
		const row = objects[0]
		wrapper.vm.onRowAction({ action: 'Open editor', row, id: 'edit' })
		expect(wrapper.emitted('action')).toBeFalsy()
		wrapper.vm.onRowAction({ action: 'Edit', row, id: 'edit', builtin: true })
		expect(wrapper.emitted('action')).toEqual([[{ action: 'Edit', row, id: 'edit', builtin: true }]])
	})

	it('does not let a handler:"none" app action labelled "Edit" swallow the built-in Edit\'s event', () => {
		// Matching by label alone once found the app action for both entries and suppressed the built-in too.
		const wrapper = mountPage({ actions: [{ id: 'edit-lock', label: 'Edit', handler: 'none' }] })
		const row = objects[0]
		wrapper.vm.onRowAction({ action: 'Edit', row, id: 'edit-lock' })
		expect(wrapper.emitted('action')).toBeFalsy()
		wrapper.vm.onRowAction({ action: 'Edit', row, id: 'edit', builtin: true })
		expect(wrapper.emitted('action')).toEqual([[{ action: 'Edit', row, id: 'edit', builtin: true }]])
	})
})

describe('CnIndexPage — a named source places built-ins in its own row actions', () => {
	/**
	 * Run the page's own computeds against a named source.
	 *
	 * @param {Array} rowActions The source's row actions.
	 * @return {Array<object>} The resolved row actions.
	 */
	function sourceActions(rowActions) {
		const namedSource = { rowActions, deleteRow: jest.fn() }
		const defaultActions = CnIndexPage.computed.defaultActions.call({
			hasExplicitProp: () => false,
			showViewAction: true,
			showEditAction: true,
			showCopyAction: true,
			showDeleteAction: true,
			editOpensDetail: false,
			viewTo: null,
			isNamedSource: true,
			namedSource,
		})
		return CnIndexPage.computed.mergedActions.call({
			$router: null,
			rowKey: 'id',
			title: 'Flows',
			effectiveRegistry: {},
			effectiveCustomComponents: {},
			defaultActions,
			actions: [],
			isNamedSource: true,
			namedSource,
			openSourceRow: jest.fn(),
		})
	}

	let warn

	beforeEach(() => {
		warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
	})

	it('renders Delete, Open, and warns in development that Delete is not last', () => {
		const actions = sourceActions(['builtin:delete', { id: 'open', label: 'Open', action: 'open' }])
		expect(actions.map((a) => a.label)).toEqual(['Delete', 'Open'])
		expect(typeof actions[1].handler).toBe('function')
		expect(ownWarnings(warn).some((m) => m.includes('builtin:delete'))).toBe(true)
	})

	it('renders a repeated placeholder once, and warns', () => {
		const actions = sourceActions(['builtin:delete', 'builtin:delete'])
		expect(actions.map((a) => a.label)).toEqual(['Delete'])
		expect(ownWarnings(warn).some((m) => m.includes('more than once'))).toBe(true)
	})

	it('ignores a builtin key a source puts on an object', () => {
		const actions = sourceActions([{ id: 'delete', label: 'Remove', builtin: true }])
		expect(actions.map((a) => a.label)).toEqual(['Remove', 'Delete'])
		expect(actions[0].builtin).toBeUndefined()
	})
})
