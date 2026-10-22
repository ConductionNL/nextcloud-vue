/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnWeekStripWidget as a week view: items from an app endpoint for the shown
 * range, previous / next / back to today, a Today / Week switch, times,
 * badges from a variant map, item actions with `@item` tokens and a local
 * `visibleWhen`, notices and a summary list read from the answer.
 *
 * @spec openspec/changes/week-view/specs/week-view/spec.md#requirement-a-week-view-reads-its-week-from-an-endpoint-and-moves-through-weeks
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnWeekStripWidget from '../../src/components/CnWeekStripWidget/CnWeekStripWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path) => path }))

// Wednesday 7 October 2026. The week runs Monday 5 to Friday 9.
const NOW = new Date(2026, 9, 7, 10, 0)

/**
 * Let the endpoint read settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const ANSWER = {
	source: 'planninq',
	sessions: [
		{ id: 's1', title: 'Maths', startsAt: '2026-10-07T09:00:00', endsAt: '2026-10-07T09:50:00', lifecycle: 'cancelled', room: { name: 'B12' }, canAddNote: true },
		{ id: 's2', title: 'History', startsAt: '2026-10-07T08:00:00', endsAt: '2026-10-07T08:50:00', lifecycle: 'scheduled', onlineMeetingUrl: 'https://meet.example/x', cover: true },
	],
	standby: [{ slotId: 'sb', date: '2026-10-08', startsAt: '10:15', endsAt: '11:05' }],
	changes: [{ id: 's1', title: 'Maths', lifecycle: 'cancelled', changeReason: 'Teacher ill' }],
}

const CONTENT = {
	endpointSource: { url: '/apps/school/api/timetable/mine', params: { from: '@range.from', to: '@range.to' } },
	itemsPath: 'sessions',
	dateField: 'startsAt',
	titleTemplate: '{title}',
	metaTemplates: ['{room.name}'],
	timeFields: { start: 'startsAt', end: 'endsAt' },
	badgeField: 'lifecycle',
	variantMap: { cancelled: { label: 'Cancelled', variant: 'error', muted: true } },
	badges: [{ field: 'cover', variantMap: { true: { label: 'Cover', variant: 'warning' } } }],
	itemActions: [
		{ id: 'join', label: 'Join', href: '@item.onlineMeetingUrl', visibleWhen: { field: 'item.onlineMeetingUrl', op: 'notEmpty' } },
		{ id: 'note', label: 'Add note', type: 'open-modal', target: 'LessonNote', props: { lesson: '@item' }, visibleWhen: { field: 'item.canAddNote', value: true } },
	],
	itemLists: [{ path: 'standby', dateField: 'date', titleTemplate: 'Standby', timeFields: { start: 'startsAt', end: 'endsAt' } }],
	navigation: true,
	modes: true,
	heading: 'My timetable',
	notices: [{ path: 'source', equals: 'planninq', text: 'These lessons come from the school timetable.' }],
	summary: { title: "Today's changes", path: 'changes', itemTitle: '{title}', itemMeta: ['{changeReason}'], badgeField: 'lifecycle', variantMap: { cancelled: { label: 'Cancelled', variant: 'error' } } },
}

const stubs = {
	CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcButton: { inheritAttrs: false, emits: ['click'], template: '<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>' },
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: ANSWER })
})

/**
 * Mount the week view on the fixed reference day.
 *
 * @param {object} [content] The content.
 * @return {object}
 */
function make(content = CONTENT) {
	return mount(CnWeekStripWidget, { props: { content, now: NOW }, global: { stubs } })
}

describe('CnWeekStripWidget week view', () => {
	it('reads the shown range from the endpoint and lays the items out by day and time', async () => {
		const w = make()
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/apps/school/api/timetable/mine', expect.objectContaining({ params: { from: '2026-10-05', to: '2026-10-10' } }))
		const wednesday = w.find('[data-day="2026-10-07"]')
		const items = wednesday.findAll('[data-testid="cn-week-strip-item"]')
		expect(items.map((i) => i.find('.cn-week-strip__title').text())).toEqual(['History', 'Maths'])
		expect(items[1].text()).toContain('B12')
		expect(items[1].find('[data-testid="cn-week-strip-badge"]').text()).toBe('Cancelled')
		expect(items[1].classes()).toContain('cn-week-strip__item--muted')
		expect(items[0].find('[data-testid="cn-week-strip-badge"]').text()).toBe('Cover')
		expect(items[0].classes()).not.toContain('cn-week-strip__item--muted')
		expect(w.find('[data-day="2026-10-08"]').text()).toContain('10:15–11:05')
		expect(w.find('[data-day="2026-10-08"]').text()).toContain('Standby')
	})

	it('fills the item actions and shows each only when it applies', async () => {
		const w = make()
		await flush()
		const [history, maths] = w.find('[data-day="2026-10-07"]').findAll('.cn-week-strip__item-row')
		const historyActions = history.findComponent({ name: 'CnActionButtons' }).props('actions')
		expect(historyActions.map((a) => a.label)).toEqual(['Join'])
		expect(historyActions[0].href).toBe('https://meet.example/x')
		const mathsActions = maths.findComponent({ name: 'CnActionButtons' }).props('actions')
		expect(mathsActions.map((a) => a.label)).toEqual(['Add note'])
		expect(mathsActions[0].props.lesson.id).toBe('s1')
	})

	it('moves a week, comes back to today, and switches to one day', async () => {
		const w = make()
		await flush()
		await w.find('[data-testid="cn-week-strip-next"]').trigger('click')
		await flush()
		expect(axios.get).toHaveBeenLastCalledWith('/apps/school/api/timetable/mine', expect.objectContaining({ params: { from: '2026-10-12', to: '2026-10-17' } }))
		await w.find('[data-testid="cn-week-strip-today"]').trigger('click')
		await w.find('[data-testid="cn-week-strip-mode-today"]').trigger('click')
		await flush()
		expect(w.findAll('.cn-week-strip__day')).toHaveLength(1)
		expect(axios.get).toHaveBeenLastCalledWith('/apps/school/api/timetable/mine', expect.objectContaining({ params: { from: '2026-10-07', to: '2026-10-08' } }))
	})

	it('shows the notices and the summary from the answer', async () => {
		const w = make()
		await flush()
		expect(w.find('[data-testid="cn-week-strip-notice"]').text()).toBe('These lessons come from the school timetable.')
		const summary = w.find('[data-testid="cn-week-strip-summary"]')
		expect(summary.text()).toContain("Today's changes")
		expect(summary.text()).toContain('Teacher ill')
		expect(summary.text()).toContain('Cancelled')
		expect(w.find('.cn-week-strip__heading').text()).toBe('My timetable')
	})
})
