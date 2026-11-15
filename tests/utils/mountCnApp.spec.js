/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest app boots on CnAppRoot in one call (`mountCnApp`), with the
 * router built from the manifest's pages (larpinq larpinq-manifest-tier-4 2.1).
 *
 * @spec openspec/changes/mount-cn-app/specs/mount-cn-app/spec.md
 */
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}` }))
jest.mock('../../src/l10n/index.js', () => ({ __esModule: true, registerTranslations: jest.fn() }))

const mockRegisterIcons = jest.fn()
jest.mock('../../src/components/CnIcon/CnIcon.vue', () => ({ __esModule: true, default: { name: 'CnIcon', render: () => null }, registerIcons: (...a) => mockRegisterIcons(...a) }))

const { appRouterBase, mountCnApp, routesFromManifest } = require('../../src/utils/mountCnApp.js')
const { registerTranslations } = require('../../src/l10n/index.js')
const { createMemoryHistory, createRouter } = require('vue-router')

const MANIFEST = { pages: [{ id: 'Dashboard', route: '/' }, { id: 'Character', route: '/characters/:id' }, { id: 'broken' }] }

describe('routesFromManifest', () => {
	it('gives one named route per page, props on a parameterised one, and a catch-all', () => {
		const routes = routesFromManifest(MANIFEST)
		expect(routes.map((r) => [r.name, r.path, r.props])).toEqual([
			['Dashboard', '/', false],
			['Character', '/characters/:id', true],
			[undefined, '/:pathMatch(.*)*', undefined],
		])
		expect(routes[2].redirect).toBe('/')
		expect(routes[0].component).toBe(routes[1].component)
		expect(Object.isExtensible(routes[0].component)).toBe(true)
	})
})

describe('appRouterBase', () => {
	it('keeps the form of the path the reader arrived on, else generateUrl', () => {
		expect(appRouterBase('larpinq', '/index.php/apps/larpinq/characters/1')).toBe('/index.php/apps/larpinq')
		expect(appRouterBase('larpinq', '/apps/larpinq')).toBe('/apps/larpinq')
		expect(appRouterBase('larpinq', '/apps/larpinqx/a')).toBe('/index.php/apps/larpinq')
	})
})

describe('mountCnApp', () => {
	beforeEach(() => {
		document.body.innerHTML = '<div id="content"></div>'
		mockRegisterIcons.mockReset()
	})

	it('builds the router with the host factories and mounts the root with the manifest and registry', () => {
		const root = { name: 'Root', props: ['manifest', 'registry', 'pageTypes', 'appId', 'translate'], render() { return null } }
		const createWebHistory = jest.fn(() => createMemoryHistory())
		const plugin = { install: jest.fn() }
		const { app, router } = mountCnApp('#content', {
			appId: 'larpinq',
			manifest: MANIFEST,
			registry: { Map: { kind: 'widget' } },
			icons: { Sword: 'path' },
			vueRouter: { createRouter, createWebHistory },
			plugins: [plugin],
			rootComponent: root,
			rootProps: { translate: (s) => s },
		})
		expect(createWebHistory).toHaveBeenCalledWith('/index.php/apps/larpinq')
		expect(router.hasRoute('Character')).toBe(true)
		expect(plugin.install).toHaveBeenCalled()
		expect(mockRegisterIcons).toHaveBeenCalledWith({ Sword: 'path' })
		expect(registerTranslations).toHaveBeenCalled()
		const vm = app._instance.subTree.component.props
		expect(vm.appId).toBe('larpinq')
		expect(vm.registry).toEqual({ Map: { kind: 'widget' } })
		expect(typeof vm.translate).toBe('function')
		app.unmount()
	})

	it('takes a ready router, and refuses to start without an app id or a way to route', () => {
		const router = createRouter({ history: createMemoryHistory(), routes: routesFromManifest(MANIFEST) })
		const root = { render: () => null }
		const { app, router: used } = mountCnApp('#content', { appId: 'larpinq', manifest: MANIFEST, router, rootComponent: root })
		expect(used).toBe(router)
		app.unmount()
		expect(() => mountCnApp('#content', { manifest: MANIFEST })).toThrow('appId')
		expect(() => mountCnApp('#content', { appId: 'x', manifest: MANIFEST })).toThrow('vueRouter')
	})
})
