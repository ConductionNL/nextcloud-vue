/**
 * Tests for CnPageRenderer.
 *
 * Covers REQ-JMR-005 from the json-manifest-renderer spec — the core
 * type-dispatch logic. Slot-override behaviour (REQ-JMR-005 head/actions
 * scenarios) is covered in a follow-up commit alongside the
 * `headerComponent` / `actionsComponent` wiring.
 */

import { mount, shallowMount } from '@vue/test-utils'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const SettingsPageStub = {
	name: 'SettingsPageStub',
	template: '<div class="settings-stub">settings</div>',
}

const HeaderStub = { name: 'HeaderStub', template: '<div class="header-stub" />' }
const ActionsStub = { name: 'ActionsStub', template: '<div class="actions-stub" />' }
const CreateDialogStub = { name: 'CreateDialogStub', template: '<div class="create-dialog-stub" />' }
const FormFieldsStub = { name: 'FormFieldsStub', template: '<div class="form-fields-stub" />' }

const sampleManifest = {
	version: '1.0.0',
	menu: [],
	pages: [
		{ id: 'home', route: '/', type: 'index', title: 'app.home', config: { schema: { name: 's1' }, columns: [] } },
		{ id: 'home-detail', route: '/items/:id', type: 'detail', title: 'app.detail' },
		{ id: 'overview', route: '/overview', type: 'dashboard', title: 'app.overview' },
		{ id: 'settings', route: '/settings', type: 'custom', title: 'app.settings', component: 'SettingsPage' },
		{ id: 'broken', route: '/broken', type: 'custom', title: 'app.broken', component: 'NonExistent' },
		{
			id: 'home-with-header',
			route: '/with-header',
			type: 'index',
			title: 'app.home',
			headerComponent: 'MyHeader',
			actionsComponent: 'MyActions',
		},
		{
			id: 'home-bad-header',
			route: '/bad-header',
			type: 'index',
			title: 'app.home',
			headerComponent: 'NonExistent',
		},
		{
			id: 'home-with-slots',
			route: '/with-slots',
			type: 'index',
			title: 'app.home',
			slots: {
				'create-dialog': 'CreateDialog',
				'form-fields': 'FormFields',
			},
		},
		{
			id: 'home-mixed-overrides',
			route: '/mixed',
			type: 'index',
			title: 'app.home',
			headerComponent: 'MyHeader',
			actionsComponent: 'MyActions',
			slots: {
				'create-dialog': 'CreateDialog',
				header: 'CreateDialog',
			},
		},
		{
			id: 'home-bad-slot',
			route: '/bad-slot',
			type: 'index',
			title: 'app.home',
			slots: {
				'create-dialog': 'NonExistent',
			},
		},
		{
			id: 'public-survey',
			route: '/public/survey/:token',
			type: 'form',
			title: 'app.survey',
			config: {
				fields: [{ key: 'rating', type: 'number', label: 'Rating' }],
				submitHandler: 'submitSurvey',
				mode: 'public',
			},
		},
	],
}

const defaultRegistry = () => ({
	SettingsPage: SettingsPageStub,
	MyHeader: HeaderStub,
	MyActions: ActionsStub,
	CreateDialog: CreateDialogStub,
	FormFields: FormFieldsStub,
})

function mountRenderer(routeName, { useProps = false, customComponents = defaultRegistry() } = {}) {
	const provide = useProps
		? {}
		: {
				cnManifest: sampleManifest,
				cnCustomComponents: customComponents,
				cnTranslate: (k) => k,
			}
	const propsData = useProps
		? {
				manifest: sampleManifest,
				customComponents,
				translate: (k) => k,
			}
		: {}
	return shallowMount(CnPageRenderer, {
		propsData,
		provide,
		mocks: {
			$route: { name: routeName },
		},
	})
}

describe('CnPageRenderer', () => {
	let warnSpy

	beforeEach(() => {
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('route matching', () => {
		it('matches by $route.name === page.id and ignores route paths', () => {
			const wrapper = mountRenderer('home')
			expect(wrapper.vm.currentPage).toMatchObject({ id: 'home', type: 'index' })
			// data-page-id is on the wrapper div
			expect(wrapper.attributes('data-page-id')).toBe('home')
		})

		it('renders nothing when no page matches the route', () => {
			const wrapper = mountRenderer('does-not-exist')
			expect(wrapper.vm.currentPage).toBeNull()
			expect(wrapper.find('[data-page-id]').exists()).toBe(false)
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('No page found for $route.name = "does-not-exist"'),
			)
		})
	})

	describe('type dispatch', () => {
		it('returns an async component wrapper for type=index', () => {
			const wrapper = mountRenderer('home')
			const component = wrapper.vm.resolvedComponent
			expect(component).not.toBeNull()
			// defineAsyncComponent in Vue 2.7 returns either a function or
			// an object wrapping the loader; both are acceptable.
			expect(['function', 'object']).toContain(typeof component)
			// And it is NOT one of the synchronous stub registry components.
			expect(component).not.toBe(SettingsPageStub)
		})

		it('returns an async component wrapper for type=detail', () => {
			const wrapper = mountRenderer('home-detail')
			expect(wrapper.vm.resolvedComponent).not.toBeNull()
		})

		it('returns an async component wrapper for type=dashboard', () => {
			const wrapper = mountRenderer('overview')
			expect(wrapper.vm.resolvedComponent).not.toBeNull()
		})

		it('returns an async component wrapper for type=form (manifest-form-page-type)', () => {
			const wrapper = mountRenderer('public-survey')
			const component = wrapper.vm.resolvedComponent
			expect(component).not.toBeNull()
			expect(['function', 'object']).toContain(typeof component)
			// Form pages get their config spread as props by the renderer
			expect(wrapper.vm.resolvedProps).toMatchObject({
				submitHandler: 'submitSurvey',
				mode: 'public',
			})
		})

		it('renders the resolved custom component synchronously', () => {
			const wrapper = mountRenderer('settings')
			expect(wrapper.vm.resolvedComponent).toBe(SettingsPageStub)
			expect(wrapper.attributes('data-page-id')).toBe('settings')
		})

		it('logs a warning and renders an empty wrapper when a custom component is missing from the registry', () => {
			const wrapper = mountRenderer('broken', { customComponents: {} })
			expect(wrapper.vm.resolvedComponent).toBeNull()
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Custom component "NonExistent" not found in registry'),
			)
			// Wrapper still renders (page exists), but no inner content.
			expect(wrapper.attributes('data-page-id')).toBe('broken')
		})
	})

	describe('config forwarding', () => {
		it('forwards page.config as resolvedProps', () => {
			const wrapper = mountRenderer('home')
			expect(wrapper.vm.resolvedProps).toEqual(sampleManifest.pages[0].config)
		})

		it('returns an empty object when page has no config', () => {
			const wrapper = mountRenderer('home-detail')
			expect(wrapper.vm.resolvedProps).toEqual({})
		})
	})

	describe('devtools naming', () => {
		it('sets $options.name to CnPageRenderer:<id> in created()', () => {
			const wrapper = mountRenderer('home')
			expect(wrapper.vm.$options.name).toBe('CnPageRenderer:home')
		})

		it('keeps the original name when no page matches', () => {
			const wrapper = mountRenderer('missing')
			expect(wrapper.vm.$options.name).toBe('CnPageRenderer')
		})
	})

	describe('props vs inject precedence', () => {
		it('uses the manifest passed via prop when no inject is available', () => {
			const wrapper = mountRenderer('home', { useProps: true })
			expect(wrapper.vm.effectiveManifest).toEqual(sampleManifest)
			expect(wrapper.vm.currentPage.id).toBe('home')
		})

		it('uses customComponents prop for custom-type resolution when no inject is available', () => {
			const wrapper = mountRenderer('settings', { useProps: true })
			expect(wrapper.vm.resolvedComponent).toBe(SettingsPageStub)
		})

		it('falls back to inject when no manifest prop is given', () => {
			const wrapper = mount(CnPageRenderer, {
				provide: {
					cnManifest: sampleManifest,
					cnCustomComponents: { SettingsPage: SettingsPageStub },
				},
				mocks: { $route: { name: 'settings' } },
			})
			expect(wrapper.vm.effectiveManifest).toEqual(sampleManifest)
			expect(wrapper.vm.resolvedComponent).toBe(SettingsPageStub)
		})
	})

	describe('slot overrides (headerComponent / actionsComponent)', () => {
		it('resolves headerComponent and actionsComponent against the registry', () => {
			const wrapper = mountRenderer('home-with-header')
			expect(wrapper.vm.headerOverride).toBe(HeaderStub)
			expect(wrapper.vm.actionsOverride).toBe(ActionsStub)
		})

		it('returns null overrides when the page does not declare them', () => {
			const wrapper = mountRenderer('home')
			expect(wrapper.vm.headerOverride).toBeNull()
			expect(wrapper.vm.actionsOverride).toBeNull()
		})

		it('logs a warning when a referenced override component is missing from the registry', () => {
			const wrapper = mountRenderer('home-bad-header')
			expect(wrapper.vm.headerOverride).toBeNull()
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Slot-override component "NonExistent"'),
			)
		})
	})

	describe('extensible page-type registry', () => {
		const ReportPage = { name: 'ReportPage', template: '<div class="report-stub" />' }
		const reportManifest = {
			version: '1.0.0',
			menu: [],
			pages: [
				{ id: 'report', route: '/report', type: 'report', title: 'app.report' },
				{ id: 'unknown', route: '/x', type: 'mystery', title: 'app.x' },
			],
		}

		it('dispatches to a consumer-supplied page type via the pageTypes prop', () => {
			const wrapper = require('@vue/test-utils').shallowMount(CnPageRenderer, {
				propsData: {
					manifest: reportManifest,
					pageTypes: { report: ReportPage },
				},
				mocks: { $route: { name: 'report' } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(ReportPage)
		})

		it('warns and renders nothing for an unknown type, recommending the pageTypes registry', () => {
			const wrapper = require('@vue/test-utils').shallowMount(CnPageRenderer, {
				propsData: {
					manifest: reportManifest,
					pageTypes: { report: ReportPage },
				},
				mocks: { $route: { name: 'unknown' } },
			})
			expect(wrapper.vm.resolvedComponent).toBeNull()
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown page type "mystery"'))
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pageTypes registry'))
		})

		it('falls back to defaultPageTypes when no pageTypes prop or inject is given', () => {
			const wrapper = mountRenderer('home')
			// effectivePageTypes defaults to defaultPageTypes which contains
			// the seven built-ins: index, detail, dashboard, logs, settings,
			// chat, files. The resolved component for type:"index" is
			// therefore the defineAsyncComponent wrapper of CnIndexPage.
			expect(wrapper.vm.effectivePageTypes).toBeDefined()
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.index)
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.detail)
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.dashboard)
			// Phase-3 additions from manifest-page-type-extensions:
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.logs)
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.settings)
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.chat)
			expect(['function', 'object']).toContain(typeof wrapper.vm.effectivePageTypes.files)
		})
	})

	describe('generic slots map', () => {
		it('resolves every entry in pages[].slots into a {name, component} entry', () => {
			const wrapper = mountRenderer('home-with-slots')
			const entries = wrapper.vm.resolvedSlotEntries
			expect(entries).toHaveLength(2)
			expect(entries.find((e) => e.name === 'create-dialog').component).toBe(CreateDialogStub)
			expect(entries.find((e) => e.name === 'form-fields').component).toBe(FormFieldsStub)
		})

		it('combines `slots` map with the headerComponent / actionsComponent sugar fields', () => {
			const wrapper = mountRenderer('home-mixed-overrides')
			const entries = wrapper.vm.resolvedSlotEntries
			const byName = Object.fromEntries(entries.map((e) => [e.name, e.component]))
			// headerComponent ("MyHeader") wins over slots.header ("CreateDialog") because
			// the sugar fields are applied after the slots map.
			expect(byName.header).toBe(HeaderStub)
			expect(byName.actions).toBe(ActionsStub)
			expect(byName['create-dialog']).toBe(CreateDialogStub)
		})

		it('returns an empty array when page has no slot overrides', () => {
			const wrapper = mountRenderer('home')
			expect(wrapper.vm.resolvedSlotEntries).toEqual([])
		})

		it('skips and warns on a slot whose component is missing from the registry', () => {
			const wrapper = mountRenderer('home-bad-slot')
			expect(wrapper.vm.resolvedSlotEntries).toEqual([])
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('slot "create-dialog"'),
			)
		})
	})

	describe('defensive handling', () => {
		it('returns null currentPage when manifest is missing pages array', () => {
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: { version: '1.0.0', menu: [], pages: undefined } },
				mocks: { $route: { name: 'home' } },
			})
			expect(wrapper.vm.currentPage).toBeNull()
		})

		it('returns null currentPage when $route.name is missing', () => {
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: sampleManifest },
				mocks: { $route: {} },
			})
			expect(wrapper.vm.currentPage).toBeNull()
		})
	})
})
