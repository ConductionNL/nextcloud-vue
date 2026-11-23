/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktypeOverzicht Statussen: a footnote given as a list draws one
 * paragraph per text; the card's header actions can wrap under a long title.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

/** @return {Promise<void>} */
async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const list = (footnote) => ({ endpointSource: { url: '/rows' }, title: '{title}', footnote })

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockImplementation(() => Promise.resolve({ data: [{ id: 1, title: 'Rij' }] }))
})

describe('CnRecordListWidget footnote as a list', () => {
	it('draws each text as its own paragraph', async () => {
		const w = mount(CnRecordListWidget, { props: { content: list(['Eerste alinea', 'Tweede alinea']) } })
		await flush()
		expect(w.findAll('[data-testid="cn-record-list-footnote"]').map((p) => p.text())).toEqual(['Eerste alinea', 'Tweede alinea'])
	})

	it('keeps a plain footnote as one line (control)', async () => {
		const w = mount(CnRecordListWidget, { props: { content: list('Een regel') } })
		await flush()
		expect(w.findAll('[data-testid="cn-record-list-footnote"]').map((p) => p.text())).toEqual(['Een regel'])
	})
})

describe('CnWidgetWrapper headerWrap', () => {
	it('marks the header only when asked', () => {
		const wrapped = mount(CnWidgetWrapper, { props: { title: 'Rechten', headerWrap: true } })
		const plain = mount(CnWidgetWrapper, { props: { title: 'Rechten' } })
		expect(wrapped.find('.cn-widget-wrapper__header').classes()).toContain('cn-widget-wrapper__header--wrap')
		expect(plain.find('.cn-widget-wrapper__header').classes()).not.toContain('cn-widget-wrapper__header--wrap')
	})
})
