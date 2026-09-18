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

	it('asks the row once per render, not once per action', () => {
		// The availability is read off the rows the list already fetched, so a
		// page of ninety rows costs the one request it already made.
		const wrapper = mountPage()
		expect(wrapper.vm.rowActionField).toBe('@self.actions')
	})
})
