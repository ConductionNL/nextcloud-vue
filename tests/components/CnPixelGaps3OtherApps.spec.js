/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Gaps the other-apps lane found on the pipelinq, decidiq, learniq and
 * launchpad dashboards: a list column's second line, the stacked bar's empty
 * state, a stacked stats block and a greeting kicker prefix. Each first test
 * is today's output without the key.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-list-widget-keeps-a-columns-second-line
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-stacked-bar-says-it-is-empty-with-the-designed-empty-state
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-stats-block-can-take-the-stacked-board-look
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-greeting-kicker-can-carry-a-prefix
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'
import CnStackedBarWidget from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'
import CnStatsBlock from '../../src/components/CnStatsBlock/CnStatsBlock.vue'
import CnWidgetEmptyState from '../../src/components/CnWidgetEmptyState/CnWidgetEmptyState.vue'

describe('CnObjectListWidget: secondary', () => {
	const columnsOf = (column) => {
		const w = shallowMount(CnObjectListWidget, {
			propsData: { content: { register: 'r', schema: 'ticket', columns: [column] } },
			stubs: { CnDataTable: true, CnFormDialog: true },
			mocks: { t: (_app, s) => s },
		})
		return w.vm.resolvedColumns
	}

	it('resolves a column without secondary as before', () => {
		expect(columnsOf({ key: 'title' })[0].secondary).toBeUndefined()
	})

	it('passes secondary through to the table', () => {
		expect(columnsOf({ key: 'title', secondary: '{customer} · {channel}' })[0].secondary).toBe('{customer} · {channel}')
	})
})

describe('CnStackedBarWidget: empty state', () => {
	it('shows a compact designed empty state with the empty text', () => {
		const w = mount(CnStackedBarWidget, { propsData: { content: { segments: [{ label: 'Phone', value: 0 }], emptyText: 'No contact yet today' } } })
		const empty = w.findComponent(CnWidgetEmptyState)
		expect(empty.exists()).toBe(true)
		expect(empty.props('compact')).toBe(true)
		expect(w.find('[data-testid="cn-stacked-bar-empty"]').text()).toContain('No contact yet today')
	})
})

describe('CnStatsBlock: layout stacked', () => {
	const Icon = { template: '<svg />' }

	it('keeps the horizontal KPI card with its icon without layout', () => {
		const w = mount(CnStatsBlock, { propsData: { title: 'Active decisions', count: 7, icon: Icon } })
		expect(w.classes()).toContain('cn-kpi-card--horizontal')
		expect(w.classes()).not.toContain('cn-kpi-card--stacked')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(true)
	})

	it('takes the stacked look and drops the icon with layout: stacked', () => {
		const w = mount(CnStatsBlock, { propsData: { title: 'Active decisions', count: 7, icon: Icon, layout: 'stacked' } })
		expect(w.classes()).toContain('cn-kpi-card--stacked')
		expect(w.classes()).not.toContain('cn-kpi-card--horizontal')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(false)
	})
})

describe('CnHeaderWidget: kicker prefix', () => {
	const dateOf = (content) => mount(CnHeaderWidget, {
		propsData: { content, now: new Date('2026-10-05T14:00:00') },
		global: { mocks: { $route: { name: 'Dashboard' } } },
	}).find('[data-testid="cn-header-widget-date"]')

	it('shows only the date without a kicker', () => {
		const line = dateOf({ greeting: true, showDate: true })
		expect(line.text()).not.toContain('·')
		expect(line.text()).toMatch(/2026/)
	})

	it('prefixes the date with the kicker', () => {
		const line = dateOf({ greeting: true, showDate: true, kicker: 'Klantcontact' })
		expect(line.text()).toMatch(/^Klantcontact · .*2026/)
	})

	it('shows the kicker alone without showDate', () => {
		expect(dateOf({ greeting: true, kicker: 'Klantcontact' }).text()).toBe('Klantcontact')
	})
})
