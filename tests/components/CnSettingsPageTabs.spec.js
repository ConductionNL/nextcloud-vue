/**
 * Tests for CnSettingsPage tabs orchestration + `component` widget
 * discriminator (REQ-MSO-* from manifest-settings-orchestration).
 *
 * Covers:
 *  - Tab strip renders one button per tab.
 *  - First tab is active by default.
 *  - `initialTab` selects the named tab on mount.
 *  - Clicking a tab activates it and emits `@tab-change`.
 *  - A tab's bare-fields section renders inputs (re-uses the flat renderer).
 *  - A tab's `widgets[]` with built-in `version-info` renders CnVersionInfoCard.
 *  - A tab's `widgets[]` with `{ type:"component", componentName:"X" }`
 *    resolves via customComponents.
 *  - Unknown `componentName` warns and skips without throwing.
 *  - Sibling widgets in the same section keep rendering after a miss.
 *  - The legacy `widgets[].type === "<custom-name>"` fallback path
 *    still works (REQ-MSO-6 last scenario / back-compat).
 */

import { mount } from '@vue/test-utils'
import CnSettingsPage from '@/components/CnSettingsPage/CnSettingsPage.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { put: jest.fn() },
}))

jest.mock('@nextcloud/l10n', () => ({
	translate: (_app, str) => str,
}))

jest.mock('@/components/CnVersionInfoCard/CnVersionInfoCard.vue', () => ({
	__esModule: true,
	default: {
		name: 'CnVersionInfoCard',
		props: ['appName', 'appVersion', 'showUpdateButton', 'isUpToDate'],
		render(h) {
			return h('div', {
				class: 'cn-version-info-card-stub',
				attrs: { 'data-app-name': this.appName },
			}, 'version-info')
		},
	},
}))

jest.mock('@/components/CnRegisterMapping/CnRegisterMapping.vue', () => ({
	__esModule: true,
	default: {
		name: 'CnRegisterMapping',
		props: ['name', 'groups', 'configuration', 'showReimportButton'],
		render(h) {
			return h('div', {
				class: 'cn-register-mapping-stub',
				attrs: { 'data-name': this.name },
			}, 'register-mapping')
		},
	},
}))

const stubs = {
	CnSettingsCard: {
		template: '<div class="cn-settings-card-stub"><slot /></div>',
		props: ['title', 'icon', 'collapsible'],
	},
	CnSettingsSection: {
		template: '<div class="cn-settings-section-stub"><slot /></div>',
		props: ['name', 'description', 'docUrl'],
	},
	CnPageHeader: {
		template: '<div class="cn-page-header-stub" />',
		props: ['title', 'description', 'icon'],
	},
}

const fieldsTabSection = {
	title: 'General settings',
	fields: [{ key: 'enabled', type: 'boolean', label: 'Enabled' }],
}

const builtinTabSection = {
	title: 'About',
	widgets: [{ type: 'version-info', props: { appName: 'Procest', appVersion: '0.1.0' } }],
}

describe('CnSettingsPage — tabs orchestration (REQ-MSO-*)', () => {
	let originalWarn

	beforeEach(() => {
		originalWarn = console.warn
		// eslint-disable-next-line no-console
		console.warn = jest.fn()
	})

	afterEach(() => {
		// eslint-disable-next-line no-console
		console.warn = originalWarn
		jest.clearAllMocks()
	})

	it('REQ-MSO-5: renders one tab button per tab', () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
			{ id: 'about', label: 'About', sections: [builtinTabSection] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { tabs }, stubs })
		const buttons = wrapper.findAll('.cn-settings-page__tab')
		expect(buttons.length).toBe(2)
		expect(buttons.at(0).text()).toBe('General')
		expect(buttons.at(1).text()).toBe('About')
	})

	it('REQ-MSO-5: first tab is active by default', () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
			{ id: 'about', label: 'About', sections: [builtinTabSection] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { tabs }, stubs })
		// The fields-tab section renders an input; the about-tab is hidden.
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(1)
		expect(wrapper.find('.cn-version-info-card-stub').exists()).toBe(false)
		// Active class on the first tab button.
		const buttons = wrapper.findAll('.cn-settings-page__tab')
		expect(buttons.at(0).classes()).toContain('cn-settings-page__tab--active')
		expect(buttons.at(1).classes()).not.toContain('cn-settings-page__tab--active')
	})

	it('REQ-MSO-5: initialTab selects the named tab on mount', () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
			{ id: 'about', label: 'About', sections: [builtinTabSection] },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { tabs, initialTab: 'about' },
			stubs,
		})
		expect(wrapper.find('.cn-version-info-card-stub').exists()).toBe(true)
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(0)
	})

	it('REQ-MSO-5: clicking a tab switches the active tab and emits @tab-change', async () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
			{ id: 'about', label: 'About', sections: [builtinTabSection] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { tabs }, stubs })
		const buttons = wrapper.findAll('.cn-settings-page__tab')
		await buttons.at(1).trigger('click')

		// About tab is now active — built-in widget renders, fields gone.
		expect(wrapper.find('.cn-version-info-card-stub').exists()).toBe(true)
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(0)

		const events = wrapper.emitted('tab-change') || []
		expect(events.length).toBe(1)
		expect(events[0][0]).toEqual({ tabId: 'about', tabIndex: 1 })
	})

	it('REQ-MSO-5: clicking the already-active tab does not re-emit @tab-change', async () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { tabs }, stubs })
		await wrapper.find('.cn-settings-page__tab').trigger('click')
		expect(wrapper.emitted('tab-change')).toBeUndefined()
	})

	it('REQ-MSO-5: a tab\'s bare-fields section renders inputs', () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { tabs }, stubs })
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(1)
	})

	it('REQ-MSO-5: a tab\'s widgets[] with built-in version-info renders CnVersionInfoCard', () => {
		const tabs = [
			{ id: 'about', label: 'About', sections: [builtinTabSection] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { tabs }, stubs })
		const card = wrapper.find('.cn-version-info-card-stub')
		expect(card.exists()).toBe(true)
		expect(card.attributes('data-app-name')).toBe('Procest')
	})

	it('REQ-MSO-6: widgets[] {type:"component", componentName} resolves via customComponents', () => {
		const WorkflowEditor = {
			name: 'WorkflowEditor',
			props: ['schemaSlug'],
			render(h) {
				return h('div', {
					class: 'workflow-editor-stub',
					attrs: { 'data-schema': this.schemaSlug },
				}, 'workflow editor')
			},
		}
		const tabs = [
			{
				id: 'workflow',
				label: 'Workflow',
				sections: [{
					title: 'Workflow',
					widgets: [{
						type: 'component',
						componentName: 'WorkflowEditor',
						props: { schemaSlug: 'workflow' },
					}],
				}],
			},
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { tabs, customComponents: { WorkflowEditor } },
			stubs,
		})
		const editor = wrapper.find('.workflow-editor-stub')
		expect(editor.exists()).toBe(true)
		expect(editor.attributes('data-schema')).toBe('workflow')
	})

	it('REQ-MSO-6: unknown componentName warns and skips (does not throw)', () => {
		const tabs = [
			{
				id: 't',
				label: 'T',
				sections: [{
					title: 's',
					widgets: [{ type: 'component', componentName: 'NotRegistered' }],
				}],
			},
		]
		const mount2 = () => mount(CnSettingsPage, {
			propsData: { tabs, customComponents: {} },
			stubs,
		})
		expect(mount2).not.toThrow()
		// eslint-disable-next-line no-console
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('NotRegistered'),
		)
	})

	it('REQ-MSO-6: missing componentName on type:"component" warns and skips', () => {
		const tabs = [
			{
				id: 't',
				label: 'T',
				sections: [{
					title: 's',
					widgets: [{ type: 'component' }],
				}],
			},
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { tabs, customComponents: {} },
			stubs,
		})
		// No widget rendered, but the page didn't throw.
		expect(wrapper.exists()).toBe(true)
		// eslint-disable-next-line no-console
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('componentName'),
		)
	})

	it('REQ-MSO-6: sibling widgets keep rendering after a missed component lookup', () => {
		const SiblingPanel = {
			name: 'SiblingPanel',
			render(h) { return h('div', { class: 'sibling-panel-stub' }, 'sibling') },
		}
		const tabs = [
			{
				id: 't',
				label: 'T',
				sections: [{
					title: 's',
					widgets: [
						{ type: 'component', componentName: 'NotRegistered' },
						{ type: 'component', componentName: 'SiblingPanel' },
					],
				}],
			},
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { tabs, customComponents: { SiblingPanel } },
			stubs,
		})
		expect(wrapper.find('.sibling-panel-stub').exists()).toBe(true)
	})

	it('REQ-MSO-6: legacy widget.type === <custom-name> fallback still works', () => {
		// manifest-settings-rich-sections REQ-MSRS-2 path — kept for
		// back-compat. `WorkflowEditor` resolves directly via the
		// type string, not through the new discriminator.
		const WorkflowEditor = {
			name: 'WorkflowEditor',
			render(h) { return h('div', { class: 'legacy-workflow-stub' }, 'legacy') },
		}
		const sections = [{
			title: 'Workflow',
			widgets: [{ type: 'WorkflowEditor' }],
		}]
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections, customComponents: { WorkflowEditor } },
			stubs,
		})
		expect(wrapper.find('.legacy-workflow-stub').exists()).toBe(true)
	})

	it('REQ-MSO-7: page with flat sections[] (no tabs[]) does not render a tab strip', () => {
		const sections = [
			{ title: 'g', fields: [{ key: 'x', type: 'boolean', label: 'X' }] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		expect(wrapper.find('.cn-settings-page__tabs').exists()).toBe(false)
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(1)
	})

	it('REQ-MSO-5: unknown initialTab falls back to the first tab', () => {
		const tabs = [
			{ id: 'general', label: 'General', sections: [fieldsTabSection] },
			{ id: 'about', label: 'About', sections: [builtinTabSection] },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { tabs, initialTab: 'does-not-exist' },
			stubs,
		})
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(1)
		expect(wrapper.find('.cn-version-info-card-stub').exists()).toBe(false)
	})
})
