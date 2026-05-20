import { mount } from '@vue/test-utils'
import CnTimelineView from '@/components/CnTimelineView/CnTimelineView.vue'

const events = [
	{ id: 'a', title: 'Math', start: '2026-05-21T09:00:00Z', end: '2026-05-21T10:30:00Z' },
	{ id: 'b', title: 'Physics', start: '2026-05-21T11:00:00Z' },
	{ id: 'c', title: 'Lab', start: '2026-05-22T09:00:00Z', kind: 'break' },
	{ id: 'd', title: '', start: '2026-05-22T13:00:00Z', location: 'Hall B' },
]

describe('CnTimelineView', () => {
	it('renders empty state for empty events', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events: [] } })
		expect(wrapper.find('.cn-timeline-view__empty').exists()).toBe(true)
	})

	it('groups events by ISO date', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events } })
		const groups = wrapper.vm.groupedEvents
		expect(groups.length).toBe(2)
		expect(groups[0].events.length).toBe(2)
		expect(groups[1].events.length).toBe(2)
	})

	it('sorts events within a group by start time', () => {
		const wrapper = mount(CnTimelineView, {
			propsData: {
				events: [
					{ id: 'a', start: '2026-05-21T11:00:00Z' },
					{ id: 'b', start: '2026-05-21T09:00:00Z' },
				],
			},
		})
		const eventIds = wrapper.vm.groupedEvents[0].events.map((e) => e.id)
		expect(eventIds).toEqual(['b', 'a'])
	})

	it('sorts groups ascending by default', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events } })
		const keys = wrapper.vm.groupedEvents.map((g) => g.key)
		expect(keys).toEqual(['2026-05-21', '2026-05-22'])
	})

	it('sorts groups descending when sort=desc', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events, sort: 'desc' } })
		const keys = wrapper.vm.groupedEvents.map((g) => g.key)
		expect(keys).toEqual(['2026-05-22', '2026-05-21'])
	})

	it('uses a custom groupBy when provided', () => {
		const groupBy = (e) => ({ key: e.kind || 'other', label: e.kind || 'Other' })
		const wrapper = mount(CnTimelineView, { propsData: { events, groupBy } })
		const keys = wrapper.vm.groupedEvents.map((g) => g.key)
		expect(keys).toContain('break')
		expect(keys).toContain('other')
	})

	it('formats time range as HH:MM – HH:MM when end is set', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events } })
		const formatted = wrapper.vm.formatTimeRange(events[0])
		expect(formatted).toContain('–')
	})

	it('formats time as start only when end is omitted', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events } })
		const formatted = wrapper.vm.formatTimeRange(events[1])
		expect(formatted).not.toContain('–')
	})

	it('falls back to untitledLabel for events without title', () => {
		const wrapper = mount(CnTimelineView, {
			propsData: { events: [{ start: '2026-05-21T09:00:00Z' }], untitledLabel: '(no title)' },
		})
		expect(wrapper.text()).toContain('(no title)')
	})

	it('emits event-click when an event row is clicked', async () => {
		const wrapper = mount(CnTimelineView, { propsData: { events } })
		await wrapper.findAll('.cn-timeline-view__event').at(0).trigger('click')
		expect(wrapper.emitted('event-click')).toBeTruthy()
	})

	it('hides counts when hideCounts is true', () => {
		const wrapper = mount(CnTimelineView, { propsData: { events, hideCounts: true } })
		expect(wrapper.find('.cn-timeline-view__group-count').exists()).toBe(false)
	})

	it('applies kindClassMap class to matching events', () => {
		const wrapper = mount(CnTimelineView, {
			propsData: { events, kindClassMap: { break: 'break' } },
		})
		const rows = wrapper.findAll('.cn-timeline-view__event--break')
		expect(rows.length).toBe(1)
	})

	it('renders title + description when set', () => {
		const wrapper = mount(CnTimelineView, {
			propsData: { events, title: 'Schedule', description: 'Your week' },
		})
		expect(wrapper.text()).toContain('Schedule')
		expect(wrapper.text()).toContain('Your week')
	})

	it('handles invalid event.start gracefully', () => {
		const wrapper = mount(CnTimelineView, {
			propsData: { events: [{ start: 'not-a-date' }] },
		})
		expect(wrapper.vm.groupedEvents[0].key).toBe('invalid')
	})
})
