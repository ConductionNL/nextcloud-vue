// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnIndexPage's manifest action dispatcher, covering both contracts:
 *  - v2 typed dispatch (`action.type`): navigate (external URL → new tab,
 *    in-app path → router), open-page (named route).
 *  - v1.3.0 handler dispatch (`action.handler`): navigate+route, registry fn,
 *    emit, none. These must keep working (back-compat).
 */

import { dispatchAction, resolveActionHandler, resolveActionTarget } from '../../src/components/CnIndexPage/manifestActionDispatch.js'

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

	it('handler:navigate preserves falsy-but-defined field values (null, 0, false) as route params', () => {
		const c = ctx()
		const fn = resolveActionHandler({
			id: 'a',
			handler: 'navigate',
			route: 'detail',
			params: { id: '{id}', parent: '{parentId}', priority: '{priority}', archived: '{archived}' },
		}, c)
		fn({ id: 'row-3', parentId: null, priority: 0, archived: false })
		expect(c.router.push).toHaveBeenCalledWith({
			name: 'detail',
			params: { id: 'row-3', parent: null, priority: 0, archived: false },
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

describe('manifestActionDispatch — link targets', () => {
	it('resolveActionTarget mirrors the dispatch targets', () => {
		const c = ctx()
		const row = { id: 'r1', slug: 'dog' }
		expect(resolveActionTarget({ type: 'navigate', target: 'https://a.test' }, row, c)).toEqual({ target: 'https://a.test', external: true })
		expect(resolveActionTarget({ type: 'navigate', target: '/pets' }, row, c)).toEqual({ target: '/pets', external: false })
		expect(resolveActionTarget({ type: 'open-page', target: 'PetDetail' }, row, c))
			.toEqual({ target: { name: 'PetDetail', params: { id: 'r1' } }, external: false })
		expect(resolveActionTarget({ handler: 'navigate', route: 'PetDetail', params: { slug: '{slug}', tab: 'x-{id}' } }, row, c))
			.toEqual({ target: { name: 'PetDetail', params: { id: 'r1', slug: 'dog', tab: 'x-r1' } }, external: false })
		expect(resolveActionTarget({ handler: 'doThing' }, row, c)).toBeNull()
		expect(resolveActionTarget({ type: 'navigate' }, row, c)).toBeNull()
	})

	it('adds the row id only to a route that declares :id', () => {
		const router = {
			push: jest.fn(),
			getRoutes: () => [
				{ name: 'PetDetail', path: '/pets/:id' },
				{ name: 'PetList', path: '/pets' },
			],
		}
		const c = ctx({ router })
		const row = { id: 'r1' }
		expect(resolveActionTarget({ type: 'open-page', target: 'PetList' }, row, c).target)
			.toEqual({ name: 'PetList', params: {} })
		expect(resolveActionTarget({ type: 'open-page', target: 'PetDetail' }, row, c).target)
			.toEqual({ name: 'PetDetail', params: { id: 'r1' } })
		expect(resolveActionTarget({ handler: 'navigate', route: 'PetList', params: { tab: 'all' } }, row, c).target)
			.toEqual({ name: 'PetList', params: { tab: 'all' } })
		// A route the router does not know keeps the id.
		expect(resolveActionTarget({ type: 'open-page', target: 'Unknown' }, row, c).target)
			.toEqual({ name: 'Unknown', params: { id: 'r1' } })
	})

	it('resolveActionTarget drops an unresolved token without warning by default', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const target = resolveActionTarget({ id: 'a', handler: 'navigate', route: 'R', params: { other: '{missing}' } }, { id: 1 }, ctx())
		expect(target.target.params).toEqual({ id: 1 })
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('dispatchAction gives an in-app navigating action a per-row `to`', () => {
		const c = ctx()
		const openPage = dispatchAction({ id: 'v', label: 'View', type: 'open-page', target: 'PetDetail' }, c)
		expect(openPage.to({ id: 5 })).toEqual({ name: 'PetDetail', params: { id: 5 } })
		const nav = dispatchAction({ id: 'e', label: 'Edit', handler: 'navigate', route: 'PetEdit' }, c)
		expect(nav.to({ id: 6 })).toEqual({ name: 'PetEdit', params: { id: 6 } })
		expect(typeof nav.handler).toBe('function')
	})

	it('dispatchAction gives an external navigate an href opening in a new tab', () => {
		const out = dispatchAction({ id: 'd', label: 'Docs', type: 'navigate', target: 'https://a.test' }, ctx())
		expect(out).toMatchObject({ href: 'https://a.test', linkTarget: '_blank' })
		expect(out.to).toBeUndefined()
	})

	it('dispatchAction adds no link fields to a non-navigating or suppressed action', () => {
		const c = ctx({ customComponents: { doThing: jest.fn() } })
		const fn = dispatchAction({ id: 'a', label: 'A', handler: 'doThing' }, c)
		expect(fn.to).toBeUndefined()
		expect(fn.href).toBeUndefined()
		const none = dispatchAction({ id: 'n', label: 'N', handler: 'none' }, c)
		expect(none.to).toBeUndefined()
	})
})
