// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { followItemActionLink, headerActionAsLink, resolveItemActionLink, resolveManifestHref, routeHref } from '../../src/utils/actionLink.js'
import { actionLink } from '../../src/utils/actionsDispatcher.js'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc/index.php${p}`),
	getRootUrl: jest.fn(() => '/nc'),
}))

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

describe('resolveManifestHref', () => {
	it('keeps an absolute URL and sends an instance path through generateUrl', () => {
		expect(resolveManifestHref('https://example.org/a?b=1')).toBe('https://example.org/a?b=1')
		expect(resolveManifestHref('mailto:a@example.org')).toBe('mailto:a@example.org')
		expect(resolveManifestHref('//cdn.example.org/x')).toBe('//cdn.example.org/x')
		expect(resolveManifestHref('/apps/integriq/connections?app=stackiq')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
	})

	it('puts a path that already names an entry point under the root, without a second /index.php', () => {
		expect(resolveManifestHref('/index.php/apps/x')).toBe('/nc/index.php/apps/x')
		expect(resolveManifestHref('/remote.php/dav/files/admin')).toBe('/nc/remote.php/dav/files/admin')
		expect(resolveManifestHref('/public.php/dav')).toBe('/nc/public.php/dav')
		expect(resolveManifestHref('/ocs/v2.php/apps/x')).toBe('/nc/ocs/v2.php/apps/x')
		// Only a whole path segment counts as an entry point.
		expect(resolveManifestHref('/ocsapp/x')).toBe('/nc/index.php/ocsapp/x')
	})

	it('keeps an already generated URL under the root as written', () => {
		expect(resolveManifestHref('/nc/index.php/apps/x')).toBe('/nc/index.php/apps/x')
		expect(resolveManifestHref('/nc/remote.php/dav')).toBe('/nc/remote.php/dav')
	})

	it('refuses a relative path, another scheme, an uppercase scheme and a non-string', () => {
		expect(resolveManifestHref('apps/x')).toBe('')
		expect(resolveManifestHref('javascript:alert(1)')).toBe('')
		expect(resolveManifestHref('data:text/html,x')).toBe('')
		expect(resolveManifestHref('HTTPS://example.org')).toBe('')
		expect(resolveManifestHref(null)).toBe('')
	})
})

describe('headerActionAsLink', () => {
	it('returns an entry without href as is', () => {
		const entry = { id: 'sync', label: 'Sync', handler: 'sync' }
		expect(headerActionAsLink(entry)).toBe(entry)
		expect(headerActionAsLink(null)).toBeNull()
	})

	it('makes an entry with a function handler a link too, dropping the handler with one warning per id', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const handler = jest.fn()
		expect(headerActionAsLink({ id: 'js', label: 'JS', href: '/apps/x', handler }))
			.toEqual({ id: 'js', label: 'JS', href: '/nc/index.php/apps/x', target: '_self' })
		headerActionAsLink({ id: 'js', label: 'JS', href: '/apps/x', handler })
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('"js"')
		expect(handler).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('warns once per entry without an id, not once for all of them', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		headerActionAsLink({ label: 'First', href: '/apps/x', handler: () => {} })
		headerActionAsLink({ label: 'Second', href: '/apps/x', handler: () => {} })
		headerActionAsLink({ label: 'First', href: '/apps/x', handler: () => {} })
		expect(warn).toHaveBeenCalledTimes(2)
		warn.mockRestore()
	})

	it('keeps a function handler when the href does not resolve, warning only about the href', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const handler = jest.fn()
		expect(headerActionAsLink({ id: 'js-bad', label: 'JS', href: 'apps/js-bad', handler })).toEqual({ id: 'js-bad', label: 'JS', handler })
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('href "apps/js-bad"')
		warn.mockRestore()
	})

	it('resolves the children of a function-handler entry, without touching the input', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const child = { id: 'sub', label: 'Sub', href: '/apps/sub' }
		const entry = { id: 'js-parent', label: 'JS', href: '/index.php/apps/x', handler: () => {}, children: [child] }
		const out = headerActionAsLink(entry)
		expect(out).toEqual({ id: 'js-parent', label: 'JS', href: '/nc/index.php/apps/x', target: '_self', children: [{ id: 'sub', label: 'Sub', href: '/nc/index.php/apps/sub', target: '_self' }] })
		expect(entry.children[0]).toBe(child)
		expect(child.href).toBe('/apps/sub')
		warn.mockRestore()
	})

	it('resolves href, drops the handler and opens in place unless target is _blank', () => {
		expect(headerActionAsLink({ id: 'add', label: 'Add', href: '/apps/integriq/connections', handler: 'x' }))
			.toEqual({ id: 'add', label: 'Add', href: '/nc/index.php/apps/integriq/connections', target: '_self' })
		expect(headerActionAsLink({ id: 'docs', label: 'Docs', href: 'https://example.org', target: '_blank' }))
			.toEqual({ id: 'docs', label: 'Docs', href: 'https://example.org', target: '_blank' })
	})

	it('drops an unusable href with one warning per value, leaving an entry without a link or handler', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(headerActionAsLink({ id: 'bad', label: 'Bad', href: 'javascript:void(0)', handler: 'x' })).toEqual({ id: 'bad', label: 'Bad' })
		headerActionAsLink({ id: 'bad', label: 'Bad', href: 'javascript:void(0)' })
		expect(warn).toHaveBeenCalledTimes(1)
		headerActionAsLink({ id: 'other', label: 'Other', href: 'apps/other' })
		expect(warn).toHaveBeenCalledTimes(2)
		warn.mockRestore()
	})

	it('resolves the href of a child, and keeps an entry with nothing to resolve identical', () => {
		const plain = { id: 'more', label: 'More', children: [{ id: 'a', label: 'A', handler: 'a' }] }
		expect(headerActionAsLink(plain)).toBe(plain)
		const parent = { id: 'more', label: 'More', handler: 'more', children: [{ id: 'docs', label: 'Docs', href: '/apps/x' }] }
		expect(headerActionAsLink(parent)).toEqual({
			id: 'more',
			label: 'More',
			handler: 'more',
			children: [{ id: 'docs', label: 'Docs', href: '/nc/index.php/apps/x', target: '_self' }],
		})
	})
})
