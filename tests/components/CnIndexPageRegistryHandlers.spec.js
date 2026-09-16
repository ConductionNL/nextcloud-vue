/**
 * A manifest's named handlers (`actions[].handler`, `bulkActions[].handler`,
 * `headerActions[].handler`) resolve out of the v2 registry, so an app can
 * register a `kind: 'handler'` entry instead of a bare function in the
 * deprecated customComponents map. The legacy map stays as the fallback.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { resolveRegisteredHandler } from '../../src/utils/actionsDispatcher.js'

const baseProps = {
	title: 'Cases',
	schema: { title: 'Case', properties: {} },
	objects: [{ id: 'abc-123', title: 'Vergunning' }],
}

/**
 * @param {object} extra Extra props for the page.
 * @param {object} registries `{ registry, customComponents }` to provide.
 * @return {object} The mounted wrapper.
 */
function mountIndexPage(extra = {}, { registry = {}, customComponents = {} } = {}) {
	return mount(CnIndexPage, {
		propsData: { ...baseProps, ...extra },
		mocks: { $router: { push: jest.fn() } },
		stubs: {
			CnDataTable: true,
			CnCardGrid: true,
			CnPagination: true,
			CnActionsBar: true,
			CnContextMenu: true,
			CnRowActions: true,
			CnIndexSidebar: true,
		},
		provide: {
			cnRegistry: registry,
			cnCustomComponents: customComponents,
		},
	})
}

describe('resolveRegisteredHandler', () => {
	it('takes a kind:handler registry entry, a bare function, or the legacy map', () => {
		const viaKind = jest.fn()
		const viaFn = jest.fn()
		const bare = jest.fn()
		const legacy = jest.fn()
		const registry = {
			viaKind: { kind: 'handler', handler: viaKind },
			viaFn: { kind: 'handler', fn: viaFn },
			bare,
		}

		expect(resolveRegisteredHandler('viaKind', registry, {})).toBe(viaKind)
		expect(resolveRegisteredHandler('viaFn', registry, {})).toBe(viaFn)
		expect(resolveRegisteredHandler('bare', registry, {})).toBe(bare)
		expect(resolveRegisteredHandler('legacy', registry, { legacy })).toBe(legacy)
	})

	it('answers null for an unknown name, an empty name, or a component', () => {
		const registry = { aPanel: { kind: 'widget', component: {} } }
		expect(resolveRegisteredHandler('nope', registry, {})).toBeNull()
		expect(resolveRegisteredHandler('', registry, {})).toBeNull()
		expect(resolveRegisteredHandler('aPanel', registry, {})).toBeNull()
	})

	it('prefers the registry over a same-named legacy entry', () => {
		const registered = jest.fn()
		const legacy = jest.fn()
		expect(resolveRegisteredHandler('claim', { claim: { kind: 'handler', handler: registered } }, { claim: legacy }))
			.toBe(registered)
	})
})

describe('CnIndexPage — handlers resolved from the v2 registry', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('dispatches a row action to a kind:handler registry entry', () => {
		const claimCase = jest.fn()
		const wrapper = mountIndexPage(
			{ actions: [{ id: 'claim', label: 'Claim', handler: 'claimCase' }] },
			{ registry: { claimCase: { kind: 'handler', handler: claimCase } } },
		)

		const dispatched = wrapper.vm.mergedActions.find((a) => a.id === 'claim')
		dispatched.handler({ id: 'abc-123' })

		expect(claimCase).toHaveBeenCalledWith({ actionId: 'claim', item: { id: 'abc-123' } })
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('dispatches a bulk action to a kind:handler registry entry, with the selection', () => {
		const reassignSelection = jest.fn()
		const wrapper = mountIndexPage(
			{ bulkActions: [{ id: 'reassign', label: 'Reassign', handler: 'reassignSelection' }] },
			{ registry: { reassignSelection: { kind: 'handler', handler: reassignSelection } } },
		)

		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a', 'b'] })

		expect(reassignSelection).toHaveBeenCalledWith({ actionId: 'reassign', selectedIds: ['a', 'b'], count: 2 })
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('dispatches a header action to a kind:handler registry entry', () => {
		const openConnections = jest.fn()
		const wrapper = mountIndexPage(
			{ headerActions: [{ id: 'add', label: 'Add integration', handler: 'openConnections' }] },
			{ registry: { openConnections: { kind: 'handler', handler: openConnections } } },
		)

		const entry = wrapper.vm.mergedHeaderActions.find((a) => a.id === 'add')
		entry.handler()

		expect(openConnections).toHaveBeenCalledWith({ actionId: 'add' })
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('still resolves a handler that only the legacy map carries', () => {
		const legacyOnly = jest.fn()
		const wrapper = mountIndexPage(
			{ actions: [{ id: 'legacy', label: 'Legacy', handler: 'legacyOnly' }] },
			{ registry: { somethingElse: { kind: 'handler', handler: jest.fn() } }, customComponents: { legacyOnly } },
		)

		wrapper.vm.mergedActions.find((a) => a.id === 'legacy').handler({ id: 'abc-123' })
		expect(legacyOnly).toHaveBeenCalledTimes(1)
	})

	it('resolves cardComponent and listComponent out of the registry too', () => {
		const Card = { name: 'MyCard', template: '<div class="my-card" />' }
		const Row = { name: 'MyRow', template: '<div class="my-row" />' }
		const wrapper = mountIndexPage(
			{ cardComponent: 'MyCard', listComponent: 'MyRow' },
			{ registry: { MyCard: { kind: 'page', component: Card }, MyRow: { kind: 'page', component: Row } } },
		)

		expect(wrapper.vm.resolvedCardComponent).toBe(Card)
		expect(wrapper.vm.resolvedListComponent).toBe(Row)
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('warns when the name is registered as a component rather than a handler', () => {
		const wrapper = mountIndexPage(
			{ actions: [{ id: 'oops', label: 'Oops', handler: 'SomePanel' }] },
			{ registry: { SomePanel: { kind: 'widget', component: { template: '<div />' } } } },
		)

		expect(wrapper.vm.mergedActions.find((a) => a.id === 'oops').handler).toBeUndefined()
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('resolved to a non-function'))
	})
})
