/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stat tile's caption can show a share (`captionSource.kind: "ratio"`):
 * board ShDebiteurenbeheer's age tiles read "EUR 14.320,00, 15% van open".
 *
 * @spec openspec/changes/stat-caption-ratio/specs/stat-widget/spec.md#requirement-a-stat-tiles-caption-can-show-a-share
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p, params = {}) => `/nc${p.replace(/\{(\w+)\}/g, (m, k) => params[k])}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }
const CAPTION = '[data-testid="cn-stat-widget-caption"]'

const base = {
	label: '1 to 30 days',
	source: { register: 'shillinq', schema: 'ARInvoice', metric: 'sum', field: 'grossAmount', filter: { bucket: 'b1' } },
	caption: '{ratio}% of open',
	captionSource: { kind: 'ratio', denominator: { metric: 'sum', field: 'grossAmount', filter: { open: true } } },
}

async function mountTile(content, answers) {
	axios.get.mockImplementation(async (url, { params }) => {
		const key = Object.keys(answers).find((k) => params[`filter[${k}]`] !== undefined)
		return { data: { value: answers[key] } }
	})
	const wrapper = mount(CnStatWidget, { propsData: { content }, stubs, provide: { cnWorkspaceContext: {} } })
	for (let i = 0; i < 4; i++) {
		await flush()
	}
	return wrapper
}

describe('CnStatWidget: a caption that shows a share', () => {
	beforeEach(() => jest.clearAllMocks())

	it('divides the tile value by the denominator', async () => {
		const w = await mountTile(base, { bucket: 20, open: 80 })
		expect(w.find('.cn-stat-widget__value').text()).toBe('20')
		expect(w.find(CAPTION).text()).toBe('25% of open')
	})

	it('reads a numerator of its own, with decimals', async () => {
		const content = { ...base, captionSource: { ...base.captionSource, numerator: { metric: 'count', filter: { late: true } }, decimals: 1 } }
		const w = await mountTile(content, { bucket: 20, open: 80, late: 10 })
		expect(w.find(CAPTION).text()).toMatch(/^12[.,]5% of open$/)
	})

	it('leaves the caption out when the denominator is zero', async () => {
		const w = await mountTile(base, { bucket: 20, open: 0 })
		expect(w.find(CAPTION).exists()).toBe(false)
	})

	it('keeps a plain caption source a count', async () => {
		const content = { ...base, caption: '{count} late', captionSource: { filter: { late: true } } }
		const w = await mountTile(content, { bucket: 20, late: 3 })
		expect(w.find(CAPTION).text()).toBe('3 late')
	})
})
