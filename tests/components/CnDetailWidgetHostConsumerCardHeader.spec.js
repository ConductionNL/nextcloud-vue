/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app widget in the titled card (`chrome: "card"`) reports its title row
 * through the `header` event, as the built-in cards do: a note and several
 * actions (DqZaak tabs Taken, Historie, Notities, Live gesprek: "3 open",
 * "Taak toevoegen", "Alles tonen").
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const runs = { add: jest.fn(), all: jest.fn() }
const TasksPane = {
	name: 'TasksPane',
	emits: ['header'],
	mounted() {
		this.$emit('header', {
			note: '3 open',
			actions: [
				{ label: 'Add task', icon: 'Plus', run: runs.add },
				{ label: 'Show all', run: runs.all },
			],
		})
	},
	template: '<div class="tasks-pane" />',
}

/**
 * @return {object} The wrapper.
 */
function mountHost() {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type: 'case-tasks', title: 'Tasks' }, chrome: 'card', objectId: 'case-1', cnRegistry: { 'case-tasks': { component: TasksPane, chrome: 'card' } } },
		global: { mocks: { t: (_a, s) => s }, stubs: { CnIcon: true } },
	})
}

describe('CnDetailWidgetHost: the consumer card title row', () => {
	it('draws the note and every action the widget reports', async () => {
		const w = mountHost()
		await w.vm.$nextTick()
		const card = w.find('[data-testid="cn-detail-widget-consumer-card"]')
		expect(card.find('[data-testid="cn-detail-widget-header-note"]').text()).toBe('3 open')
		const actions = card.findAll('[data-testid="cn-detail-widget-header-action"]')
		expect(actions.map((a) => a.text())).toEqual(['Add task', 'Show all'])
		await actions[1].trigger('click')
		expect(runs.all).toHaveBeenCalledTimes(1)
	})

	it('keeps a single `action` working next to `actions`', () => {
		const w = mountHost()
		w.vm.onRendererHeader({ action: { label: 'One', run: jest.fn() }, actions: [{ label: 'Two', run: jest.fn() }] })
		expect(w.vm.rendererHeader.actions.map((a) => a.label)).toEqual(['One', 'Two'])
	})
})

describe('CnTabsWidget: the first card of a stack', () => {
	it('draws the title row an app widget reports', async () => {
		const CnTabsWidget = (await import('../../src/components/CnTabsWidget/CnTabsWidget.vue')).default
		const w = mount(CnTabsWidget, {
			props: {
				content: { tabs: [{ id: 'tasks', label: 'Tasks', widgetIds: ['w-tasks', 'w-notes'] }] },
				availableWidgets: [{ id: 'w-tasks', type: 'case-tasks', title: 'Tasks' }, { id: 'w-notes', type: 'text', title: 'Notes' }],
				objectId: 'case-1',
				cnRegistry: { 'case-tasks': { component: TasksPane, chrome: 'card' } },
			},
			global: { mocks: { t: (_a, s) => s }, stubs: { CnIcon: true } },
		})
		await w.vm.$nextTick()
		const first = w.find('.cn-tabs-widget__stack-first')
		expect(first.find('[data-testid="cn-detail-widget-header-note"]').text()).toBe('3 open')
		expect(first.findAll('[data-testid="cn-detail-widget-header-action"]')).toHaveLength(2)
	})
})
