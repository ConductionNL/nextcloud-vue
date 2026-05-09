/**
 * Tests for CnSettingsPage rich-section flavors (REQ-MSRS-* from
 * manifest-settings-rich-sections).
 *
 * Covers:
 *  - Bare-fields back-compat sanity.
 *  - `component`-only section mounts the registered component.
 *  - `widgets`-only sections with built-ins (`version-info`,
 *    `register-mapping`).
 *  - `widgets`-only section falling back to customComponents for an
 *    unknown built-in name.
 *  - Mixed manifest: bare-fields + component + widgets all in one page.
 *  - Widget events bubble through `@widget-event`.
 *  - Unknown widget type warns + skips without throwing.
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

// Substitute the heavy built-in widget components for render-function
// stubs that we can identify in the rendered DOM and observe events on.
// CnSettingsPage imports them statically; mocking here replaces the
// modules globally for this test file.
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

// Stub the heavy CnSettingsCard / CnSettingsSection so we can focus on
// the dispatch logic. The built-in widget components (CnVersionInfoCard,
// CnRegisterMapping) are mocked at module level above so they don't
// need to be in the stubs map.
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

describe('CnSettingsPage — rich sections (REQ-MSRS-*)', () => {
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

	it('REQ-MSRS-5: bare fields[] section still renders inputs (back-compat)', () => {
		const sections = [
			{ title: 'g', fields: [{ key: 'enabled', type: 'boolean', label: 'Enabled' }] },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		// One settings card, one settings section wrapping the field list.
		expect(wrapper.findAll('.cn-settings-card-stub').length).toBe(1)
		expect(wrapper.findAll('.cn-settings-section-stub').length).toBe(1)
		expect(wrapper.findAll('.cn-settings-page__field').length).toBe(1)
	})

	it('REQ-MSRS-3: component-only section mounts the registered component with props', () => {
		const MyPanel = {
			name: 'MyPanel',
			props: ['foo'],
			render(h) {
				return h('div', { class: 'my-panel-stub', attrs: { 'data-foo': this.foo } }, 'my panel')
			},
		}
		const sections = [
			{ title: 'g', component: 'MyPanel', props: { foo: 'bar' } },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections, customComponents: { MyPanel } },
			stubs,
		})
		const panel = wrapper.find('.my-panel-stub')
		expect(panel.exists()).toBe(true)
		expect(panel.attributes('data-foo')).toBe('bar')
	})

	it('REQ-MSRS-2: widgets[] with built-in version-info renders CnVersionInfoCard', () => {
		const sections = [
			{
				title: 'g',
				widgets: [{ type: 'version-info', props: { appName: 'X', appVersion: '1' } }],
			},
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		const card = wrapper.find('.cn-version-info-card-stub')
		expect(card.exists()).toBe(true)
		expect(card.attributes('data-app-name')).toBe('X')
	})

	it('REQ-MSRS-2: widgets[] with built-in register-mapping renders CnRegisterMapping', () => {
		const sections = [
			{
				title: 'g',
				widgets: [{
					type: 'register-mapping',
					props: { name: 'Mappings', groups: [{ name: 'g', types: [{ slug: 's', label: 'S' }] }] },
				}],
			},
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		const m = wrapper.find('.cn-register-mapping-stub')
		expect(m.exists()).toBe(true)
		expect(m.attributes('data-name')).toBe('Mappings')
	})

	it('REQ-MSRS-2: widgets[] falls back to customComponents for an unknown built-in name', () => {
		const MyExtraPanel = {
			name: 'MyExtraPanel',
			props: ['label'],
			render(h) {
				return h('div', { class: 'my-extra-panel-stub', attrs: { 'data-label': this.label } }, 'extra')
			},
		}
		const sections = [
			{ title: 'g', widgets: [{ type: 'MyExtraPanel', props: { label: 'Extra' } }] },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections, customComponents: { MyExtraPanel } },
			stubs,
		})
		const panel = wrapper.find('.my-extra-panel-stub')
		expect(panel.exists()).toBe(true)
		expect(panel.attributes('data-label')).toBe('Extra')
	})

	it('renders all three flavors in one mixed manifest (bare-fields + component + widgets)', () => {
		const MyPanel = {
			name: 'MyPanel',
			render(h) {
				return h('div', { class: 'my-panel-mixed' }, 'mixed')
			},
		}
		const sections = [
			{ title: 'flat', fields: [{ key: 'x', type: 'string', label: 'X' }] },
			{ title: 'comp', component: 'MyPanel' },
			{ title: 'widg', widgets: [{ type: 'version-info', props: { appName: 'A', appVersion: '1' } }] },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections, customComponents: { MyPanel } },
			stubs,
		})
		expect(wrapper.findAll('.cn-settings-card-stub').length).toBe(3)
		expect(wrapper.find('.cn-settings-page__field').exists()).toBe(true)
		expect(wrapper.find('.my-panel-mixed').exists()).toBe(true)
		expect(wrapper.find('.cn-version-info-card-stub').exists()).toBe(true)
	})

	it('REQ-MSRS-4: widget event forwarded as @widget-event with payload', async () => {
		const sections = [
			{
				title: 'g',
				widgets: [{
					type: 'register-mapping',
					props: { name: 'Mappings', groups: [{ name: 'g', types: [{ slug: 's', label: 'S' }] }] },
				}],
			},
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		const widgetWrapper = wrapper.findComponent({ name: 'CnRegisterMapping' })
		expect(widgetWrapper.exists()).toBe(true)
		// Simulate the widget emitting an event (e.g. CnRegisterMapping's @save).
		widgetWrapper.vm.$emit('save', { register: '5', client_schema: '7' })
		await wrapper.vm.$nextTick()
		const events = wrapper.emitted('widget-event')
		expect(events).toBeTruthy()
		expect(events[0][0]).toEqual({
			widgetType: 'register-mapping',
			widgetIndex: 0,
			sectionIndex: 0,
			name: 'save',
			args: [{ register: '5', client_schema: '7' }],
		})
	})

	it('REQ-MSRS-2: unknown widget type warns and skips without throwing', () => {
		const sections = [
			{ title: 'g', widgets: [{ type: 'does-not-exist' }] },
		]
		expect(() => {
			mount(CnSettingsPage, { propsData: { sections }, stubs })
		}).not.toThrow()
		// eslint-disable-next-line no-console
		expect(console.warn).toHaveBeenCalled()
		// eslint-disable-next-line no-console
		const calls = console.warn.mock.calls.map((c) => c.join(' '))
		expect(calls.some((m) => m.includes('does-not-exist'))).toBe(true)
	})

	it('component-style section with missing registry name warns and skips', () => {
		const sections = [
			{ title: 'g', component: 'NotInRegistry' },
		]
		const wrapper = mount(CnSettingsPage, { propsData: { sections }, stubs })
		// The section card still renders (chrome stays); body is empty.
		expect(wrapper.findAll('.cn-settings-card-stub').length).toBe(1)
		// eslint-disable-next-line no-console
		expect(console.warn).toHaveBeenCalled()
	})

	it('explicit customComponents prop wins over the injected cnCustomComponents', () => {
		const FromInject = {
			name: 'FromInject',
			render(h) {
				return h('div', { class: 'from-inject' }, 'inject')
			},
		}
		const FromProp = {
			name: 'FromProp',
			render(h) {
				return h('div', { class: 'from-prop' }, 'prop')
			},
		}
		const sections = [
			{ title: 'g', component: 'X' },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections, customComponents: { X: FromProp } },
			provide: { cnCustomComponents: { X: FromInject } },
			stubs,
		})
		expect(wrapper.find('.from-prop').exists()).toBe(true)
		expect(wrapper.find('.from-inject').exists()).toBe(false)
	})

	it('falls back to cnCustomComponents inject when no explicit prop set', () => {
		const FromInject = {
			name: 'FromInject',
			render(h) {
				return h('div', { class: 'from-inject' }, 'inject')
			},
		}
		const sections = [
			{ title: 'g', component: 'X' },
		]
		const wrapper = mount(CnSettingsPage, {
			propsData: { sections },
			provide: { cnCustomComponents: { X: FromInject } },
			stubs,
		})
		expect(wrapper.find('.from-inject').exists()).toBe(true)
	})
})
