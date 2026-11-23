/**
 * Tests for CnIndexPage narrowing a row's action menu to what the server
 * allows on that record (working-list-row-actions).
 */

const { shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ACTIONS = [
	{ id: 'assign', label: 'Assign', handler: () => {} },
	{ id: 'reject', label: 'Reject', handler: () => {} },
	{ id: 'close', label: 'Close', handler: () => {} },
]

function mountPage({ actions = ACTIONS, rowActionField } = {}) {
	const propsData = {
		objects: [],
		actions,
		schema: { title: 'Case', properties: {} },
		showViewAction: false,
		showEditAction: false,
		showCopyAction: false,
		showDeleteAction: false,
	}
	if (rowActionField) {
		propsData.rowActionField = rowActionField
	}
	return shallowMount(CnIndexPage, { propsData })
}

function row(actions) {
	return { id: 'case-1', '@self': { actions } }
}

describe('CnIndexPage — the actions a row offers', () => {
	it('offers every declared action when the row says nothing about them', () => {
		const wrapper = mountPage()
		expect(wrapper.vm.rowActionsFor({ id: 'case-1' }).map((a) => a.id)).toEqual(['assign', 'reject', 'close'])
	})

	it('offers only what the server allows on that row', () => {
		const wrapper = mountPage()
		expect(wrapper.vm.rowActionsFor(row(['assign', 'close'])).map((a) => a.id)).toEqual(['assign', 'close'])
	})

	it('keeps a refusal reason available on request rather than in the menu', () => {
		const wrapper = mountPage()
		const r = row({ assign: true, reject: { allowed: false, reason: 'Advice has not been filed yet' } })
		expect(wrapper.vm.rowActionsFor(r).map((a) => a.id)).toEqual(['assign'])
		expect(wrapper.vm.rowActionRefusal(r, ACTIONS[1])).toBe('Advice has not been filed yet')
	})

	it('a row cannot bring back an action the page declaration removed', () => {
		const wrapper = mountPage({ actions: [ACTIONS[0], ACTIONS[2]] })
		const r = row(['assign', 'reject', 'close'])
		expect(wrapper.vm.rowActionsFor(r).map((a) => a.id)).toEqual(['assign', 'close'])
		expect(wrapper.vm.rowActionsNotDeclared(r)).toEqual(['reject'])
	})

	it('reads the path the page names instead of the default', () => {
		const wrapper = mountPage({ rowActionField: 'permissions.actions' })
		const r = { id: 'case-1', permissions: { actions: ['close'] }, '@self': { actions: ['assign', 'reject'] } }
		expect(wrapper.vm.rowActionsFor(r).map((a) => a.id)).toEqual(['close'])
	})

	it('matches built-ins by id', () => {
		const wrapper = shallowMount(CnIndexPage, { propsData: { title: 'Cases', objects: [], schema: { title: 'Case', properties: {} } } })
		expect(wrapper.vm.rowActionsFor(row(['edit', 'delete'])).map((a) => a.id)).toEqual(['edit', 'delete'])
	})

	it('never matches a built-in by its label', () => {
		const wrapper = shallowMount(CnIndexPage, { propsData: { title: 'Cases', objects: [], schema: { title: 'Case', properties: {} } } })
		expect(wrapper.vm.rowActionsFor(row(['Edit', 'View']))).toEqual([])
	})

	it('keeps View, Edit, Copy and Delete for the verbs OpenRegister sends', () => {
		const wrapper = shallowMount(CnIndexPage, { propsData: { title: 'Cases', objects: [], schema: { title: 'Case', properties: {} } } })
		const r = row(['read', 'update', 'delete', 'destroy', 'export', 'assign'])
		expect(wrapper.vm.rowActionsFor(r).map((a) => a.id)).toEqual(['view', 'edit', 'copy', 'delete'])
		expect(wrapper.vm.rowActionsNotDeclared(r)).toEqual(['assign', 'destroy', 'export'])
	})

	it('hides a built-in whose verb is refused, keeping the reason', () => {
		const wrapper = shallowMount(CnIndexPage, { propsData: { title: 'Cases', objects: [], schema: { title: 'Case', properties: {} } } })
		const r = row({ read: true, update: { allowed: false, reason: 'The case is closed' }, delete: false })
		expect(wrapper.vm.rowActionsFor(r).map((a) => a.id)).toEqual(['view', 'copy'])
		const edit = wrapper.vm.mergedActions.find((a) => a.builtin === true && a.id === 'edit')
		expect(wrapper.vm.rowActionRefusal(r, edit)).toBe('The case is closed')
	})

	it('does not map verbs onto an app action that shares a built-in id', () => {
		const wrapper = shallowMount(CnIndexPage, {
			propsData: {
				title: 'Cases',
				objects: [],
				schema: { title: 'Case', properties: {} },
				actions: [{ id: 'edit', label: 'Open editor', handler: () => {} }],
				showViewAction: false,
				showCopyAction: false,
				showDeleteAction: false,
			},
		})
		const out = wrapper.vm.rowActionsFor(row(['update']))
		expect(out).toHaveLength(1)
		expect(out[0].builtin).toBe(true)
		expect(out[0].label).not.toBe('Open editor')
	})

	it('does not map verbs onto a manifest action that sets builtin itself', () => {
		const wrapper = shallowMount(CnIndexPage, {
			propsData: {
				title: 'Cases',
				objects: [],
				schema: { title: 'Case', properties: {} },
				actions: [{ id: 'edit', builtin: true, label: 'Open editor', handler: () => {} }],
				showViewAction: false,
				showEditAction: false,
				showCopyAction: false,
				showDeleteAction: false,
			},
		})
		expect(wrapper.vm.mergedActions.map((a) => a.label)).toEqual(['Open editor'])
		expect(wrapper.vm.rowActionsFor(row(['update']))).toEqual([])
		expect(wrapper.vm.rowActionsFor(row(['edit'])).map((a) => a.label)).toEqual(['Open editor'])
	})

	it('leaves the built-ins unfiltered on a row without the block', () => {
		const wrapper = shallowMount(CnIndexPage, { propsData: { title: 'Cases', objects: [], schema: { title: 'Case', properties: {} } } })
		expect(wrapper.vm.rowActionsFor({ id: 'case-1' }).map((a) => a.id)).toEqual(['view', 'edit', 'copy', 'delete'])
	})

	it('asks the row once per render, not once per action', () => {
		// The availability is read off the rows the list already fetched, so a
		// page of ninety rows costs the one request it already made.
		const wrapper = mountPage()
		expect(wrapper.vm.rowActionField).toBe('@self.actions')
	})
})
