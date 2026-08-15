/**
 * Tests for CnStatsBlockWidget's `iconClass` prop forwarding.
 *
 * Covers the "CnStatsBlockWidget icon class forwarding" requirement
 * added in the `manifest-icons-and-page-actions` change. The widget
 * wraps its CnStatsBlock primitive in a `<div>` that carries the
 * caller's `iconClass` (a Nextcloud core CSS class such as
 * `icon-link`, `icon-mail`, …) so manifest-driven dashboards can
 * decorate KPI tiles without needing an MDI dynamic-import path.
 */

import { mount } from '@vue/test-utils'
import CnStatsBlockWidget from '../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue'

// The widget's `setup()` uses `useDataSource` which performs a real
// fetch attempt; the dispatcher we're testing lives entirely above
// that, so stubbing it lets the test stay synchronous.
jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({ data: { count: 42 }, loading: false, error: null }),
}))

function mountWidget(extraProps = {}) {
	return mount(CnStatsBlockWidget, {
		propsData: {
			title: 'Sources',
			dataSource: { register: 'oc', schema: 'sources', aggregate: 'count' },
			...extraProps,
		},
		// CnStatsBlock is a thin primitive; stubbing it keeps the test
		// focused on the wrapper div + class binding.
		stubs: { CnStatsBlock: true },
	})
}

describe('CnStatsBlockWidget — iconClass forwarding', () => {
	it('renders a wrapping <div> with the `cn-stats-block-widget` class', () => {
		const wrapper = mountWidget()
		const root = wrapper.element
		expect(root.tagName).toBe('DIV')
		expect(root.classList.contains('cn-stats-block-widget')).toBe(true)
	})

	it('appends the provided iconClass to the wrapping <div>', () => {
		const wrapper = mountWidget({ iconClass: 'icon-link' })
		const root = wrapper.element
		expect(root.classList.contains('cn-stats-block-widget')).toBe(true)
		expect(root.classList.contains('icon-link')).toBe(true)
	})

	it('omits the icon class when iconClass is the default empty string', () => {
		const wrapper = mountWidget()
		const root = wrapper.element
		// The wrapper carries ONLY the base class plus the empty-string
		// fall-through (which Vue collapses, leaving classList length 1).
		expect(root.classList.length).toBe(1)
		expect(root.classList.contains('cn-stats-block-widget')).toBe(true)
	})

	it('supports multi-word NC core icon classes (e.g. icon-history)', () => {
		const wrapper = mountWidget({ iconClass: 'icon-history' })
		expect(wrapper.element.classList.contains('icon-history')).toBe(true)
	})

	it('declares iconClass as a String prop with default empty string', () => {
		const propDef = CnStatsBlockWidget.props.iconClass
		expect(propDef).toBeDefined()
		expect(propDef.type).toBe(String)
		expect(propDef.default).toBe('')
	})
})
