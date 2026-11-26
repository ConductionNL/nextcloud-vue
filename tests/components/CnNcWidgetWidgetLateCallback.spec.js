/**
 * CnNcWidgetWidget: a native callback that registers after mount is picked up
 * by a 200 ms poll (15 tries, ~3 s); after that the API list stays and no
 * more checks run. Horizontal cards get a 44px icon.
 *
 * @spec openspec/specs/widgets/spec.md#REQ-WDG-019
 */

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnNcWidgetWidget from '@/components/CnNcWidgetWidget/CnNcWidgetWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const ITEMS = { ocs: { data: { late: [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }] } } }

function countingDashboard() {
	const dashboard = { reads: 0, store: {} }
	Object.defineProperty(dashboard, 'callbacks', {
		get() {
			dashboard.reads++
			return dashboard.store
		},
	})
	return dashboard
}

describe('CnNcWidgetWidget late native callback', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		axios.get.mockReset()
		axios.get.mockResolvedValue({ status: 200, data: ITEMS })
	})

	afterEach(() => {
		jest.useRealTimers()
		delete global.window.OCA
	})

	it('switches to native when the callback registers within the window', async () => {
		const dashboard = countingDashboard()
		global.window.OCA = { Dashboard: dashboard }
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'late' } } })
		await flushPromises()
		expect(wrapper.vm.mode).toBe('api')
		expect(wrapper.findAll('.cn-nc-widget-widget__item')).toHaveLength(2)

		const callback = jest.fn()
		jest.advanceTimersByTime(1000)
		dashboard.store.late = callback
		jest.advanceTimersByTime(200)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.mode).toBe('native')
		expect(callback).toHaveBeenCalledTimes(1)
		expect(wrapper.find('.cn-nc-widget-widget__body').exists()).toBe(false)

		const reads = dashboard.reads
		jest.advanceTimersByTime(5000)
		expect(dashboard.reads).toBe(reads)
		expect(callback).toHaveBeenCalledTimes(1)
	})

	it('stops checking after 15 tries and keeps the API list', async () => {
		const dashboard = countingDashboard()
		global.window.OCA = { Dashboard: dashboard }
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'late' } } })
		await flushPromises()
		const atMount = dashboard.reads

		jest.advanceTimersByTime(200)
		const perCheck = dashboard.reads - atMount
		expect(perCheck).toBeGreaterThan(0)
		jest.advanceTimersByTime(2800)
		expect(dashboard.reads - atMount).toBe(15 * perCheck)
		jest.advanceTimersByTime(3000)
		expect(dashboard.reads - atMount).toBe(15 * perCheck)

		dashboard.store.late = jest.fn()
		jest.advanceTimersByTime(1000)
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.mode).toBe('api')
		expect(wrapper.findAll('.cn-nc-widget-widget__item')).toHaveLength(2)
	})

	it('does not poll in horizontal mode, which keeps the styled API cards', async () => {
		const dashboard = countingDashboard()
		global.window.OCA = { Dashboard: dashboard }
		mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'late', displayMode: 'horizontal' } } })
		await flushPromises()
		const after = dashboard.reads
		jest.advanceTimersByTime(3000)
		expect(dashboard.reads).toBe(after)
	})

	it('stops the poll when the widget is unmounted', async () => {
		const dashboard = countingDashboard()
		global.window.OCA = { Dashboard: dashboard }
		const wrapper = mount(CnNcWidgetWidget, { propsData: { content: { widgetId: 'late' } } })
		await flushPromises()
		wrapper.unmount()
		const after = dashboard.reads
		jest.advanceTimersByTime(3000)
		expect(dashboard.reads).toBe(after)
	})
})
