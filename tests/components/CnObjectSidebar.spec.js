/**
 * Tests for CnObjectSidebar — manifest-driven open-enum tabs.
 *
 * Covers REQ-MAS-2 / REQ-MAS-3 / REQ-MAS-4 from the
 * manifest-abstract-sidebar spec — the new `tabs` prop that replaces
 * the hard-coded built-in tab set with a consumer-supplied array,
 * resolving each tab's content via either a built-in widget registry
 * (`data` → CnObjectDataWidget, `metadata` → CnObjectMetadataWidget)
 * or a custom-component registry. When `tabs` is unset the legacy
 * built-in tabs render unchanged.
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnObjectSidebar from '../../src/components/CnObjectSidebar/CnObjectSidebar.vue'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import CnObjectMetadataWidget from '../../src/components/CnObjectMetadataWidget/CnObjectMetadataWidget.vue'

const baseProps = {
	objectType: 'lead',
	objectId: 'abc-123',
	register: 'sales',
	schema: 'lead',
	apiBase: '/apps/openregister/api',
}

const MyCustomTab = {
	name: 'MyCustomTab',
	props: ['objectId', 'objectType', 'register', 'schema', 'apiBase'],
	template: '<div class="my-custom-tab">{{ objectId }}</div>',
}

const MyCustomWidget = {
	name: 'MyCustomWidget',
	props: ['objectId', 'register', 'schema', 'apiBase'],
	template: '<div class="my-custom-widget">{{ objectId }}</div>',
}

function mountSidebar(extra = {}, mountOptions = {}) {
	return mount(CnObjectSidebar, {
		propsData: { ...baseProps, ...extra },
		stubs: {
			// Stub the heavy built-in tabs so the legacy branch stays cheap.
			CnFilesTab: true,
			CnNotesTab: true,
			CnTagsTab: true,
			CnTasksTab: true,
			CnAuditTrailTab: true,
			// Widget components are NOT stubbed — we want to assert they
			// resolve correctly when the open-enum branch is active.
			...mountOptions.stubs,
		},
		...mountOptions,
	})
}

describe('CnObjectSidebar — built-in tab set (legacy branch)', () => {
	it('renders all built-in tabs when `tabs` is unset', () => {
		const wrapper = mountSidebar()
		const html = wrapper.html()
		// NcAppSidebarTab is a stub — its `id` attribute survives via v-bind.
		expect(html).toContain('id="files"')
		expect(html).toContain('id="notes"')
		expect(html).toContain('id="tags"')
		expect(html).toContain('id="tasks"')
		expect(html).toContain('id="auditTrail"')
	})

	it('respects the hiddenTabs prop in the legacy branch', () => {
		const wrapper = mountSidebar({ hiddenTabs: ['notes', 'tags'] })
		const html = wrapper.html()
		expect(html).toContain('id="files"')
		expect(html).not.toContain('id="notes"')
		expect(html).not.toContain('id="tags"')
		expect(html).toContain('id="tasks"')
	})

	it('does NOT mount any open-enum tabs when `tabs` is unset', () => {
		const wrapper = mountSidebar()
		expect(wrapper.vm.hasCustomTabs).toBe(false)
	})
})

describe('CnObjectSidebar — open-enum tabs (custom branch)', () => {
	it('renders custom tabs and DOES NOT render built-in tabs', () => {
		const wrapper = mountSidebar({
			tabs: [
				{ id: 'overview', label: 'Overview', widgets: [{ type: 'data', props: { schema: { properties: {} }, objectData: {} } }] },
				{ id: 'meta', label: 'Meta', widgets: [{ type: 'metadata', props: { objectData: {} } }] },
			],
		})
		const html = wrapper.html()
		expect(html).toContain('id="overview"')
		expect(html).toContain('id="meta"')
		// Built-ins MUST NOT render.
		expect(html).not.toContain('id="files"')
		expect(html).not.toContain('id="notes"')
		expect(html).not.toContain('id="tags"')
		expect(html).not.toContain('id="tasks"')
		expect(html).not.toContain('id="auditTrail"')
	})

	it('resolves type:"data" → CnObjectDataWidget', () => {
		const wrapper = mountSidebar({
			tabs: [{ id: 'overview', label: 'Overview', widgets: [{ type: 'data' }] }],
		})
		expect(wrapper.findComponent(CnObjectDataWidget).exists()).toBe(true)
	})

	it('resolves type:"metadata" → CnObjectMetadataWidget', () => {
		// CnObjectMetadataWidget requires objectData; pass it through per-widget props.
		const wrapper = mountSidebar({
			tabs: [{
				id: 'meta',
				label: 'Meta',
				widgets: [{ type: 'metadata', props: { objectData: { '@self': { id: 'abc-123' } } } }],
			}],
		})
		expect(wrapper.findComponent(CnObjectMetadataWidget).exists()).toBe(true)
	})

	it('forwards shared object context (objectId, register, schema, apiBase) to widgets', () => {
		const wrapper = mountSidebar({
			tabs: [{
				id: 'meta',
				label: 'Meta',
				widgets: [{ type: 'metadata', props: { objectData: {} } }],
			}],
		})
		const w = wrapper.findComponent(CnObjectMetadataWidget)
		// CnObjectMetadataWidget doesn't declare these as props but they
		// are still passed; assert by reading $attrs (Vue 2 behaviour).
		expect(w.vm.$attrs.objectId).toBe('abc-123')
		expect(w.vm.$attrs.register).toBe('sales')
		expect(w.vm.$attrs.schema).toBe('lead')
		expect(w.vm.$attrs.apiBase).toBe('/apps/openregister/api')
	})

	it('per-widget props override shared context', () => {
		const wrapper = mountSidebar({
			tabs: [{
				id: 'meta',
				label: 'Meta',
				widgets: [{ type: 'metadata', props: { objectData: {}, apiBase: '/override' } }],
			}],
		})
		// apiBase isn't a declared prop on CnObjectMetadataWidget — test via $attrs.
		expect(wrapper.findComponent(CnObjectMetadataWidget).vm.$attrs.apiBase).toBe('/override')
	})

	it('falls back to customComponents for unknown widget types', () => {
		const wrapper = mountSidebar({
			tabs: [{ id: 't', label: 'T', widgets: [{ type: 'my-custom' }] }],
			customComponents: { 'my-custom': MyCustomWidget },
		})
		expect(wrapper.findComponent(MyCustomWidget).exists()).toBe(true)
	})

	it('logs a console.warn when a widget type is unresolved', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mountSidebar({
			tabs: [{ id: 't', label: 'T', widgets: [{ type: 'nonexistent' }] }],
		})
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('nonexistent'))
		warn.mockRestore()
	})

	it('skips unresolved widgets but still renders the tab', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountSidebar({
			tabs: [{ id: 't', label: 'T', widgets: [{ type: 'nonexistent' }] }],
		})
		expect(wrapper.html()).toContain('id="t"')
		warn.mockRestore()
	})

	it('resolves a tab.component from the customComponents prop', () => {
		const wrapper = mountSidebar({
			tabs: [{ id: 'related', label: 'Related', component: 'MyCustomTab' }],
			customComponents: { MyCustomTab },
		})
		expect(wrapper.findComponent(MyCustomTab).exists()).toBe(true)
	})

	it('forwards shared object context to a tab component', () => {
		const wrapper = mountSidebar({
			tabs: [{ id: 'related', label: 'Related', component: 'MyCustomTab' }],
			customComponents: { MyCustomTab },
		})
		const c = wrapper.findComponent(MyCustomTab)
		expect(c.props('objectId')).toBe('abc-123')
		expect(c.props('register')).toBe('sales')
		expect(c.props('schema')).toBe('lead')
	})

	it('falls back to injected cnCustomComponents when prop is unset', () => {
		const wrapper = mountSidebar(
			{
				tabs: [{ id: 'r', label: 'R', component: 'MyCustomTab' }],
			},
			{ provide: { cnCustomComponents: { MyCustomTab } } },
		)
		expect(wrapper.findComponent(MyCustomTab).exists()).toBe(true)
	})

	it('warns when both widgets and component are set on the same tab; component wins', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountSidebar({
			tabs: [{
				id: 'mixed',
				label: 'Mixed',
				widgets: [{ type: 'data' }],
				component: 'MyCustomTab',
			}],
			customComponents: { MyCustomTab },
		})
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('both widgets[] and component'))
		expect(wrapper.findComponent(MyCustomTab).exists()).toBe(true)
		expect(wrapper.findComponent(CnObjectDataWidget).exists()).toBe(false)
		warn.mockRestore()
	})

	it('warns and renders a placeholder when a tab.component is unresolved', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountSidebar({
			tabs: [{ id: 'gone', label: 'Gone', component: 'NotInRegistry' }],
		})
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('NotInRegistry'))
		// Tab must still render even with the missing component.
		expect(wrapper.html()).toContain('id="gone"')
		warn.mockRestore()
	})

	it('initial activeTab equals tabs[0].id', () => {
		const wrapper = mountSidebar({
			tabs: [
				{ id: 'first', label: 'First', component: 'MyCustomTab' },
				{ id: 'second', label: 'Second', component: 'MyCustomTab' },
			],
			customComponents: { MyCustomTab },
		})
		expect(wrapper.vm.activeTab).toBe('first')
	})
})

describe('CnObjectSidebar — pluggable integration registry mode', () => {
	// CnObjectSidebar's setup() calls useIntegrationRegistry() with no
	// args, so it consumes the default singleton. Register on it and
	// reset between tests.
	const { integrations } = require('../../src/integrations/registry.js')

	// Use render-fn (not template:) components so `<component :is>`
	// resolves them without the runtime template compiler.
	const RegistryTab = {
		name: 'RegistryTab',
		props: ['objectId', 'objectType', 'register', 'schema', 'apiBase'],
		render() { return h('div', { class: 'registry-tab' }, String(this.objectId)) },
	}
	const RegistryWidget = { name: 'RegistryWidget', render() { return h('div', { class: 'registry-widget' }) } }

	function mountRegistrySidebar(extra = {}) {
		return mount(CnObjectSidebar, {
			propsData: { ...baseProps, useRegistry: true, ...extra },
			stubs: {
				CnFilesTab: true, CnNotesTab: true, CnTagsTab: true,
				CnTasksTab: true, CnAuditTrailTab: true,
			},
		})
	}

	afterEach(() => {
		integrations.__resetForTests()
	})

	it('renders one tab per registered provider when useRegistry is true', () => {
		integrations.register({ id: 'files', label: 'Files', order: 1, tab: RegistryTab, widget: RegistryWidget })
		integrations.register({ id: 'notes', label: 'Notes', order: 2, tab: RegistryTab, widget: RegistryWidget })
		const wrapper = mountRegistrySidebar()
		const html = wrapper.html()
		expect(html).toContain('id="files"')
		expect(html).toContain('id="notes"')
		expect(wrapper.findAll('.registry-tab').length).toBe(2)
		wrapper.destroy()
	})

	it('excludes providers listed in excludeIntegrations', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: RegistryWidget })
		integrations.register({ id: 'notes', label: 'Notes', tab: RegistryTab, widget: RegistryWidget })
		const wrapper = mountRegistrySidebar({ excludeIntegrations: ['notes'] })
		const html = wrapper.html()
		expect(html).toContain('id="files"')
		expect(html).not.toContain('id="notes"')
		wrapper.destroy()
	})

	it('also honours hiddenTabs for registry providers', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: RegistryWidget })
		integrations.register({ id: 'tags', label: 'Tags', tab: RegistryTab, widget: RegistryWidget })
		const wrapper = mountRegistrySidebar({ hiddenTabs: ['tags'] })
		expect(wrapper.html()).not.toContain('id="tags"')
		wrapper.destroy()
	})

	it('re-renders reactively when a late registration arrives', async () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: RegistryWidget })
		const wrapper = mountRegistrySidebar()
		expect(wrapper.findAll('.registry-tab').length).toBe(1)
		integrations.register({ id: 'late', label: 'Late', tab: RegistryTab, widget: RegistryWidget })
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.registry-tab').length).toBe(2)
		wrapper.destroy()
	})

	it('appends consumer-supplied tabs via the #extra-tabs slot', () => {
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: RegistryWidget })
		const wrapper = mount(CnObjectSidebar, {
			propsData: { ...baseProps, useRegistry: true },
			stubs: { CnFilesTab: true, CnNotesTab: true, CnTagsTab: true, CnTasksTab: true, CnAuditTrailTab: true },
			slots: { 'extra-tabs': '<div class="extra-tab">extra</div>' },
		})
		expect(wrapper.html()).toContain('extra-tab')
		expect(wrapper.findAll('.registry-tab').length).toBe(1)
		wrapper.destroy()
	})

	it('warns and falls back to `tabs` when both useRegistry and tabs are set', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		integrations.register({ id: 'files', label: 'Files', tab: RegistryTab, widget: RegistryWidget })
		const wrapper = mountRegistrySidebar({
			tabs: [{ id: 'manual', label: 'Manual', component: 'X' }],
			customComponents: { X: RegistryTab },
		})
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('falling back to `tabs`'))
		expect(wrapper.html()).toContain('id="manual"')
		expect(wrapper.html()).not.toContain('id="files"')
		warn.mockRestore()
		wrapper.destroy()
	})
})
