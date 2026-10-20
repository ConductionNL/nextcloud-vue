/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * On a record's page a banner's `visibleWhen.source` is scoped to that record
 * (`@objectId`), and a count condition keeps the first row as the subject.
 *
 * @spec openspec/changes/notice-scoped-to-the-record/specs/notice-scoped-to-the-record/spec.md#requirement-a-banners-source-may-be-scoped-to-the-pages-record
 */

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve))

const ADVICE = {
	lead: 'Advice requested',
	text: 'to {subject.advisor}.',
	visibleWhen: {
		source: { register: 'dossiq', schema: 'adviesAanvraag', filter: { case: '@objectId', status: 'requested' } },
		field: '@total',
		op: 'gt',
		value: 0,
	},
}

describe('CnBannerWidget scoped to the page record', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('asks for the record\'s rows and names the first one', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 1, results: [{ advisor: 'Mobiliteit en verkeer' }] }) })
		const wrapper = mount(CnBannerWidget, {
			propsData: ADVICE,
			provide: { cnObjectContext: ref({ objectId: 'case-1', object: null }) },
		})
		await flush()
		await flush()

		const url = decodeURIComponent(global.fetch.mock.calls[0][0])
		expect(url).toContain('/apps/openregister/api/objects/dossiq/adviesAanvraag')
		expect(url).toContain('case=case-1')
		expect(url).not.toContain('@objectId')
		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').text()).toContain('to Mobiliteit en verkeer.')
	})

	it('stays hidden when the record has no matching row', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 0, results: [] }) })
		const wrapper = mount(CnBannerWidget, {
			propsData: ADVICE,
			provide: { cnObjectContext: ref({ objectId: 'case-2', object: null }) },
		})
		await flush()
		await flush()

		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').exists()).toBe(false)
	})

	it('asks again once the record is known', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 1, results: [{ advisor: 'Juridische zaken' }] }) })
		const context = ref({ objectId: null, object: null })
		mount(CnBannerWidget, { propsData: ADVICE, provide: { cnObjectContext: context } })
		await flush()
		const before = global.fetch.mock.calls.length

		context.value = { objectId: 'case-3', object: null }
		await flush()
		await flush()

		expect(global.fetch.mock.calls.length).toBeGreaterThan(before)
		expect(decodeURIComponent(global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0])).toContain('case=case-3')
	})
})
