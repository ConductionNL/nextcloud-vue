// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnIndexPage's manifest action dispatcher, covering both contracts:
 *  - v2 typed dispatch (`action.type`): navigate (external URL → new tab,
 *    in-app path → router), open-page (named route).
 *  - v1.3.0 handler dispatch (`action.handler`): navigate+route, registry fn,
 *    emit, none. These must keep working (back-compat).
 */

import { resolveActionHandler, dispatchAction } from '../../src/components/CnIndexPage/manifestActionDispatch.js'

function ctx(overrides = {}) {
	return {
		router: { push: jest.fn() },
		rowKey: 'id',
		customComponents: {},
		...overrides,
	}
}

describe('manifestActionDispatch — v2 typed dispatch', () => {
	it('type:navigate with an external URL opens a new tab', () => {
		const c = ctx()
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {})
		const fn = resolveActionHandler({ id: 'a', type: 'navigate', target: 'https://conduction.nl/docs' }, c)
		expect(typeof fn).toBe('function')
		fn({ id: 'row-1' })
		expect(openSpy).toHaveBeenCalledWith('https://conduction.nl/docs', '_blank', 'noopener,noreferrer')
		expect(c.router.push).not.toHaveBeenCalled()
		openSpy.mockRestore()
	})

	it('type:navigate with an in-app path uses the router', () => {
		const c = ctx()
		const fn = resolveActionHandler({ id: 'a', type: 'navigate', target: '/pets/new' }, c)
		fn({ id: 'row-1' })
		expect(c.router.push).toHaveBeenCalledWith('/pets/new')
	})

	it('type:open-page pushes a named route with the row id', () => {
		const c = ctx()
		const fn = resolveActionHandler({ id: 'a', type: 'open-page', target: 'pet-detail' }, c)
		fn({ id: 'row-9' })
		expect(c.router.push).toHaveBeenCalledWith({ name: 'pet-detail', params: { id: 'row-9' } })
	})

	it('type:navigate without a target falls back to @action-only (null)', () => {
		expect(resolveActionHandler({ id: 'a', type: 'navigate' }, ctx())).toBeNull()
	})

	it('dispatchAction attaches a handler for a typed action with no handler string', () => {
		const c = ctx()
		const out = dispatchAction({ id: 'a', label: 'Docs', type: 'navigate', target: 'https://x.test' }, c)
		expect(typeof out.handler).toBe('function')
	})
})

describe('manifestActionDispatch — v1.3.0 handler dispatch (back-compat)', () => {
	it('handler:navigate + route pushes the named route with row id', () => {
		const c = ctx()
		const fn = resolveActionHandler({ id: 'a', handler: 'navigate', route: 'detail' }, c)
		fn({ id: 'row-3' })
		expect(c.router.push).toHaveBeenCalledWith({ name: 'detail', params: { id: 'row-3' } })
	})

	it('handler:navigate resolves a "{id}" param token against the row', () => {
		const c = ctx()
		const fn = resolveActionHandler({ id: 'a', handler: 'navigate', route: 'detail', params: { id: '{id}' } }, c)
		fn({ id: 'row-3' })
		expect(c.router.push).toHaveBeenCalledWith({ name: 'detail', params: { id: 'row-3' } })
	})

	it('handler:navigate resolves non-id field tokens and preserves their type', () => {
		const c = ctx()
		const fn = resolveActionHandler({
			id: 'a',
			handler: 'navigate',
			route: 'detail',
			params: { id: '{ref}', tab: 'logs', label: 'run-{name}' },
		}, c)
		fn({ id: 'row-3', ref: 42, name: 'nightly' })
		expect(c.router.push).toHaveBeenCalledWith({
			name: 'detail',
			params: { id: 42, tab: 'logs', label: 'run-nightly' },
		})
	})

	it('handler:navigate keeps a brace-less literal param (the "New X" pattern)', () => {
		const c = ctx()
		const fn = resolveActionHandler({ id: 'a', handler: 'navigate', route: 'detail', params: { id: 'new' } }, c)
		fn({ id: 'row-3' })
		expect(c.router.push).toHaveBeenCalledWith({ name: 'detail', params: { id: 'new' } })
	})

	it('handler:navigate drops an unresolvable token and falls back to the row id', () => {
		const c = ctx()
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const fn = resolveActionHandler({ id: 'a', handler: 'navigate', route: 'detail', params: { id: '{missing}' } }, c)
		fn({ id: 'row-3' })
		expect(c.router.push).toHaveBeenCalledWith({ name: 'detail', params: { id: 'row-3' } })
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('handler registry function is wrapped', () => {
		const spy = jest.fn()
		const c = ctx({ customComponents: { doThing: spy } })
		const fn = resolveActionHandler({ id: 'a', handler: 'doThing' }, c)
		fn({ id: 'row-4' })
		expect(spy).toHaveBeenCalledWith({ actionId: 'a', item: { id: 'row-4' } })
	})

	it('handler:emit resolves to null (page bubbles @action)', () => {
		expect(resolveActionHandler({ id: 'a', handler: 'emit' }, ctx())).toBeNull()
	})

	it('a plain @action-emit action (no type, no handler) passes through unchanged', () => {
		const action = { id: 'a', label: 'X' }
		expect(dispatchAction(action, ctx())).toBe(action)
	})
})
