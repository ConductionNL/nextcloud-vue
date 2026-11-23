/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard reads its `descriptionSource` again when an app emits
 * `cn:dashboard:description-refresh` on the event bus: PqDashboard's header
 * says "je bent beschikbaar ..." and follows the Beschikbaar toggle.
 *
 * @spec openspec/changes/dashboard-description-source/specs/dashboard-description-source/spec.md#requirement-a-dashboards-description-can-come-from-an-endpoint
 */
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => `/index.php${path}` }))
const axios = require('@nextcloud/axios').default

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout'] },
	CnWidgetWrapper: { template: '<div />' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

describe('CnDashboardPage: the description follows a refresh event', () => {
	it('reads the endpoint again on cn:dashboard:description-refresh, and stops after unmount', async () => {
		axios.get.mockReset()
		axios.get
			.mockResolvedValueOnce({ data: { availabilityLine: 'you are available' } })
			.mockResolvedValueOnce({ data: { availabilityLine: 'you are not taking calls' } })
		const wrapper = mount(CnDashboardPage, {
			propsData: { title: 'Kcc', widgets: [], layout: [], descriptionSource: { url: '/apps/pipelinq/api/kcc-werkplek/state', path: 'availabilityLine' } },
			stubs,
		})
		await flushPromises()
		expect(wrapper.vm.subtitleText).toBe('you are available')

		emit('cn:dashboard:description-refresh', {})
		await flushPromises()
		expect(wrapper.vm.subtitleText).toBe('you are not taking calls')
		expect(axios.get).toHaveBeenCalledTimes(2)

		wrapper.unmount()
		emit('cn:dashboard:description-refresh', {})
		await flushPromises()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})
})
