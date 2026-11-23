/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A dashboard's description can come from an app endpoint: PqMijnWerk reads
 * "Dinsdag 7 oktober 2026 · negen items liggen bij jou: ...", the date from
 * `greeting: "date"` and the summary from the app.
 *
 * @spec openspec/changes/dashboard-description-source/specs/dashboard-description-source/spec.md#requirement-a-dashboards-description-can-come-from-an-endpoint
 */
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

/**
 * Mount a page with a description source.
 *
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper.
 */
async function mountWith(props) {
	const wrapper = mount(CnDashboardPage, {
		propsData: { title: 'Mijn werk', widgets: [], layout: [], ...props },
		stubs,
	})
	await flushPromises()
	return wrapper
}

describe('CnDashboardPage: a description from an endpoint', () => {
	beforeEach(() => axios.get.mockReset())

	it('reads the description the endpoint answers', async () => {
		axios.get.mockResolvedValue({ data: { text: '9 items are with you' } })
		const wrapper = await mountWith({ description: 'Your work', descriptionSource: { url: '/apps/pipelinq/api/worklist/summary' } })
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/pipelinq/api/worklist/summary')
		expect(wrapper.vm.subtitleText).toBe('9 items are with you')
	})

	it('keeps the manifest description when the endpoint fails', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const wrapper = await mountWith({ description: 'Your work', descriptionSource: { url: '/apps/pipelinq/api/worklist/summary' } })
		expect(wrapper.vm.subtitleText).toBe('Your work')
	})
})
