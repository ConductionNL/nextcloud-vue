/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Who draws the card around a KPI tile.
 *
 * The KPI card went flat in 2026-08-30's convergence, which moved the card
 * itself onto CnWidgetWrapper. That inverted two long-standing decisions:
 *
 *  1. `stats-block` used to render WITHOUT a wrapper, because CnStatsBlock
 *     drew its own bordered box and wrapping it made a double card. A flat
 *     block with no wrapper has NO chrome at all, so it is wrapped now.
 *  2. Registered widgets keep their card unless the author explicitly removes
 *     it (`registryWidgetBorderless`). `widgetBorderless` derives "no header"
 *     ⇒ "no card", and card widgets are exactly the ones that default to
 *     headerless, so that derivation would take the box away from the tiles
 *     that now depend on it. Headerless is not chromeless.
 *
 * Both are the kind of change that a passing suite would not have noticed:
 * the pre-existing borderless spec mounts a `type: 'custom'` widget, which is
 * not a card, and the stats-block spec stubs the wrapper as a pass-through.
 *
 * The registry branch never bound `borderless` at all before this change, so
 * an explicit `borderless: true` on a stat/delta placement was silently
 * ignored. It is honoured now; the default (keep the card) is unchanged.
 */

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
// The widget types self-register into the shared registry on import. Without
// these, `stat` / `delta` resolve to no renderer and the page falls through to
// its unknown-widget branch, which would make every assertion below vacuous.
import '@/components/CnStatWidget/index.js'
import '@/components/CnDeltaWidget/index.js'
import '@/components/CnWidgetGrid/registerDashboardWidgets.js'

const stubs = {
	CnDashboardGrid: {
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
		template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>',
	},
	CnWidgetWrapper: {
		props: ['flush', 'showTitle', 'showActions', 'title', 'borderless'],
		template: '<div class="ww" :data-borderless="String(borderless)" :data-show-title="String(showTitle)"><slot /></div>',
	},
	CnStatsBlockWidget: { template: '<div class="sbw" />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const mountWith = (type, placement = {}) => mount(CnDashboardPage, {
	propsData: {
		widgets: [{ id: 'w', type, title: 'Open cases' }],
		layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2, ...placement }],
	},
	stubs,
})

describe('CnDashboardPage — who draws the KPI card', () => {
	it('wraps a stats-block, so a flat block still has chrome', () => {
		const w = mountWith('stats-block')
		expect(w.find('.ww').exists()).toBe(true)
		expect(w.find('.sbw').exists()).toBe(true)
	})

	it('gives a stats-block no wrapper header, so its title is not shown twice', () => {
		// CnStatsBlock renders the title itself. A wrapper header would repeat it.
		expect(mountWith('stats-block').find('.ww').attributes('data-show-title')).toBe('false')
	})

	it.each(['stat', 'delta', 'stats-block'])('keeps the card on a headerless %s widget', (type) => {
		// The tile is flat, so borderless here would leave the KPI floating on
		// the page background with no box at all.
		expect(mountWith(type).find('.ww').attributes('data-borderless')).toBe('false')
		expect(mountWith(type, { showTitle: false }).find('.ww').attributes('data-borderless')).toBe('false')
	})

	it('still lets an author take the card away explicitly', () => {
		// `borderless: true` is the documented escape hatch and must still win
		// over the card-widget rule above.
		expect(mountWith('stat', { borderless: true }).find('.ww').attributes('data-borderless')).toBe('true')
	})

	it('forwards a stats-block look declared in the manifest', () => {
		// `vertical` / `filled` are the library's own defaults, so a manifest
		// rarely needs them — but a manifest that sets them must reach the
		// component. They were absent from getStatsBlockProps' allowlist, which
		// would have made every such declaration a silent no-op: present in the
		// JSON, reading like configuration, changing nothing.
		const w = mount(CnDashboardPage, {
			propsData: {
				widgets: [{
					id: 'w',
					type: 'stats-block',
					title: 'Cases',
					content: { props: { vertical: true, filled: true, variant: 'success' } },
				}],
				layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 }],
			},
			stubs,
		})

		const out = w.vm.getStatsBlockProps({ widgetId: 'w' })
		expect(out.vertical).toBe(true)
		expect(out.filled).toBe(true)
		// The pre-existing allowlist entries still come through.
		expect(out.variant).toBe('success')
	})

	it('leaves a custom-slot widget on the historical derivation', () => {
		// A custom widget draws its own surface; "no header" still means "no card"
		// there. Only the REGISTERED widgets moved off that derivation.
		const mountCustom = (placement = {}) => mount(CnDashboardPage, {
			propsData: {
				widgets: [{ id: 'w', type: 'custom', title: 'Quota' }],
				layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2, ...placement }],
			},
			slots: { 'widget-w': '<div class="mine" />' },
			stubs,
		})
		expect(mountCustom({ showTitle: false }).find('.ww').attributes('data-borderless')).toBe('true')
		expect(mountCustom().find('.ww').attributes('data-borderless')).toBe('false')
	})
})
