/**
 * The click on an object in the Related widget travels up through the
 * TEMPLATE wiring: the widget emits `select-object`, CnDetailWidgetHost
 * forwards it (from the widget itself and from a registry widget that nests a
 * host, such as a Tabs widget), CnDetailPage re-emits it as
 * `related-object-click`, and CnPageRenderer opens the object's detail page.
 * Every test here fires the child's event, so a listener typo in a template
 * turns it red.
 */
import { mount, shallowMount } from '@vue/test-utils'
import { h, nextTick } from 'vue'

const CnDetailWidgetHost = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const CnTabsWidget = require('../../src/components/CnTabsWidget/CnTabsWidget.vue').default
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default
const CnWidgetGrid = require('../../src/components/CnWidgetGrid/CnWidgetGrid.vue').default

const raw = { '@self': { id: 'org-9', register: '20', schema: '33' }, name: 'Vendor' }

describe('related-object click forwarding through the templates', () => {
	it('CnDetailWidgetHost re-emits the Related widget select-object', () => {
		const wrapper = shallowMount(CnDetailWidgetHost, {
			propsData: { widget: { id: 'rel', type: 'related', title: 'Related' }, objectId: 'app-1', object: { id: 'app-1' } },
		})
		const related = wrapper.findComponent({ name: 'CnRelatedObjectsWidget' })
		expect(related.exists()).toBe(true)
		related.vm.$emit('select-object', raw)
		expect(wrapper.emitted('select-object')).toEqual([[raw]])
	})

	it('CnDetailWidgetHost re-emits select-object from a registry widget that nests a host', () => {
		// A registry renderer standing in for CnTabsWidget: it re-emits what
		// its own nested host would.
		const NestingWidget = { name: 'NestingWidget', emits: ['select-object'], render: () => h('div') }
		const wrapper = shallowMount(CnDetailWidgetHost, {
			propsData: {
				widget: { id: 'tabs', type: 'tabs', title: 'Tabs', content: {} },
				objectId: 'app-1',
				object: { id: 'app-1' },
				cnRegistry: { tabs: { component: NestingWidget } },
			},
		})
		const nested = wrapper.findComponent(NestingWidget)
		expect(nested.exists()).toBe(true)
		nested.vm.$emit('select-object', raw)
		expect(wrapper.emitted('select-object')).toEqual([[raw]])
	})

	it('CnTabsWidget re-emits select-object from the host inside a tab', async () => {
		const wrapper = mount(CnTabsWidget, {
			props: {
				content: { tabs: [{ widgetId: 'w-rel' }] },
				availableWidgets: [{ id: 'w-rel', type: 'related', title: 'Related' }],
				objectId: 'app-1',
				register: 'stackiq',
				schema: 'module',
			},
			global: {
				stubs: {
					CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], emits: ['select-object'], template: '<div class="host">{{ widget.id }}</div>' },
				},
			},
		})
		await nextTick()
		const host = wrapper.findComponent({ name: 'CnDetailWidgetHost' })
		expect(host.exists()).toBe(true)
		host.vm.$emit('select-object', raw)
		expect(wrapper.emitted('select-object')).toEqual([[raw]])
	})

	it('CnDetailPage re-emits a host select-object as related-object-click', () => {
		// The header-card host is the one mount outside the body grid, so a
		// stubbed grid does not hide it; all three mounts bind the same listener.
		const wrapper = mount(CnDetailPage, {
			propsData: {
				title: 'Application',
				objectId: 'app-1',
				object: { id: 'app-1' },
				headerCard: true,
				headerWidget: 'rel',
				widgets: [{ id: 'rel', type: 'related', title: 'Related' }],
				layout: [{ id: '1', widgetId: 'rel', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
			},
			global: {
				stubs: {
					CnDashboardGrid: { template: '<div class="grid" />' },
					CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget', 'chrome'], emits: ['select-object'], template: '<div class="host" />' },
				},
			},
			mocks: { t: (_a, s) => s, $route: { params: { id: 'app-1' }, query: {}, name: 'ModuleDetail' }, $router: { push: jest.fn(), replace: jest.fn() } },
		})
		const hosts = wrapper.findAllComponents({ name: 'CnDetailWidgetHost' })
		expect(hosts.length).toBeGreaterThan(0)
		hosts.at(0).vm.$emit('select-object', raw)
		expect(wrapper.emitted('related-object-click')).toEqual([[raw]])
		wrapper.unmount()
	})

	it('CnWidgetGrid re-emits select-object from a related widget it renders (v2 pages)', () => {
		const wrapper = shallowMount(CnWidgetGrid, {
			propsData: { slotName: 'body', widgets: [{ widgetKey: 'related', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 2 }] },
		})
		const related = wrapper.findComponent({ name: 'CnRelatedObjectsWidget' })
		expect(related.exists()).toBe(true)
		related.vm.$emit('select-object', raw)
		expect(wrapper.emitted('select-object')).toEqual([[raw]])
	})

	it('CnPageRenderer opens the object when a v2 page body grid emits select-object', async () => {
		const manifest = {
			$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			pages: [
				{ id: 'ModuleDetail', route: '/modules/:id', type: 'detail', title: 'Application', config: { register: '20', schema: 'module' }, widgets: [{ widgetKey: 'related', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }] },
				{ id: 'OrganisatieDetail', route: '/organisaties/:id', type: 'detail', title: 'Organisation', config: { register: '20', schema: '33' } },
			],
		}
		const push = jest.fn(() => Promise.resolve())
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest, pageTypes: { detail: { name: 'DetailStub', render: () => h('div') } } },
			mocks: { $route: { name: 'ModuleDetail', params: { id: 'app-1' } }, $router: { push } },
		})
		const grid = wrapper.findComponent({ name: 'CnWidgetGrid' })
		expect(grid.exists()).toBe(true)
		grid.vm.$emit('select-object', raw)
		await new Promise((resolve) => setTimeout(resolve))
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'OrganisatieDetail', params: expect.objectContaining({ id: 'org-9' }) }))
	})

	it('CnPageRenderer opens the object from a v2 page grid in a tab slot too', async () => {
		const manifest = {
			$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			pages: [
				{ id: 'ModuleDetail', route: '/modules/:id', type: 'detail', title: 'Application', config: { register: '20', schema: 'module' }, widgets: [{ widgetKey: 'related', slot: 'tab:links', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }] },
				{ id: 'OrganisatieDetail', route: '/organisaties/:id', type: 'detail', title: 'Organisation', config: { register: '20', schema: '33' } },
			],
		}
		const push = jest.fn(() => Promise.resolve())
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest, pageTypes: { detail: { name: 'DetailStub', render: () => h('div') } } },
			mocks: { $route: { name: 'ModuleDetail', params: { id: 'app-1' } }, $router: { push } },
		})
		const grids = wrapper.findAllComponents({ name: 'CnWidgetGrid' })
		const tabGrid = grids.filter((g) => g.props('slotName') === 'tab:links')
		expect(tabGrid.length).toBe(1)
		tabGrid[0].vm.$emit('select-object', raw)
		await new Promise((resolve) => setTimeout(resolve))
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'OrganisatieDetail', params: expect.objectContaining({ id: 'org-9' }) }))
	})

	it('CnPageRenderer opens the object when the detail page emits related-object-click', async () => {
		const manifest = {
			$schema: 'https://conduction.nl/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			pages: [
				{ id: 'ModuleDetail', route: '/modules/:id', type: 'detail', title: 'Application', config: { register: '20', schema: 'module' } },
				{ id: 'OrganisatieDetail', route: '/organisaties/:id', type: 'detail', title: 'Organisation', config: { register: '20', schema: '33' } },
			],
		}
		const DetailStub = { name: 'DetailStub', emits: ['related-object-click'], render: () => h('div') }
		const push = jest.fn(() => Promise.resolve())
		const wrapper = shallowMount(CnPageRenderer, {
			propsData: { manifest, pageTypes: { detail: DetailStub } },
			mocks: { $route: { name: 'ModuleDetail', params: { id: 'app-1' } }, $router: { push } },
		})
		const page = wrapper.findComponent(DetailStub)
		expect(page.exists()).toBe(true)
		page.vm.$emit('related-object-click', raw)
		await new Promise((resolve) => setTimeout(resolve))
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ name: 'OrganisatieDetail', params: expect.objectContaining({ id: 'org-9' }) }))
	})
})
