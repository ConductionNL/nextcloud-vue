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
		{
			id: 'cases-map',
			route: '/map',
			type: 'map',
			title: 'app.map',
			config: { center: [52.13, 5.29], zoom: 7, layers: [] },
		},
		{
			id: 'wiki-article',
			route: '/articles/:id',
			type: 'wiki',
			title: 'app.article',
			config: { register: 'pipelinq', schema: 'article' },
		},
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

function mountRenderer(routeName, {
	useProps = false,
	customComponents = defaultRegistry(),
	manifest = sampleManifest,
} = {}) {
	const provide = useProps
		? {}
		: {
			cnManifest: manifest,
			cnCustomComponents: customComponents,
			cnTranslate: (k) => k,
		}
	const propsData = useProps
		? {
			manifest,
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

		it('returns an async component wrapper for type=wiki (manifest-wiki-page-type)', () => {
			const wrapper = mountRenderer('wiki-article')
			const component = wrapper.vm.resolvedComponent
			expect(component).not.toBeNull()
			// defineAsyncComponent wrapper — function or object, never a
			// custom-registry stub fallback.
			expect(['function', 'object']).toContain(typeof component)
			expect(component).not.toBe(SettingsPageStub)
			// Wiki pages get their config (register/schema) spread as props.
			expect(wrapper.vm.resolvedProps).toMatchObject({
				register: 'pipelinq',
				schema: 'article',
			})
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

		it('returns an async component wrapper for type=map', () => {
			// REQ-MMW-* — manifest-map-widget — type=map resolves to CnMapPage
			const wrapper = mountRenderer('cases-map')
			expect(wrapper.vm.resolvedComponent).not.toBeNull()
			expect(['function', 'object']).toContain(typeof wrapper.vm.resolvedComponent)
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

		it('resolves type=custom pages from the v2 cnRegistry (kind:"page") with precedence over legacy customComponents', () => {
			// ADR-036 — the v2 `registry` prop ({ key: { kind, component }})
			// MUST be honoured by CnPageRenderer for kind:"page" entries so
			// fleet apps can migrate off the deprecated `customComponents`
			// prop without losing page-dispatch.
			const RegistryStub = {
				name: 'RegistryStub',
				template: '<section data-stub="registry-page" />',
			}
			const LegacyStub = {
				name: 'LegacyStub',
				template: '<section data-stub="legacy" />',
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: sampleManifest,
					// Legacy map has the same name — registry MUST win.
					cnCustomComponents: { SettingsPage: LegacyStub },
					cnRegistry: { SettingsPage: { kind: 'page', component: RegistryStub } },
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'settings' } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(RegistryStub)
			expect(wrapper.vm.resolvedComponent).not.toBe(LegacyStub)
		})

		it('renders a type=custom page authored with slots.main (no component) as the page body from the v2 registry (kind:"page")', () => {
			// procest pattern — a custom page declared purely via
			// `slots: { main: "DeelzaakList" }` with NO top-level
			// `component`. `slots.main` MUST be promoted to the page body
			// and resolved against the v2 registry (kind:"page").
			const BodyStub = {
				name: 'BodyStub',
				template: '<section data-stub="slots-main-body" />',
			}
			const slotsMainManifest = {
				version: '1.0.0',
				pages: [
					{
						id: 'deelzaak-list',
						route: '/cases/:id/deelzaken',
						type: 'custom',
						title: 'Sub-cases',
						slots: { main: 'DeelzaakList' },
					},
				],
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: slotsMainManifest,
					cnRegistry: { DeelzaakList: { kind: 'page', component: BodyStub } },
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'deelzaak-list', params: {} } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(BodyStub)
			// The promoted `main` entry must NOT also appear as a named slot.
			expect(wrapper.vm.resolvedSlotEntries.find((e) => e.name === 'main')).toBeUndefined()
			expect(wrapper.findComponent(BodyStub).exists()).toBe(true)
		})

		it('still renders slots.main via the legacy customComponents map when the registry is silent', () => {
			const BodyStub = { name: 'LegacyBodyStub', template: '<section data-stub="legacy-main" />' }
			const slotsMainManifest = {
				version: '1.0.0',
				pages: [
					{ id: 'deelzaak-list', route: '/x', type: 'custom', title: 'Sub-cases', slots: { main: 'DeelzaakList' } },
				],
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: slotsMainManifest,
					cnCustomComponents: { DeelzaakList: BodyStub },
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'deelzaak-list', params: {} } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(BodyStub)
		})

		it('still prefers an explicit page.component over slots.main on a custom page', () => {
			const ComponentStub = { name: 'ExplicitStub', template: '<section data-stub="explicit" />' }
			const MainStub = { name: 'MainStub', template: '<section data-stub="main" />' }
			const m = {
				version: '1.0.0',
				pages: [
					{ id: 'p', route: '/p', type: 'custom', title: 'P', component: 'Explicit', slots: { main: 'Main' } },
				],
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: m,
					cnRegistry: {
						Explicit: { kind: 'page', component: ComponentStub },
						Main: { kind: 'page', component: MainStub },
					},
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'p', params: {} } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(ComponentStub)
			// With an explicit component, slots.main behaves as a normal named slot.
			expect(wrapper.vm.resolvedSlotEntries.find((e) => e.name === 'main')?.component).toBe(MainStub)
		})

		it('keys the v2-branch page component by currentPage.id so a route change re-mounts it', () => {
			// Regression guard: the v2 render branch MUST carry
			// :key="currentPage.id" on the resolved page component. Without it
			// Vue reuses the same instance across route changes and the page
			// keeps showing stale data / fetches / sidebar (this bug has
			// regressed twice — the v1 branch kept its key, the v2 branch lost it).
			const PageStub = {
				name: 'PageStub',
				template: '<section data-stub="v2-page" />',
			}
			const v2Manifest = {
				$schema: 'https://example.test/app-manifest-v2.schema.json',
				pages: [
					{ id: 'leads', route: '/leads', type: 'custom', title: 'Leads', component: 'LeadsPage' },
					{ id: 'clients', route: '/clients', type: 'custom', title: 'Clients', component: 'ClientsPage' },
				],
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: v2Manifest,
					cnRegistry: {
						LeadsPage: { kind: 'page', component: PageStub },
						ClientsPage: { kind: 'page', component: PageStub },
					},
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'leads' } },
			})
			expect(wrapper.vm.isV2Manifest).toBe(true)
			const page = wrapper.findComponent(PageStub)
			expect(page.exists()).toBe(true)
			expect(page.vm.$vnode.key).toBe('leads')
		})

		it('falls back to legacy customComponents when the v2 registry has no kind:"page" entry for the name', () => {
			// ADR-036 backward-compat — until every fleet app migrates,
			// CnPageRenderer MUST still resolve names from the legacy
			// `customComponents` prop / inject when the v2 registry is
			// silent on that name.
			const LegacyStub = {
				name: 'LegacyStub',
				template: '<section data-stub="legacy" />',
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: sampleManifest,
					cnCustomComponents: { SettingsPage: LegacyStub },
					// Registry has an unrelated widget entry; no page kind for SettingsPage.
					cnRegistry: { SomeWidget: { kind: 'widget', component: {} } },
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'settings' } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(LegacyStub)
		})

		it('ignores v2 registry entries whose kind is not "page" when resolving a page component', () => {
			// Only kind:"page" entries should be a source of truth for
			// CnPageRenderer's page dispatch — a kind:"widget" entry must
			// NOT shadow the legacy customComponents map.
			const LegacyStub = {
				name: 'LegacyStub',
				template: '<section data-stub="legacy" />',
			}
			const WidgetEntry = {
				name: 'WidgetEntry',
				template: '<section data-stub="widget" />',
			}
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: sampleManifest,
					cnCustomComponents: { SettingsPage: LegacyStub },
					cnRegistry: {
						SettingsPage: { kind: 'widget', component: WidgetEntry, defaultSize: { w: 2, h: 2 } },
					},
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'settings' } },
			})
			expect(wrapper.vm.resolvedComponent).toBe(LegacyStub)
			expect(wrapper.vm.resolvedComponent).not.toBe(WidgetEntry)
		})

		it('resolves non-page registry kinds (widget/section/actions) for slot-override names', () => {
			// Slot overrides (page.slots, page.actionsComponent,
			// page.config.sections[].component) are kind-agnostic — any
			// registry entry with a `component` field wins. This lets
			// consumers fully migrate off customComponents by parking
			// dashboard widgets / settings sections / action menus in
			// `registry.js` with semantic kinds (widget/section/actions).
			const WidgetStub = { name: 'WidgetStub', template: '<div data-stub="widget" />' }
			const ActionsStub = { name: 'ActionsStub', template: '<div data-stub="actions" />' }
			const manifest = {
				version: '1.0.0',
				menu: [],
				pages: [
					{
						id: 'dash',
						route: '/dash',
						type: 'custom',
						title: 'Dashboard',
						component: 'DashboardPage',
						actionsComponent: 'DashboardActions',
					},
				],
			}
			const DashboardPage = { name: 'DashboardPage', template: '<div data-stub="page" />' }
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: {},
				provide: {
					cnManifest: manifest,
					cnRegistry: {
						DashboardPage: { kind: 'page', component: DashboardPage },
						DashboardActions: { kind: 'actions', component: ActionsStub },
						SomeWidget: { kind: 'widget', component: WidgetStub },
					},
					cnTranslate: (k) => k,
				},
				mocks: { $route: { name: 'dash' } },
			})
			// page dispatch still uses kind:"page" (DashboardPage).
			expect(wrapper.vm.resolvedComponent).toBe(DashboardPage)
			// actionsComponent slot resolves kind:"actions" — kind-agnostic.
			expect(wrapper.vm.actionsOverride).toBe(ActionsStub)
		})
	})

	describe('config forwarding', () => {
		it('forwards page.config + top-level page.title as resolvedProps', () => {
			const wrapper = mountRenderer('home')
			// schema v2: page.title is lifted to top-level (sibling of
			// config) so every page type can declare it without
			// per-type schema branches. The renderer forwards top-level
			// page fields alongside config.
			expect(wrapper.vm.resolvedProps).toEqual({
				...sampleManifest.pages[0].config,
				title: 'app.home',
			})
		})

		it('still forwards the top-level title when a page has no config', () => {
			const wrapper = mountRenderer('home-detail')
			expect(wrapper.vm.resolvedProps).toEqual({ title: 'app.detail' })
		})

		it('forwards page.widgets (top-level uniform widget placement array)', () => {
			const widgets = [
				{ widgetKey: 'data', slot: 'sidebar', tabGroup: 'overview', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 1 },
			]
			const sidebarTabs = [{ id: 'overview', label: 'Overview' }]
			const manifest = {
				version: '1.0.0',
				menu: [],
				pages: [{
					id: 'detail-with-widgets',
					route: '/x/:id',
					type: 'detail',
					title: 'app.x',
					config: { register: 'r', schema: 's', sidebarTabs },
					widgets,
				}],
			}
			const wrapper = mountRenderer('detail-with-widgets', { manifest })
			expect(wrapper.vm.resolvedProps).toMatchObject({
				title: 'app.x',
				register: 'r',
				schema: 's',
				sidebarTabs,
				widgets,
			})
		})

		it('type=detail maps config.schema → objectType and params.id → objectId for sidebar gating', () => {
			// CnDetailPage.syncSidebarState gates the external
			// CnObjectSidebar on `objectType` + `objectId` props.
			// The manifest declares `config.schema` and `:id` route
			// param. The renderer bridges the names so the host's
			// CnObjectSidebar can mount without consumer-side aliasing.
			const manifest = {
				version: '1.0.0',
				menu: [],
				pages: [{
					id: 'client-detail',
					route: '/clients/:id',
					type: 'detail',
					title: 'app.client',
					config: { register: 'r', schema: 'client' },
				}],
			}
			const wrapper = shallowMount(CnPageRenderer, {
				provide: { cnManifest: manifest, cnCustomComponents: {}, cnTranslate: (k) => k },
				mocks: { $route: { name: 'client-detail', params: { id: 'abc-123' } } },
			})
			expect(wrapper.vm.resolvedProps).toMatchObject({
				schema: 'client',
				objectType: 'client',
				id: 'abc-123',
				objectId: 'abc-123',
			})
		})

		it('type=detail does not overwrite explicit objectType or objectId', () => {
			const manifest = {
				version: '1.0.0',
				menu: [],
				pages: [{
					id: 'explicit-detail',
					route: '/things/:id',
					type: 'detail',
					title: 'app.t',
					config: { register: 'r', schema: 'thingSlug', objectType: 'thingExplicit' },
				}],
			}
			const wrapper = shallowMount(CnPageRenderer, {
				provide: { cnManifest: manifest, cnCustomComponents: {}, cnTranslate: (k) => k },
				mocks: { $route: { name: 'explicit-detail', params: { id: 'abc', objectId: 'xyz' } } },
			})
			expect(wrapper.vm.resolvedProps.objectType).toBe('thingExplicit')
			expect(wrapper.vm.resolvedProps.objectId).toBe('xyz')
		})

		it('type=detail does not mutate the live $route.params object', () => {
			const manifest = {
				version: '1.0.0',
				menu: [],
				pages: [{
					id: 'mut-detail',
					route: '/x/:id',
					type: 'detail',
					title: 'app.x',
					config: { schema: 's' },
				}],
			}
			const liveParams = { id: 'abc' }
			const wrapper = shallowMount(CnPageRenderer, {
				provide: { cnManifest: manifest, cnCustomComponents: {}, cnTranslate: (k) => k },
				mocks: { $route: { name: 'mut-detail', params: liveParams } },
			})
			// Touch resolvedProps to trigger the mapping.
			expect(wrapper.vm.resolvedProps.objectId).toBe('abc')
			// $route.params must NOT now carry the synthesised alias.
			expect(liveParams).not.toHaveProperty('objectId')
		})

		it('config keys override top-level page keys when both are set (per-route override beats default)', () => {
			const manifest = {
				version: '1.0.0',
				menu: [],
				pages: [{
					id: 'title-override',
					route: '/o',
					type: 'index',
					title: 'page.default',
					config: { title: 'page.override', schema: { name: 's' }, columns: [] },
				}],
			}
			const wrapper = mountRenderer('title-override', { manifest })
			expect(wrapper.vm.resolvedProps.title).toBe('page.override')
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

	describe('config.readOnly:true shorthand (REQ-MIPFU-4)', () => {
		// Stub the index page type so the dispatched component is a
		// no-op `<div />` — keeps CnIndexPage's setup (which needs
		// pinia) out of the picture; we only assert on `resolvedProps`.
		const IndexStub = { name: 'IndexStub', template: '<div class="index-stub" />' }
		const readOnlyPageTypes = { index: IndexStub }

		const readOnlyManifest = {
			version: '1.0.0',
			menu: [],
			pages: [
				{
					id: 'reports',
					route: '/reports',
					type: 'index',
					title: 'app.reports',
					config: { register: 'x', schema: 'report', readOnly: true },
				},
				{
					id: 'reports-overridden',
					route: '/reports-overridden',
					type: 'index',
					title: 'app.reports',
					config: { register: 'x', schema: 'report', readOnly: true, showAdd: true },
				},
				{
					id: 'reports-rw',
					route: '/reports-rw',
					type: 'index',
					title: 'app.reports',
					config: { register: 'x', schema: 'report' },
				},
			],
		}

		it('expands to the nine read-only flags', () => {
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: readOnlyManifest, pageTypes: readOnlyPageTypes },
				mocks: { $route: { name: 'reports', params: {} } },
			})
			const props = wrapper.vm.resolvedProps
			expect(props.selectable).toBe(false)
			expect(props.showAdd).toBe(false)
			expect(props.showFormDialog).toBe(false)
			expect(props.showEditAction).toBe(false)
			expect(props.showCopyAction).toBe(false)
			expect(props.showDeleteAction).toBe(false)
			expect(props.showMassImport).toBe(false)
			expect(props.showMassCopy).toBe(false)
			expect(props.showMassDelete).toBe(false)
			expect(props.readOnly).toBeUndefined()
		})

		it('an explicit config.showAdd:true overrides the shorthand', () => {
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: readOnlyManifest, pageTypes: readOnlyPageTypes },
				mocks: { $route: { name: 'reports-overridden', params: {} } },
			})
			const props = wrapper.vm.resolvedProps
			expect(props.showAdd).toBe(true)
			expect(props.showEditAction).toBe(false)
			expect(props.selectable).toBe(false)
		})

		it('readOnly omitted leaves resolvedProps as the plain config', () => {
			const wrapper = shallowMount(CnPageRenderer, {
				propsData: { manifest: readOnlyManifest, pageTypes: readOnlyPageTypes },
				mocks: { $route: { name: 'reports-rw', params: {} } },
			})
			const props = wrapper.vm.resolvedProps
			expect(props.showAdd).toBeUndefined()
			expect(props.selectable).toBeUndefined()
			expect(props.register).toBe('x')
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

	describe('listener + attribute forwarding (B1)', () => {
		// Drive emits / inspect props via findComponent + vm rather than
		// rendered DOM. shallowMount stubs the dispatched component's
		// template, but the component instance + its $emit / $attrs /
		// resolved props are still observable through the wrapper.
		const EmittingPage = {
			name: 'EmittingPage',
			inheritAttrs: false,
			props: ['title'],
			template: '<div class="emitting-stub" />',
		}
		const emittingManifest = {
			version: '1.0.0',
			menu: [],
			pages: [
				{
					id: 'emitter',
					route: '/emitter',
					type: 'custom',
					title: 'Decisions',
					component: 'EmittingPage',
					config: { title: 'Decisions' },
				},
			],
		}

		const mountEmitter = (extra = {}) => shallowMount(CnPageRenderer, {
			provide: {
				cnManifest: emittingManifest,
				cnCustomComponents: { EmittingPage },
				cnTranslate: (k) => k,
			},
			mocks: { $route: { name: 'emitter', params: {} } },
			...extra,
		})

		it('forwards listeners so dispatched-page emits reach the host', () => {
			const onWidgetAction = jest.fn()
			const wrapper = mountEmitter({ listeners: { 'widget-action': onWidgetAction } })
			const page = wrapper.findComponent(EmittingPage)
			expect(page.exists()).toBe(true)
			page.vm.$emit('widget-action', { widgetId: 'foo' })
			expect(onWidgetAction).toHaveBeenCalledWith({ widgetId: 'foo' })
		})

		it('forwards $attrs to the dispatched page component', () => {
			const wrapper = mountEmitter({ attrs: { 'host-context': 'meeting-room' } })
			const page = wrapper.findComponent(EmittingPage)
			expect(page.vm.$attrs['host-context']).toBe('meeting-room')
		})

		it('does NOT leak forwarded $attrs onto the wrapping cn-page-renderer div (inheritAttrs: false)', () => {
			const wrapper = mountEmitter({ attrs: { 'host-context': 'meeting-room' } })
			expect(wrapper.find('.cn-page-renderer').attributes('host-context')).toBeUndefined()
		})

		it('resolvedProps still wins over $attrs on key collisions', () => {
			const wrapper = mountEmitter({ attrs: { title: 'Overridden' } })
			const page = wrapper.findComponent(EmittingPage)
			// manifest config.title = "Decisions"; $attrs.title would be
			// "Overridden". Object spread `{ ...$attrs, ...resolvedProps }`
			// makes resolvedProps win — the page receives "Decisions".
			expect(page.props('title')).toBe('Decisions')
		})
	})
})
