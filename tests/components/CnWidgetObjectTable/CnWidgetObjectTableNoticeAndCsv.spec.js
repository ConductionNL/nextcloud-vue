/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An endpoint table keeps empty, refused, failed and short answers apart,
 * and `exportCsv` downloads the rows it holds.
 */

import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'
import { invalidateEndpointSourceCache } from '../../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {} })),
}))

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const endpointSource = { url: '/apps/app/api/report', responsePath: 'rows' }

/**
 * An axios rejection as the server answered it.
 *
 * @param {number} status The HTTP status.
 * @param {string} message The server's message.
 * @return {Error} The error.
 */
function rejection(status, message) {
	return Object.assign(new Error(`Request failed with status code ${status}`), {
		response: { status, data: { message } },
	})
}

describe('CnWidgetObjectTable: notices and CSV export', () => {
	beforeEach(() => {
		axios.get.mockReset()
		invalidateEndpointSourceCache()
	})

	it('shows the refusal sentence and no table when the read is refused', async () => {
		axios.get.mockRejectedValue(rejection(403, 'This report is for the controller role.'))
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource, columns: ['name'] } })
		await flush()

		const notice = wrapper.findComponent({ name: 'CnEndpointNotice' })
		expect(notice.props('error')).toBe('This report is for the controller role.')
		expect(notice.props('refused')).toBe(true)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).exists()).toBe(false)
	})

	it('shows a failure as a failure, not a refusal', async () => {
		axios.get.mockRejectedValue(rejection(500, 'Report generation failed'))
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource, columns: ['name'] } })
		await flush()

		const notice = wrapper.findComponent({ name: 'CnEndpointNotice' })
		expect(notice.props('error')).toBe('Report generation failed')
		expect(notice.props('refused')).toBe(false)
	})

	it('keeps the table and says it is short when the answer is truncated', async () => {
		axios.get.mockResolvedValue({ data: { truncated: true, rows: [{ id: 'a', name: 'A' }] } })
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource, columns: ['name'] } })
		await flush()

		expect(wrapper.findComponent({ name: 'CnEndpointNotice' }).props('truncated')).toBe(true)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toEqual([{ id: 'a', name: 'A' }])
	})

	it('renders the notice text a reader sees', async () => {
		axios.get.mockRejectedValue(rejection(403, 'Not for you.'))
		const wrapper = mount(CnWidgetObjectTable, {
			propsData: { endpointSource, columns: ['name'] },
			global: { stubs: { CnDataTable: true, CnWidgetHostShell: { template: '<div><slot /></div>' }, CnWidgetWrapper: { template: '<div><slot /></div>' } } },
		})
		await flush()

		expect(wrapper.find('[data-testid="cn-endpoint-notice-refused"]').text()).toContain('Not for you.')
	})

	it('heads a column with the label the response names at labelPath', async () => {
		axios.get.mockResolvedValue({ data: { labels: { workingHours: 'Working hours (working days x 8)' }, rows: [{ id: 'a', hours: 8 }] } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource,
				columns: [{ key: 'hours', label: 'Hours', labelPath: 'labels.workingHours' }, { key: 'id', label: 'Id', labelPath: 'labels.missing' }],
			},
		})
		await flush()

		const columns = wrapper.findComponent({ name: 'CnDataTable' }).props('columns')
		expect(columns[0].label).toBe('Working hours (working days x 8)')
		expect(columns[1].label).toBe('Id')
	})

	it('reads nothing until the reader presses the request button, then draws the rows', async () => {
		axios.get.mockResolvedValue({ data: { rows: [{ id: 'a', name: 'A' }] } })
		const wrapper = mount(CnWidgetObjectTable, {
			propsData: { endpointSource: { ...endpointSource, loadOn: 'request', requestLabel: 'Show report' }, columns: ['name'] },
			global: {
				provide: { cnTranslate: (s) => `[${s}]` },
				stubs: { CnDataTable: { name: 'CnDataTable', props: ['rows'], template: '<div class="table-stub" />' }, CnWidgetWrapper: { template: '<div><slot /></div>' } },
			},
		})
		await flush()

		expect(axios.get).not.toHaveBeenCalled()
		expect(wrapper.find('.table-stub').exists()).toBe(false)
		const button = wrapper.find('[data-testid="cn-endpoint-request"]')
		expect(button.text()).toBe('[Show report]')

		await button.trigger('click')
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(wrapper.findComponent({ name: 'CnDataTable' }).props('rows')).toEqual([{ id: 'a', name: 'A' }])
		expect(wrapper.find('[data-testid="cn-endpoint-request"]').exists()).toBe(false)
	})

	it('has no CSV button unless asked', async () => {
		axios.get.mockResolvedValue({ data: { rows: [] } })
		const wrapper = shallowMount(CnWidgetObjectTable, { propsData: { endpointSource, columns: ['name'] } })
		await flush()

		expect(wrapper.find('[data-testid="cn-widget-export-csv"]').exists()).toBe(false)
	})

	it('downloads the rows with the column labels as headers', async () => {
		axios.get.mockResolvedValue({ data: { rows: [{ id: 'a', caseTypeTitle: 'Permit', total: 3 }] } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: {
				endpointSource,
				columns: [{ key: 'caseTypeTitle', label: 'Case type' }, { key: 'total', label: 'Total' }],
				exportCsv: true,
				title: 'Quarterly report',
			},
		})
		await flush()

		const RealBlob = global.Blob
		let parts = null
		global.Blob = jest.fn((content, options) => {
			parts = content
			return new RealBlob(content, options)
		})
		global.URL.createObjectURL = jest.fn(() => 'blob:csv')
		global.URL.revokeObjectURL = jest.fn()
		const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		wrapper.vm.downloadCsv()

		expect(click).toHaveBeenCalled()
		expect(parts.join('')).toBe('\uFEFFCase type,Total\r\nPermit,3\r\n')
		click.mockRestore()
		global.Blob = RealBlob
	})
})
