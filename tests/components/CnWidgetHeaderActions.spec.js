/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget's manifest `headerActions` reach the card that titles it: the
 * detail host resolves them and provides them, and the outermost
 * CnWidgetWrapper or CnDetailCard below it draws them in its title row. A
 * bare widget in a tab panel gets them in the panel's heading row.
 *
 * @spec openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-the-card-that-titles-a-widget-draws-its-header-actions
 */
import { mount } from '@vue/test-utils'
import { computed, h } from 'vue'
import CnDetailCard from '../../src/components/CnDetailCard/CnDetailCard.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import { WIDGET_HEADER_ACTIONS } from '../../src/utils/widgetHeaderActions.js'

const run = jest.fn()
const ACTIONS = [{ key: '0', label: 'Run flow', icon: 'Play', variant: 'secondary', run }]

beforeEach(() => run.mockReset())

describe('CnWidgetWrapper: provided header actions', () => {
	it('draws them in its title row and runs one on click', async () => {
		const w = mount(CnWidgetWrapper, {
			props: { title: 'Flows', showActions: false },
			global: { provide: { [WIDGET_HEADER_ACTIONS]: computed(() => ACTIONS) }, stubs: { CnIcon: true } },
		})
		const button = w.find('.cn-widget-wrapper__header [data-testid="cn-widget-header-action"]')
		expect(button.text()).toBe('Run flow')
		await button.trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
	})

	it('leaves them to the outermost card: a card inside it draws none', () => {
		const w = mount(CnWidgetWrapper, {
			props: { title: 'Outer', showActions: false },
			slots: { default: () => h(CnWidgetWrapper, { title: 'Inner', showActions: false }) },
			global: { provide: { [WIDGET_HEADER_ACTIONS]: ACTIONS }, stubs: { CnIcon: true } },
		})
		expect(w.findAll('[data-testid="cn-widget-header-action"]')).toHaveLength(1)
	})

	it('gives a title-less card a header for them', () => {
		const w = mount(CnWidgetWrapper, {
			props: { title: '', showTitle: false, showActions: false },
			global: { provide: { [WIDGET_HEADER_ACTIONS]: ACTIONS }, stubs: { CnIcon: true } },
		})
		expect(w.find('[data-testid="cn-widget-header-action"]').exists()).toBe(true)
	})
})

describe('CnDetailCard: provided header actions', () => {
	it('draws them on the right of its header', () => {
		const w = mount(CnDetailCard, {
			props: { title: 'Notes' },
			global: { provide: { [WIDGET_HEADER_ACTIONS]: ACTIONS }, stubs: { CnIcon: true } },
		})
		expect(w.find('.cn-detail-card__header-right [data-testid="cn-widget-header-action"]').text()).toBe('Run flow')
	})
})

describe('CnDetailWidgetHost: a widget\'s headerActions', () => {
	const WIDGET = {
		id: 'case-flow-runs',
		type: 'custom-flows',
		title: 'Flows',
		headerActions: [
			{ label: 'Run flow', icon: 'Play', action: { type: 'open-modal', target: 'CnActionDialog', props: { objectId: '@objectId' } } },
			{ label: 'Reopen', visibleWhen: { field: 'status', op: 'eq', value: 'closed' }, action: { type: 'navigate' } },
		],
	}
	const Consumer = { name: 'ConsumerFlows', render: () => h('div', { class: 'consumer' }) }

	/**
	 * @param {string} chrome The host chrome.
	 * @param {Function} dispatch The page dispatcher.
	 * @return {object} Wrapper.
	 */
	function mountHost(chrome, dispatch) {
		return mount(CnDetailWidgetHost, {
			props: { widget: WIDGET, chrome, surface: 'detail-page', objectId: 'c1', object: { id: 'c1', status: 'open' }, register: 'r', schema: 's', cnRegistry: { 'custom-flows': { component: Consumer, chrome: 'card' } } },
			global: { provide: { cnDispatchAction: dispatch }, stubs: { CnIcon: true } },
		})
	}

	it('draws the visible ones in the card it puts the widget in, dispatched with the record tokens', async () => {
		const dispatch = jest.fn()
		const w = mountHost('card', dispatch)
		const buttons = w.findAll('[data-testid="cn-widget-header-action"]')
		expect(buttons.map((b) => b.text())).toEqual(['Run flow'])
		await buttons[0].trigger('click')
		expect(dispatch).toHaveBeenCalledWith({ type: 'open-modal', target: 'CnActionDialog', props: { objectId: 'c1' } })
	})

	it('provides none in bare mode, where the tab panel draws them', () => {
		const w = mountHost('bare', jest.fn())
		expect(w.find('[data-testid="cn-widget-header-action"]').exists()).toBe(false)
	})
})

describe('CnTabsWidget: a bare panel\'s headerActions', () => {
	const ACTIONS_DEF = [{ label: 'Add note', icon: 'Plus', action: { type: 'open-modal', target: 'X', props: { id: '@objectId' } } }]

	/**
	 * @param {object} widget The panel widget.
	 * @param {Function} dispatch The page dispatcher.
	 * @return {Promise<object>} Wrapper.
	 */
	async function mountTabs(widget, dispatch) {
		const w = mount(CnTabsWidget, {
			props: { content: { tabs: [{ id: 'hist', label: 'History', widgetId: widget.id }] }, availableWidgets: [widget], objectId: 'c1', objectData: { id: 'c1' } },
			global: {
				provide: { cnDispatchAction: dispatch },
				stubs: { CnIcon: true, CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host" />' } },
			},
		})
		await w.vm.$nextTick()
		return w
	}

	it('draws them in the panel heading beside the title', async () => {
		const dispatch = jest.fn()
		const w = await mountTabs({ id: 'w-hist', type: 'audit', title: 'Case history', description: 'Newest first', headerActions: ACTIONS_DEF }, dispatch)
		const button = w.find('[data-testid="cn-tabs-widget-panel-heading"] [data-testid="cn-widget-header-action"]')
		expect(button.text()).toBe('Add note')
		await button.trigger('click')
		expect(dispatch).toHaveBeenCalledWith({ type: 'open-modal', target: 'X', props: { id: 'c1' } })
	})

	it('draws them on a row of their own when the panel has no heading', async () => {
		const w = await mountTabs({ id: 'w-hist', type: 'audit', title: 'History', headerActions: ACTIONS_DEF }, jest.fn())
		expect(w.find('[data-testid="cn-tabs-widget-panel-heading"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-tabs-widget-panel-actions"] [data-testid="cn-widget-header-action"]').exists()).toBe(true)
	})
})
