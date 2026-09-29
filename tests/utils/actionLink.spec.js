// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { followItemActionLink, resolveItemActionLink, routeHref } from '../../src/utils/actionLink.js'
import { actionLink } from '../../src/utils/actionsDispatcher.js'

/**
 * @return {object} A router stub that resolves a path or `{ name }` to a hash href.
 */
function makeRouter() {
	return {
		push: jest.fn(() => Promise.resolve()),
		resolve: jest.fn((to) => {
			if (to && to.name === 'Missing') {
				throw new Error('No match')
			}
			return { href: '#' + (typeof to === 'string' ? to : '/' + to.name + (to.params?.id ? '/' + to.params.id : '')) }
		}),
	}
}

describe('routeHref', () => {
	it('resolves a path and a location through the router', () => {
		const router = makeRouter()
		expect(routeHref('/dogs', router)).toBe('#/dogs')
		expect(routeHref({ name: 'Dog', params: { id: 7 } }, router)).toBe('#/Dog/7')
	})

	it('answers empty without a router, target, or match', () => {
		expect(routeHref('/dogs', null)).toBe('')
		expect(routeHref(null, makeRouter())).toBe('')
		expect(routeHref({ name: 'Missing' }, makeRouter())).toBe('')
	})
})

describe('resolveItemActionLink', () => {
	it('uses a static or per-item href as is', () => {
		expect(resolveItemActionLink({ href: 'https://a.test' }, null, null)).toEqual({ href: 'https://a.test', to: null, target: undefined })
		expect(resolveItemActionLink({ href: (row) => row.url, linkTarget: '_blank' }, { url: 'https://b.test' }, null))
			.toEqual({ href: 'https://b.test', to: null, target: '_blank' })
	})

	it('resolves a per-item `to` through the router', () => {
		const router = makeRouter()
		const link = resolveItemActionLink({ to: (row) => ({ name: 'Dog', params: { id: row.id } }) }, { id: 3 }, router)
		expect(link).toEqual({ href: '#/Dog/3', to: { name: 'Dog', params: { id: 3 } }, target: undefined })
	})

	it('answers null for a button action or an unresolvable `to`', () => {
		expect(resolveItemActionLink({ label: 'Edit', handler: () => {} }, {}, makeRouter())).toBeNull()
		expect(resolveItemActionLink({ to: '/dogs' }, {}, null)).toBeNull()
		expect(resolveItemActionLink({ to: { name: 'Missing' } }, {}, makeRouter())).toBeNull()
	})
})

describe('followItemActionLink', () => {
	it('routes a plain click on an in-app link', () => {
		const router = makeRouter()
		const event = { button: 0, preventDefault: jest.fn() }
		expect(followItemActionLink(event, { to: '/dogs' }, router)).toBe(true)
		expect(event.preventDefault).toHaveBeenCalled()
		expect(router.push).toHaveBeenCalledWith('/dogs')
	})

	it('leaves a URL, a new-tab target and a modified click to the browser', () => {
		const router = makeRouter()
		expect(followItemActionLink({ button: 0 }, { href: 'https://a.test', to: null }, router)).toBe(false)
		expect(followItemActionLink({ button: 0 }, { to: '/dogs', target: '_blank' }, router)).toBe(false)
		expect(followItemActionLink({ button: 0, ctrlKey: true }, { to: '/dogs' }, router)).toBe(false)
		expect(router.push).not.toHaveBeenCalled()
	})
})

describe('actionLink (actionsDispatcher)', () => {
	it('links an external navigate target without a router', () => {
		expect(actionLink({ type: 'navigate', target: 'https://a.test/x' }))
			.toEqual({ href: 'https://a.test/x', to: null, external: true })
	})

	it('links an in-app navigate through the router, interpolating tokens first', () => {
		const router = makeRouter()
		expect(actionLink({ type: 'navigate', target: '/cases/{objectId}' }, { router, tokenCtx: { objectId: 9 } }))
			.toEqual({ href: '#/cases/9', to: '/cases/9', external: false })
	})

	it('links an open-page to its named route', () => {
		expect(actionLink({ type: 'open-page', target: 'CaseIndex' }, { router: makeRouter() }))
			.toEqual({ href: '#/CaseIndex', to: { name: 'CaseIndex' }, external: false })
	})

	it('answers null for confirm-gated, non-navigating or unresolvable actions', () => {
		const router = makeRouter()
		expect(actionLink({ type: 'navigate', target: '/x', confirm: true }, { router })).toBeNull()
		expect(actionLink({ type: 'api-call', url: '/x' }, { router })).toBeNull()
		expect(actionLink({ type: 'navigate', target: '/x' }, {})).toBeNull()
		expect(actionLink({ type: 'open-page', target: 'Missing' }, { router })).toBeNull()
		expect(actionLink({ type: 'open-page' }, { router })).toBeNull()
	})
})
