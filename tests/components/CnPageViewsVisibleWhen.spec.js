/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * view-visible-when: a page view can carry `visibleWhen`, the condition a
 * widget takes. The view is offered only when it holds for the reader (a
 * Mentor view only a mentor sees); until it answers, and when it cannot be
 * read, the view is not offered. When that leaves one view, the page draws
 * no switch.
 *
 * @spec openspec/changes/view-visible-when/specs/view-switch-containers/spec.md#requirement-a-view-is-offered-only-to-the-readers-its-condition-names
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const MENTOR_CLASSES = '/apps/learniq/api/timetable/mentor-classes'

/**
 * The Today views of a school: Teacher for everyone, Mentor for a mentor.
 *
 * @param {object} [mentorCondition] The Mentor view's condition.
 * @return {Array<object>} The views.
 */
function todayViews(mentorCondition = { endpoint: MENTOR_CLASSES, field: 'classes', op: 'notEmpty' }) {
	return [
		{
			id: 'teacher',
			label: 'Teacher',
			widgets: [{ id: 'my-lessons', type: 'custom', title: 'My lessons' }],
			layout: [{ id: 't1', widgetId: 'my-lessons', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
		},
		{
			id: 'mentor',
			label: 'Mentor',
			visibleWhen: mentorCondition,
			widgets: [{ id: 'mentor-class', type: 'custom', title: 'My mentor class' }],
			layout: [{ id: 'm1', widgetId: 'mentor-class', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
		},
	]
}

const gridStub = {
	props: ['layout', 'editable', 'columns', 'cellHeight', 'margin', 'columnOpts'],
	template: '<div class="grid"><div v-for="it in layout" :key="it.id" class="cell" :data-widget="it.widgetId"><slot name="widget" :item="it" /></div></div>',
}

const stubs = {
	CnDashboardGrid: gridStub,
	CnWidgetWrapper: { props: ['widgetId'], template: '<div class="ww" :data-id="widgetId"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { props: ['description'], template: '<div class="empty">{{ description }}</div>' },
	NcLoadingIcon: { template: '<div />' },
	CnActionsMenu: { template: '<div />' },
	CnBuildiqEditButton: { template: '<div />' },
}

const SWITCH = '[data-testid="cn-dashboard-page-view-switch"]'
const REGION = '[data-testid="cn-dashboard-page-view-region"]'
const regionWidgets = (w) => w.findAll(`${REGION} .cell`).map((c) => c.attributes('data-widget'))
const options = (w) => w.findAll(`${SWITCH} [role="radio"]`).map((r) => r.text())

/**
 * Answer the endpoint with a body, or fail it.
 *
 * @param {object|null} body The JSON body; null makes the read fail.
 * @return {void}
 */
function answer(body) {
	global.fetch = jest.fn(async () => (body === null
		? { ok: false, status: 500, json: async () => ({}) }
		: { ok: true, status: 200, json: async () => body }))
}

/**
 * Mount Today with the given views and route query.
 *
 * @param {Array<object>} views The views.
 * @param {object} [query] The route query.
 * @return {object} The wrapper.
 */
function mountToday(views, query = {}) {
	return mount(CnDashboardPage, {
		propsData: { title: 'Today', pageId: 'today', widgets: [], layout: [], views, defaultView: 'teacher', viewsLabel: 'Role' },
		slots: {
			'widget-my-lessons': '<p>lessons</p>',
			'widget-mentor-class': '<p>mentor class</p>',
		},
		global: {
			stubs,
			mocks: { $route: { name: 'Today', query }, $router: { replace: jest.fn(async () => {}), push: jest.fn() } },
		},
	})
}

describe('CnDashboardPage: a view shows only to the readers its condition names', () => {
	const realFetch = global.fetch

	beforeEach(() => {
		localStorage.clear()
	})

	afterEach(() => {
		global.fetch = realFetch
	})

	it('offers the Mentor view to a mentor', async () => {
		answer({ classes: [{ id: 'c-h4b', name: 'H4b' }] })
		const wrapper = mountToday(todayViews())
		await flushPromises()

		expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(MENTOR_CLASSES), expect.anything())
		expect(options(wrapper)).toEqual(['Teacher', 'Mentor'])
	})

	it('draws no switch for a teacher who mentors no group, and shows her Teacher view', async () => {
		answer({ classes: [] })
		const wrapper = mountToday(todayViews())
		await flushPromises()

		expect(wrapper.find(SWITCH).exists()).toBe(false)
		expect(regionWidgets(wrapper)).toEqual(['my-lessons'])
	})

	it('does not open a hidden view the address names', async () => {
		answer({ classes: [] })
		const wrapper = mountToday(todayViews(), { view: 'mentor' })
		await flushPromises()

		expect(regionWidgets(wrapper)).toEqual(['my-lessons'])
	})

	it('opens the Mentor view the address names once the condition holds', async () => {
		answer({ classes: [{ id: 'c-h4b', name: 'H4b' }] })
		const wrapper = mountToday(todayViews(), { view: 'mentor' })
		await flushPromises()

		expect(regionWidgets(wrapper)).toEqual(['mentor-class'])
	})

	it('hides the view when its condition cannot be read', async () => {
		answer(null)
		const wrapper = mountToday(todayViews())
		await flushPromises()

		expect(wrapper.find(SWITCH).exists()).toBe(false)
		expect(regionWidgets(wrapper)).toEqual(['my-lessons'])
	})

	it('keeps the switch when the hidden view leaves two or more views', async () => {
		answer({ classes: [] })
		const views = [...todayViews(), { id: 'archive', label: 'Archive', widgets: [], layout: [] }]
		const wrapper = mountToday(views)
		await flushPromises()

		expect(options(wrapper)).toEqual(['Teacher', 'Archive'])
	})

	it('reads nothing for views without a condition', async () => {
		answer({ classes: [] })
		const views = todayViews().map(({ visibleWhen, ...view }) => view)
		const wrapper = mountToday(views)
		await flushPromises()

		expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining(MENTOR_CLASSES), expect.anything())
		expect(options(wrapper)).toEqual(['Teacher', 'Mentor'])
	})
})
