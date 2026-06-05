/**
 * Tests for CnIndexPage's `config.headerActions[]` page-level action
 * dispatch — covers the "Page-Level Header Actions" requirement added
 * in the `manifest-icons-and-page-actions` change.
 *
 * The dispatch logic mirrors the row-level `actions[].handler` pattern
 * (navigate / emit / none / registry name) but with no row context —
 * header actions are page-level.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const baseProps = {
	title: 'Sources',
	schema: { title: 'Source', properties: {} },
	objects: [],
}

function mountPage(extra = {}, { customComponents = {}, router = null } = {}) {
	return mount(CnIndexPage, {
		propsData: { ...baseProps, ...extra },
		mocks: { $router: router ?? { push: jest.fn() } },
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
			cnCustomComponents: customComponents,
		},
	})
}

describe('CnIndexPage — config.headerActions[] dispatch', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('mergedHeaderActions computed', () => {
		it('forwards a no-handler entry through to CnActionsBar unchanged', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'plain', label: 'Plain' }],
			})
			const merged = wrapper.vm.mergedHeaderActions
			expect(merged).toHaveLength(1)
			expect(merged[0]).toEqual({ id: 'plain', label: 'Plain' })
		})

		it('preserves function-typed handlers untouched (programmatic path)', () => {
			const fn = jest.fn()
			const wrapper = mountPage({
				headerActions: [{ id: 'x', label: 'X', handler: fn }],
			})
			const merged = wrapper.vm.mergedHeaderActions
			expect(merged[0].handler).toBe(fn)
		})

		it('drops a reserved-id entry and warns', () => {
			const wrapper = mountPage({
				headerActions: [
					{ id: 'refresh', label: 'Pretend refresh' },
					{ id: 'view-logs', label: 'View logs' },
				],
			})
			expect(wrapper.vm.mergedHeaderActions).toHaveLength(1)
			expect(wrapper.vm.mergedHeaderActions[0].id).toBe('view-logs')
			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0][0]).toContain('headerActions[].id "refresh"')
		})

		it('drops every reserved id (refresh / import / export / copy / delete)', () => {
			const wrapper = mountPage({
				headerActions: [
					{ id: 'refresh', label: 'A' },
					{ id: 'import', label: 'B' },
					{ id: 'export', label: 'C' },
					{ id: 'copy', label: 'D' },
					{ id: 'delete', label: 'E' },
					{ id: 'keep', label: 'F' },
				],
			})
			expect(wrapper.vm.mergedHeaderActions).toEqual([{ id: 'keep', label: 'F' }])
			expect(warnSpy).toHaveBeenCalledTimes(5)
		})
	})

	describe('resolveHeaderHandler', () => {
		it('navigate keyword pushes the named route without params.id', () => {
			const push = jest.fn()
			const wrapper = mountPage(
				{ headerActions: [{ id: 'view-logs', label: 'View logs', handler: 'navigate', route: 'SourceLogs' }] },
				{ router: { push } },
			)
			const merged = wrapper.vm.mergedHeaderActions
			expect(typeof merged[0].handler).toBe('function')
			merged[0].handler()
			expect(push).toHaveBeenCalledWith({ name: 'SourceLogs' })
			expect(push.mock.calls[0][0]).not.toHaveProperty('params')
		})

		it('navigate without route falls through to emit-only and warns', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'broken', label: 'Broken', handler: 'navigate' }],
			})
			const merged = wrapper.vm.mergedHeaderActions
			expect(merged[0]).not.toHaveProperty('handler')
			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0][0]).toContain('handler:"navigate"')
		})

		it('emit keyword strips the handler so click emits @header-action', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'open-bulk', label: 'Open bulk', handler: 'emit' }],
			})
			const merged = wrapper.vm.mergedHeaderActions
			expect(merged[0]).not.toHaveProperty('handler')
		})

		it('none keyword sets _dispatchSuppress and provides a no-op handler', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'placeholder', label: 'Placeholder', handler: 'none' }],
			})
			const merged = wrapper.vm.mergedHeaderActions
			expect(typeof merged[0].handler).toBe('function')
			expect(merged[0]._dispatchSuppress).toBe(true)
			// The handler should be safe to invoke
			expect(() => merged[0].handler()).not.toThrow()
		})

		it('registry-name resolves to fn({ actionId }) (no row context)', () => {
			const openLogsPanel = jest.fn()
			const wrapper = mountPage(
				{ headerActions: [{ id: 'open-logs', label: 'Open logs', handler: 'openLogsPanel' }] },
				{ customComponents: { openLogsPanel } },
			)
			const merged = wrapper.vm.mergedHeaderActions
			expect(typeof merged[0].handler).toBe('function')
			merged[0].handler()
			expect(openLogsPanel).toHaveBeenCalledTimes(1)
			expect(openLogsPanel).toHaveBeenCalledWith({ actionId: 'open-logs' })
		})

		it('registry-name resolving to a non-function warns and falls through', () => {
			const wrapper = mountPage(
				{ headerActions: [{ id: 'foo', label: 'Foo', handler: 'SomeComponent' }] },
				{ customComponents: { SomeComponent: { template: '<div />' } } },
			)
			const merged = wrapper.vm.mergedHeaderActions
			expect(merged[0]).not.toHaveProperty('handler')
			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0][0]).toContain('resolved to a non-function')
		})

		it('unknown registry name silently falls through to emit-only', () => {
			const wrapper = mountPage(
				{ headerActions: [{ id: 'mystery', label: 'Mystery', handler: 'mysteryFn' }] },
				{ customComponents: {} },
			)
			const merged = wrapper.vm.mergedHeaderActions
			expect(merged[0]).not.toHaveProperty('handler')
			expect(warnSpy).not.toHaveBeenCalled()
		})
	})

	describe('onHeaderAction click handling', () => {
		it('invokes the resolved handler and emits @header-action (handler-AND-emit)', () => {
			const fn = jest.fn()
			const wrapper = mountPage(
				{ headerActions: [{ id: 'open-logs', label: 'Open logs', handler: 'openLogsPanel' }] },
				{ customComponents: { openLogsPanel: fn } },
			)
			wrapper.vm.onHeaderAction({ action: 'open-logs', id: 'open-logs' })
			expect(fn).toHaveBeenCalledWith({ actionId: 'open-logs' })
			expect(wrapper.emitted('header-action')).toEqual([[{ action: 'open-logs', id: 'open-logs' }]])
		})

		it('navigate dispatches router.push AND emits @header-action', () => {
			const push = jest.fn()
			const wrapper = mountPage(
				{ headerActions: [{ id: 'view-logs', label: 'View logs', handler: 'navigate', route: 'SourceLogs' }] },
				{ router: { push } },
			)
			wrapper.vm.onHeaderAction({ action: 'view-logs', id: 'view-logs' })
			expect(push).toHaveBeenCalledWith({ name: 'SourceLogs' })
			expect(wrapper.emitted('header-action')).toEqual([[{ action: 'view-logs', id: 'view-logs' }]])
		})

		it('none suppresses the @header-action emit', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'placeholder', label: 'Placeholder', handler: 'none' }],
			})
			wrapper.vm.onHeaderAction({ action: 'placeholder', id: 'placeholder' })
			expect(wrapper.emitted('header-action')).toBeUndefined()
		})

		it('emits @header-action when no handler is declared (back-compat with row-level)', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'plain', label: 'Plain' }],
			})
			wrapper.vm.onHeaderAction({ action: 'plain', id: 'plain' })
			expect(wrapper.emitted('header-action')).toEqual([[{ action: 'plain', id: 'plain' }]])
		})

		it('emits when the registry name is unknown (silent fall-through)', () => {
			const wrapper = mountPage({
				headerActions: [{ id: 'mystery', label: 'Mystery', handler: 'mysteryFn' }],
			})
			wrapper.vm.onHeaderAction({ action: 'mystery', id: 'mystery' })
			expect(wrapper.emitted('header-action')).toEqual([[{ action: 'mystery', id: 'mystery' }]])
		})
	})

	describe('back-compat', () => {
		it('default empty headerActions array does not affect existing behaviour', () => {
			const wrapper = mountPage()
			expect(wrapper.vm.headerActions).toEqual([])
			expect(wrapper.vm.mergedHeaderActions).toEqual([])
		})
	})
})
