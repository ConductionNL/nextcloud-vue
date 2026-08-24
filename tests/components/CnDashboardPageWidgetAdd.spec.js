/**
 * Regression: a widget appended to the `widgets` prop array WHILE MOUNTED must
 * resolve on the next render.
 *
 * The in-app editor (CnBuildiqEditButton "Add widget…") appends IN PLACE to the
 * live manifest's `page.config.widgets` / `.layout` — it must, because
 * CnPageRenderer's `resolvedProps` does not re-derive when those keys are swapped
 * for new arrays, so a replaced array never reaches the page component at all.
 *
 * Widget lookup used to go through a cached `widgetMap` computed, which does not
 * subscribe to the prop array's observer — so an appended widget never entered the
 * map and its card rendered the `unavailableLabel` placeholder, titled with its raw
 * widget id, until the page was fully reloaded. Observed 2026-07-12 on the openbuild
 * `cowboy` builder: a `type:"stat"` widget added via Add widget… rendered "Widget not
 * available" even though the saved manifest was correct.
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

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
		props: ['title', 'iconUrl', 'iconClass', 'showTitle', 'borderless', 'flush', 'buttons', 'styleConfig', 'titleIconPosition', 'titleIconColor', 'showRefresh', 'showActions', 'documentationUrl'],
	},
	CnWidgetRenderer: { template: '<div class="cn-widget-renderer-stub" />', props: ['widget', 'unavailableText'] },
	CnTileWidget: { template: '<div class="cn-tile-widget-stub" />', props: ['tile'] },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div class="nc-empty-content-stub" />' },
	NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
}

/** A tile widget — a built-in type that renders without a registry lookup. */
const tile = (id) => ({ id, type: 'tile', title: `Tile ${id}`, linkType: 'app', linkValue: 'files' })
const place = (n, widgetId) => ({ id: n, widgetId, gridX: 0, gridY: (n - 1) * 3, gridWidth: 6, gridHeight: 3 })

describe('CnDashboardPage — widget appended after mount', () => {
	it('resolves a widget pushed onto the widgets prop array in place', async () => {
		// The parent owns the arrays; the editor mutates them in place.
		//
		// They must be REACTIVE, exactly as they are in the app: the manifest
		// lives in host-app reactive state, so `page.config.widgets.push(...)`
		// runs through a reactive proxy. Vue 2 made that automatic — `observe()`
		// walked the array the moment it became a prop value, so pushing to the
		// very array literal the spec declared notified the component's render
		// watcher. Vue 3 has no observer to attach: `reactive()` returns a
		// PROXY and only writes THROUGH that proxy call `trigger()`. Mutating
		// the raw target is invisible, so a plain array literal here would leave
		// the DOM at one card while `wrapper.vm.getWidgetDef('w-2')` — which
		// re-reads on call — already reported the new widget.
		const widgets = reactive([tile('w-1')])
		const layout = reactive([place(1, 'w-1')])

		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets, layout, unavailableLabel: 'Widget not available' },
			stubs,
		})

		expect(wrapper.text()).not.toContain('Widget not available')

		// "Add widget…" — append to the SAME arrays the component holds.
		widgets.push(tile('w-2'))
		layout.push(place(2, 'w-2'))
		await wrapper.vm.$nextTick()

		// The lookup must see the new definition, not a stale cached map.
		expect(wrapper.vm.getWidgetDef('w-2')).toMatchObject({ id: 'w-2', type: 'tile' })

		const cards = wrapper.findAll('.cn-dashboard-grid-stub__item')
		expect(cards.length).toBe(2)

		// The appended card must dispatch to the tile branch, not the
		// unknown-widget fallback.
		const added = cards.at(1)
		expect(added.text()).not.toContain('Widget not available')
		expect(added.find('.cn-tile-widget-stub').exists()).toBe(true)
		// A title falling back to the raw widget id is the tell-tale of an
		// unresolved definition — it must resolve to the widget's own title.
		expect(wrapper.vm.getWidgetTitle(layout[1])).toBe('Tile w-2')
	})

	it('resolves a widget when the widgets prop array is replaced', async () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets: [tile('w-1')], layout: [place(1, 'w-1')], unavailableLabel: 'Widget not available' },
			stubs,
		})

		await wrapper.setProps({
			widgets: [tile('w-1'), tile('w-2')],
			layout: [place(1, 'w-1'), place(2, 'w-2')],
		})

		expect(wrapper.vm.getWidgetDef('w-2')).toMatchObject({ id: 'w-2' })
		expect(wrapper.text()).not.toContain('Widget not available')
	})

	// Structural guard. The behavioural tests above pass even WITH the old
	// cached `widgetMap` computed: under @vue/test-utils the `widgets` array is
	// observed before the component's props are initialised, so Vue captures its
	// observer and a push invalidates the computed. In the real app the manifest
	// reaches CnDashboardPage through CnAppRoot → CnPageRenderer and that
	// observer is NOT captured, so the cached map went stale and never
	// recovered. Jest cannot reproduce that ordering — so pin the invariant
	// itself: widget lookup must never be a cached computed over the prop array.
	it('resolves widgets through a method, never a cached map computed', () => {
		expect(typeof CnDashboardPage.methods.getWidgetDef).toBe('function')
		expect(CnDashboardPage.computed.widgetMap).toBeUndefined()
	})

	it('still reports an unknown widgetId as unavailable', () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { widgets: [tile('w-1')], layout: [place(1, 'w-1'), place(2, 'ghost')], unavailableLabel: 'Widget not available' },
			stubs,
		})

		expect(wrapper.vm.getWidgetDef('ghost')).toBeNull()
		expect(wrapper.text()).toContain('Widget not available')
	})
})
