/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `visibleWhen` on a tab of CnTabsWidget: a tab whose condition is false is
 * absent from the strip, and the active tab is always a visible one.
 *
 * @spec openspec/changes/tabs-widget-visible-if/tasks.md#task-2
 */
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const mockEvaluate = jest.fn()
jest.mock('../../src/utils/visibleWhen.js', () => {
	const actual = jest.requireActual('../../src/utils/visibleWhen.js')
	return { ...actual, evaluateVisibleWhen: (...a) => mockEvaluate(...a) }
})

import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-overview', type: 'object-list', title: 'Overview', content: {} },
	{ id: 'w-people', type: 'object-list', title: 'Participants', content: {} },
	{ id: 'w-decision', type: 'object-list', title: 'Decision', content: {} },
	{ id: 'w-files', type: 'object-list', title: 'Files', content: {} },
]

const PEOPLE = { source: { register: 'dossiq', schema: 'role', filter: { case: '@objectId' } }, field: '@total', op: 'gt', value: 0 }
const DECISION = { field: 'decision', op: 'neq', value: null }

const TABS = [
	{ id: 'overview', widgetId: 'w-overview' },
	{ id: 'participants', widgetId: 'w-people', visibleWhen: PEOPLE },
	{ id: 'decision', widgetId: 'w-decision', visibleWhen: DECISION },
	{ id: 'files', widgetId: 'w-files' },
]

function mountWidget(extra = {}, route = { hash: '' }) {
	return mount(CnTabsWidget, {
		props: { content: { tabs: TABS }, availableWidgets: WIDGETS, objectId: 'case-1', objectData: { id: 'case-1', decision: null }, register: 'dossiq', schema: 'case', ...extra },
		global: {
			stubs: { CnDetailWidgetHost: true },
			mocks: { $route: route, $router: { replace: jest.fn() } },
		},
	})
}

const labels = (w) => w.findAll('[role="tab"]').map((t) => t.text())

beforeEach(() => {
	mockEvaluate.mockReset()
	mockEvaluate.mockResolvedValue(true)
})

describe('visibleWhen on a tab', () => {
	it('always renders a tab without the key', async () => {
		const w = mountWidget({ content: { tabs: [{ widgetId: 'w-overview' }, { widgetId: 'w-files' }] } })
		await flushPromises()
		expect(labels(w)).toEqual(['Overview', 'Files'])
		expect(mockEvaluate).not.toHaveBeenCalled()
	})

	it('hides a tab whose local condition is false and shows it when the object changes', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(labels(w).join('|')).not.toContain('Decision')
		await w.setProps({ objectData: { id: 'case-1', decision: 'granted' } })
		await flushPromises()
		expect(labels(w).join('|')).toContain('Decision')
	})

	it('shows a source tab disabled while pending, absent when the count answers false', async () => {
		let resolve
		mockEvaluate.mockReturnValue(new Promise((r) => {
			resolve = r
		}))
		const w = mountWidget()
		await nextTick()
		const people = w.findAll('[role="tab"]').find((t) => t.text().includes('Participants'))
		expect(people).toBeTruthy()
		expect(people.attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-tabs-widget-pending"]').exists()).toBe(true)
		resolve(false)
		await flushPromises()
		expect(labels(w).join('|')).not.toContain('Participants')
	})

	it('counts once on mount with the object id in the context', async () => {
		mountWidget()
		await flushPromises()
		expect(mockEvaluate).toHaveBeenCalledTimes(1)
		expect(mockEvaluate.mock.calls[0][0]).toEqual(PEOPLE)
		expect(mockEvaluate.mock.calls[0][1].objectId).toBe('case-1')
	})

	it('counts again after a reported write and brings the tab back', async () => {
		mockEvaluate.mockResolvedValue(false)
		const w = mountWidget()
		await flushPromises()
		expect(labels(w).join('|')).not.toContain('Participants')
		mockEvaluate.mockResolvedValue(true)
		emit('cn:page:refresh', {})
		await flushPromises()
		expect(mockEvaluate).toHaveBeenCalledTimes(2)
		expect(labels(w).join('|')).toContain('Participants')
	})

	it('drops a stale answer from an earlier round', async () => {
		const answers = []
		mockEvaluate.mockImplementation(() => new Promise((r) => answers.push(r)))
		const w = mountWidget()
		await nextTick()
		emit('cn:page:refresh', {})
		await nextTick()
		answers[1](true)
		await flushPromises()
		answers[0](false)
		await flushPromises()
		expect(labels(w).join('|')).toContain('Participants')
	})
})

describe('the active tab is always a visible one', () => {
	it('activates the first visible tab and updates the hash when the active tab goes', async () => {
		const route = { hash: '#decision', query: { a: '1' } }
		const w = mountWidget({ objectData: { id: 'case-1', decision: 'granted' } }, route)
		await flushPromises()
		expect(w.vm.activeTab.id).toBe('decision')
		await w.setProps({ objectData: { id: 'case-1', decision: null } })
		await flushPromises()
		expect(labels(w).join('|')).not.toContain('Decision')
		expect(w.vm.activeTab.id).toBe('overview')
		expect(w.vm.$router.replace).toHaveBeenCalledWith({ hash: '#overview', query: { a: '1' } })
	})

	it('keeps the same tab active when a tab before it appears', async () => {
		const w = mountWidget()
		await flushPromises()
		w.vm.onTabChange(w.vm.resolvedTabs.findIndex((t) => t.id === 'files'))
		await nextTick()
		await w.setProps({ objectData: { id: 'case-1', decision: 'granted' } })
		await flushPromises()
		expect(w.vm.activeTab.id).toBe('files')
	})

	it('falls back to the first visible tab for a hash naming a hidden tab, without an error', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		mockEvaluate.mockResolvedValue(false)
		const w = mountWidget({}, { hash: '#participants' })
		await flushPromises()
		expect(w.vm.activeTab.id).toBe('overview')
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})

	it('opens the tab a hash names when it is visible', async () => {
		const w = mountWidget({}, { hash: '#files' })
		await flushPromises()
		expect(w.vm.activeTab.id).toBe('files')
	})
})
