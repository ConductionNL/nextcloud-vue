/**
 * Tests for CnIndexPage's manifest-actions-dispatch handler resolution.
 *
 * Covers REQ-MAD-3..7 from the manifest-actions-dispatch spec — the
 * `actions[].handler` field resolves through the customComponents
 * registry (or one of three reserved keywords navigate / emit / none)
 * into a row-action handler function. v1.2 manifests (no handler)
 * keep working unchanged via the existing `@action` event path.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const baseProps = {
	title: 'Queues',
	schema: { title: 'Queue', properties: {} },
	objects: [{ id: 'abc-123', title: 'Vergunning queue' }],
}

function mountIndexPage(extra = {}, { customComponents = {}, $router = null } = {}) {
	return mount(CnIndexPage, {
		propsData: { ...baseProps, ...extra },
		mocks: {
			$router: $router ?? { push: jest.fn() },
		},
		stubs: {
			// Stub heavy children — the dispatch logic lives in the
			// computed `mergedActions` and the `resolveHandler` /
			// `onRowAction` methods, neither of which need a real
			// CnDataTable to verify.
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

describe('CnIndexPage — manifest-actions-dispatch (REQ-MAD-3..7)', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('REQ-MAD-3 — registry-name handler resolution', () => {
		it('resolves a string handler through customComponents into an invocation function', () => {
			const queueProcessHandler = jest.fn()
			const wrapper = mountIndexPage(
				{ actions: [{ id: 'process', label: 'Process', handler: 'queueProcessHandler' }] },
				{ customComponents: { queueProcessHandler } },
			)

			const merged = wrapper.vm.mergedActions
			const dispatched = merged.find((a) => a.id === 'process')
			expect(typeof dispatched.handler).toBe('function')

			dispatched.handler({ id: 'abc-123' })
			expect(queueProcessHandler).toHaveBeenCalledTimes(1)
			expect(queueProcessHandler).toHaveBeenCalledWith({
				actionId: 'process',
				item: { id: 'abc-123' },
			})
		})

		it('explicit customComponents prop wins over the injected registry', () => {
			const fromInject = jest.fn()
			const fromProp = jest.fn()
			const wrapper = mount(CnIndexPage, {
				propsData: {
					...baseProps,
					actions: [{ id: 'x', label: 'X', handler: 'theHandler' }],
					customComponents: { theHandler: fromProp },
				},
				mocks: { $router: { push: jest.fn() } },
				stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
				provide: { cnCustomComponents: { theHandler: fromInject } },
			})

			const merged = wrapper.vm.mergedActions
			merged.find((a) => a.id === 'x').handler({ id: 'r1' })
			expect(fromProp).toHaveBeenCalledTimes(1)
			expect(fromInject).not.toHaveBeenCalled()
		})

		it('silently falls back to @action-only when the handler name is missing from the registry', () => {
			const wrapper = mountIndexPage(
				{ actions: [{ id: 'orphan', label: 'Orphan', handler: 'missingHandler' }] },
				{ customComponents: {} },
			)

			const merged = wrapper.vm.mergedActions
			const dispatched = merged.find((a) => a.id === 'orphan')
			// handler should be stripped (no function to call); the
			// existing CnRowActions emit-only path covers @action.
			expect(dispatched.handler).toBeUndefined()
			expect(warnSpy).not.toHaveBeenCalled()
		})

		it('warns once when the registry entry is a non-function (e.g. a Vue component)', () => {
			const wrapper = mountIndexPage(
				{ actions: [{ id: 'y', label: 'Y', handler: 'wrongShape' }] },
				{ customComponents: { wrongShape: { template: '<div/>' } } },
			)

			const merged = wrapper.vm.mergedActions
			const dispatched = merged.find((a) => a.id === 'y')
			expect(dispatched.handler).toBeUndefined()
			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0][0]).toContain('wrongShape')
		})
	})

	describe('REQ-MAD-4 — handler:"navigate"', () => {
		it('dispatches $router.push with name + id param on click', () => {
			const push = jest.fn()
			const wrapper = mountIndexPage(
				{ actions: [{ id: 'view', label: 'View', handler: 'navigate', route: 'QueueDetail' }] },
				{ $router: { push } },
			)

			const merged = wrapper.vm.mergedActions
			merged.find((a) => a.id === 'view').handler({ id: 'abc-123', title: 'Vergunning queue' })
			expect(push).toHaveBeenCalledTimes(1)
			expect(push).toHaveBeenCalledWith({
				name: 'QueueDetail',
				params: { id: 'abc-123' },
			})
		})

		it('warns and falls back when navigate is declared without route', () => {
			const wrapper = mountIndexPage({
				actions: [{ id: 'view', label: 'View', handler: 'navigate' }],
			})
			const merged = wrapper.vm.mergedActions
			expect(merged.find((a) => a.id === 'view').handler).toBeUndefined()
			expect(warnSpy).toHaveBeenCalledTimes(1)
		})
	})

	describe('REQ-MAD-5 — handler:"emit"', () => {
		it('skips the registry lookup even when the name "emit" exists in the registry', () => {
			const collidingFn = jest.fn()
			const wrapper = mountIndexPage(
				{ actions: [{ id: 'z', label: 'Z', handler: 'emit' }] },
				{ customComponents: { emit: collidingFn } },
			)

			const merged = wrapper.vm.mergedActions
			expect(merged.find((a) => a.id === 'z').handler).toBeUndefined()
			expect(collidingFn).not.toHaveBeenCalled()
		})

		it('still emits @action via onRowAction (event listeners keep working)', () => {
			const wrapper = mountIndexPage({
				actions: [{ id: 'z', label: 'Z', handler: 'emit' }],
			})

			wrapper.vm.onRowAction({ action: 'Z', row: { id: 'r1' } })
			const events = wrapper.emitted('action')
			expect(events).toBeTruthy()
			expect(events[0][0]).toEqual({ action: 'Z', row: { id: 'r1' } })
		})
	})

	describe('REQ-MAD-6 — handler:"none"', () => {
		it('marks the action with _dispatchSuppress so onRowAction drops the @action emit', () => {
			const wrapper = mountIndexPage({
				actions: [{ id: 'blocked', label: 'Blocked', handler: 'none' }],
			})

			const merged = wrapper.vm.mergedActions
			const dispatched = merged.find((a) => a.id === 'blocked')
			expect(dispatched._dispatchSuppress).toBe(true)
			expect(typeof dispatched.handler).toBe('function')

			// Even when CnRowActions emits @action, the page suppresses it.
			wrapper.vm.onRowAction({ action: 'Blocked', row: { id: 'r1' } })
			expect(wrapper.emitted('action')).toBeFalsy()
		})
	})

	describe('REQ-MAD-7 — back-compat for programmatic function handlers', () => {
		it('passes through function handlers untouched (the runtime / defaultActions path)', () => {
			const fn = jest.fn()
			const wrapper = mountIndexPage({
				actions: [{ label: 'Programmatic', handler: fn }],
			})

			const merged = wrapper.vm.mergedActions
			const dispatched = merged.find((a) => a.label === 'Programmatic')
			expect(dispatched.handler).toBe(fn)

			dispatched.handler({ id: 'r1' })
			expect(fn).toHaveBeenCalledWith({ id: 'r1' })
		})

		it('leaves manifest actions without `handler` unchanged (v1.2 back-compat)', () => {
			const wrapper = mountIndexPage({
				actions: [{ id: 'plain', label: 'Plain' }],
			})
			const merged = wrapper.vm.mergedActions
			const dispatched = merged.find((a) => a.id === 'plain')
			expect(dispatched.handler).toBeUndefined()
		})
	})
})
