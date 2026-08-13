/**
 * Regression: CnSettingsWidgetMount must RENDER its dynamic widget under
 * Vue 3 (the Vue-2 `render(h)` signature crashed with "h is not a function")
 * and still bubble the child's events as a single `widget-event`. Backs the
 * built-in `version-info` / `register-mapping` settings widgets.
 */
const { mount } = require('@vue/test-utils')
const CnSettingsWidgetMount = require('../../src/components/CnSettingsPage/CnSettingsWidgetMount.js').default

const Child = {
	name: 'Child',
	props: { appName: { type: String, default: '' } },
	emits: ['save'],
	template: '<div class="child">{{ appName }}<button class="b" @click="$emit(\'save\', 42)">s</button></div>',
}

describe('CnSettingsWidgetMount (Vue 3)', () => {
	it('renders the dynamic component body (no "h is not a function" crash)', () => {
		const wrapper = mount(CnSettingsWidgetMount, {
			props: { component: Child, componentProps: { appName: 'OpenConnector' }, widgetType: 'version-info', sectionIndex: 0, widgetIndex: 0 },
		})
		expect(wrapper.find('.child').exists()).toBe(true)
		expect(wrapper.text()).toContain('OpenConnector')
	})

	it('bubbles the child event as widget-event with the manifest path', async () => {
		const wrapper = mount(CnSettingsWidgetMount, {
			props: { component: Child, componentProps: {}, widgetType: 'register-mapping', sectionIndex: 2, widgetIndex: 3 },
		})
		await wrapper.find('button.b').trigger('click')
		const evs = wrapper.emitted('widget-event')
		expect(evs).toBeTruthy()
		expect(evs[0][0]).toMatchObject({ widgetType: 'register-mapping', sectionIndex: 2, widgetIndex: 3, name: 'save', args: [42] })
	})
})
