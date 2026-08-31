/**
 * Tests for CnDashboardPage widget-title and countLabel localisation.
 *
 * The contract this file pins:
 *
 *   - a widget's manifest-authored `title` is a SOURCE STRING, so it resolves
 *     against the host app's catalogue through the injected `cnTranslate`, the
 *     same way the page title already did;
 *   - a `customTitle`, whether per-widget-def or per-placement, is NOT
 *     translated. A person typed it into the style editor in their own words,
 *     so looking it up in a translation table is wrong, and a miss would be
 *     indistinguishable from a hit;
 *   - `countLabel` ("0 cases") is manifest prose and localises like the title.
 *
 * Measured 2026-08-30 on a Dutch zaakafhandelapp account: the nav labels read
 * "Zaken" and "Relaties" while the dashboard beside them still read "Open
 * cases", "Persons" and "0 cases" — with "Open cases": "Openstaande zaken"
 * already sitting in that app's nl.json. The strings were translated; the
 * dashboard just never asked.
 */

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

// `jest.mock` is hoisted above the imports by babel-jest, so declaring it
// after them is safe and keeps import/first satisfied.
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

// A consumer catalogue, exactly the shape an app's own bound `t()` has: it
// knows that app's manifest strings and nothing else. Anything absent falls
// through unchanged, which is what makes assertion 2 meaningful.
const dict = {
	'Open cases': 'Openstaande zaken',
	Persons: 'Personen',
	cases: 'zaken',
}
const cnTranslate = (key) => dict[key] ?? key

const stubs = {
	CnDashboardGrid: {
		template: `
			<div class="cn-dashboard-grid-stub">
				<div v-for="item in layout" :key="item.id" class="cn-dashboard-grid-stub__item" :data-widget-id="item.widgetId">
					<slot name="widget" :item="item" />
				</div>
			</div>
		`,
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: {
		template: '<div class="cn-widget-wrapper-stub" :data-title="title"><slot /></div>',
		props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor'],
	},
	CnStatsBlockWidget: {
		template: '<div class="cn-stats-block-stub" :data-title="title" :data-count-label="countLabel" />',
		props: ['title', 'countLabel', 'variant', 'showZeroCount', 'horizontal', 'route', 'iconClass', 'entries', 'dataSource'],
	},
	CnWidgetRenderer: { template: '<div class="cn-widget-renderer-stub" />', props: ['widget', 'unavailableText'] },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

const layout = [{ id: 1, widgetId: 'w1', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }]

/**
 * Mount the dashboard with one widget.
 *
 * @param {object} widget The single widget definition, id 'w1'.
 * @param {object|undefined} extraItem Extra keys merged onto the layout item.
 * @param {boolean} withCatalogue Whether to inject the Dutch catalogue.
 * @return {object} The mounted wrapper.
 */
function mountOne(widget, extraItem = {}, withCatalogue = true) {
	return mount(CnDashboardPage, {
		props: { widgets: [{ id: 'w1', ...widget }], layout: [{ ...layout[0], ...extraItem }] },
		global: {
			stubs,
			provide: withCatalogue ? { cnTranslate } : undefined,
		},
	})
}

describe('CnDashboardPage — widget title localisation', () => {
	it('runs a manifest-authored widget title through the host catalogue', () => {
		const wrapper = mountOne({ title: 'Open cases', type: 'unknown-type' })
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-title')).toBe('Openstaande zaken')
	})

	it('leaves the title alone when the host provides no catalogue', () => {
		const wrapper = mountOne({ title: 'Open cases', type: 'unknown-type' }, {}, false)
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-title')).toBe('Open cases')
	})

	it('passes a title with no catalogue entry through unchanged', () => {
		const wrapper = mountOne({ title: 'Some untranslated widget', type: 'unknown-type' })
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-title')).toBe('Some untranslated widget')
	})

	it('does NOT translate a customTitle on the widget definition', () => {
		// 'Persons' IS in the catalogue. If customTitle were translated this
		// would come back 'Personen', which is precisely the bug: a string the
		// user typed themselves must not be looked up.
		const wrapper = mountOne({ title: 'Open cases', customTitle: 'Persons', type: 'unknown-type' })
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-title')).toBe('Persons')
	})

	it('does NOT translate a per-placement customTitle', () => {
		const wrapper = mountOne({ title: 'Open cases', type: 'unknown-type' }, { customTitle: 'Persons' })
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-title')).toBe('Persons')
	})

	it('falls back to the widget id when there is no title at all', () => {
		const wrapper = mountOne({ type: 'unknown-type' })
		expect(wrapper.find('.cn-widget-wrapper-stub').attributes('data-title')).toBe('w1')
	})
})

describe('CnDashboardPage — stats-block countLabel localisation', () => {
	it('translates both the title and the countLabel', () => {
		const wrapper = mountOne({
			title: 'Open cases',
			type: 'stats-block',
			props: { countLabel: 'cases' },
		})
		const el = wrapper.find('.cn-stats-block-stub')
		expect(el.exists()).toBe(true)
		expect(el.attributes('data-title')).toBe('Openstaande zaken')
		expect(el.attributes('data-count-label')).toBe('zaken')
	})

	it('passes an untranslated countLabel through unchanged', () => {
		const wrapper = mountOne({
			title: 'Open cases',
			type: 'stats-block',
			props: { countLabel: 'widgets' },
		})
		expect(wrapper.find('.cn-stats-block-stub').attributes('data-count-label')).toBe('widgets')
	})
})
