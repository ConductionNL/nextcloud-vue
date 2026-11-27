/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A KPI widget mounted as a miniature in a widget picker (`preview`) draws
 * its sample content and sends no request: the stat its `sampleValue`, the
 * delta its `sampleValue` against `samplePrevious`, the gauge its
 * `sampleValue` against `sampleTarget`. Each type registers that sample as
 * its `sampleContent`.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
	generateOcsUrl: jest.fn((p) => `/ocs${p}`),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnDeltaWidget from '../../src/components/CnDeltaWidget/CnDeltaWidget.vue'
import CnGaugeWidget from '../../src/components/CnGaugeWidget/CnGaugeWidget.vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { sampleNumber } from '../../src/utils/sampleNumber.js'

import '../../src/components/CnDeltaWidget/index.js'
import '../../src/components/CnGaugeWidget/index.js'
import '../../src/components/CnStatWidget/index.js'

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

let fetchSpy

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	fetchSpy = jest.fn()
	globalThis.fetch = fetchSpy
})

afterEach(() => {
	delete globalThis.fetch
})

function noRequest() {
	expect(axios.get).not.toHaveBeenCalled()
	expect(axios.post).not.toHaveBeenCalled()
	expect(fetchSpy).not.toHaveBeenCalled()
}

describe('KPI widgets as a miniature (preview)', () => {
	it('the stat draws its sample value, even with a source configured, and reads nothing', async () => {
		const wrapper = mount(CnStatWidget, {
			propsData: { preview: true, content: { ...getWidgetTypeEntry('stat').sampleContent, source: { register: 'r', schema: 's', metric: 'count' } } },
		})
		await flush()

		noRequest()
		expect(wrapper.text()).toContain('Open cases')
		expect(wrapper.text()).toContain('42')
	})

	it('the delta draws its sample value against the previous one and reads nothing', async () => {
		const wrapper = mount(CnDeltaWidget, {
			propsData: { preview: true, content: { ...getWidgetTypeEntry('delta').sampleContent, source: { register: 'r', schema: 's', metric: 'count' } } },
		})
		await flush()

		noRequest()
		expect(wrapper.vm.current).toBe(18)
		expect(wrapper.vm.previous).toBe(14)
		expect(wrapper.text()).toContain('18')
	})

	it('the gauge draws its sample value against the sample target and reads nothing', async () => {
		const wrapper = mount(CnGaugeWidget, {
			propsData: { preview: true, content: { ...getWidgetTypeEntry('gauge').sampleContent, source: { register: 'r', schema: 's', metric: 'count' } } },
		})
		await flush()

		noRequest()
		expect(wrapper.vm.value).toBe(82)
		expect(wrapper.vm.target).toBe(100)
		expect(wrapper.text()).toContain('82%')
	})

	it('a sample without a value draws the empty state, still without a request', async () => {
		const wrapper = mount(CnStatWidget, { propsData: { preview: true, content: { label: 'Empty' } } })
		await flush()

		noRequest()
		expect(wrapper.vm.value).toBeNull()
	})

	it('reads a sample number only when it is finite', () => {
		expect(sampleNumber(7)).toBe(7)
		expect(sampleNumber('12.5')).toBe(12.5)
		expect(sampleNumber('')).toBeNull()
		expect(sampleNumber(null)).toBeNull()
		expect(sampleNumber(undefined)).toBeNull()
		expect(sampleNumber('many')).toBeNull()
	})
})
