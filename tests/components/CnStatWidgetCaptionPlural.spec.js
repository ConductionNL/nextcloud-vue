/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat caption can come in a singular and a plural form (`caption:
 * { singular, plural }`): the caption's own count, or the tile's number when
 * the caption has none, picks the form, and each form is translated on its
 * own, so "1 loopt vandaag af" and "2 lopen vandaag af" both read right.
 *
 * @spec openspec/changes/stat-caption-plural/specs/stat-widget/spec.md#requirement-a-stat-caption-can-take-a-singular-and-a-plural-form
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }
const CAPTION = '[data-testid="cn-stat-widget-caption"]'
const DUTCH = {
	'{count} ends today': '{count} loopt vandaag af',
	'{count} end today': '{count} lopen vandaag af',
	'nothing ends today': 'niets loopt vandaag af',
	'{value} case': '{value} zaak',
	'{value} cases': '{value} zaken',
}
const translate = (text) => DUTCH[text] ?? text

const counted = {
	label: 'Due this week',
	source: { register: 'dossiq', schema: 'case', filter: { week: true } },
	caption: { singular: '{count} ends today', plural: '{count} end today' },
	captionSource: { filter: { today: true }, zeroText: 'nothing ends today' },
}

async function mountTile(content, { value = 5, count = 0 } = {}) {
	axios.get.mockImplementation(async (url, { params }) => ({
		data: { value: params['filter[today]'] !== undefined ? count : value },
	}))
	const wrapper = mount(CnStatWidget, { propsData: { content, translate }, stubs, provide: { cnWorkspaceContext: {} } })
	await flush()
	await flush()
	await flush()
	return wrapper
}

describe('CnStatWidget: a caption in a singular and a plural form', () => {
	beforeEach(() => jest.clearAllMocks())

	it('takes the singular for a count of one', async () => {
		const w = await mountTile(counted, { count: 1 })
		expect(w.find(CAPTION).text()).toBe('1 loopt vandaag af')
	})

	it('takes the plural for a count of two', async () => {
		const w = await mountTile(counted, { count: 2 })
		expect(w.find(CAPTION).text()).toBe('2 lopen vandaag af')
	})

	it('still reads zeroText at zero', async () => {
		const w = await mountTile(counted, { count: 0 })
		expect(w.find(CAPTION).text()).toBe('niets loopt vandaag af')
	})

	it('picks the form by the tile number when the caption has no count of its own', async () => {
		const own = { label: 'Open', source: counted.source, caption: { singular: '{value} case', plural: '{value} cases' } }
		expect((await mountTile(own, { value: 1 })).find(CAPTION).text()).toBe('1 zaak')
		expect((await mountTile(own, { value: 3 })).find(CAPTION).text()).toBe('3 zaken')
	})

	it('a string caption is what it was', async () => {
		const w = await mountTile({ ...counted, caption: '{count} ends today' }, { count: 2 })
		expect(w.find(CAPTION).text()).toBe('2 loopt vandaag af')
	})
})
