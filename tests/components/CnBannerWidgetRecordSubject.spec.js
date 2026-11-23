/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A banner on a record's page that is about the record itself: the archived
 * strip. Its condition reads the page's record, the record is its subject, and
 * a sentence whose subject token has no value falls back to the shorter one.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-banner-can-read-the-pages-record
 */
import { mount } from '@vue/test-utils'
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const ARCHIVED = {
	lead: 'This record is archived. {subject.@self.archived.by} filed it on {subject.@self.archived.at|date}. You can read it.',
	fallbackLead: 'This record is archived. You can read it.',
	text: '{subject.@self.archived.reason}',
	visibleWhen: { field: '@self.archived', op: 'notEmpty' },
}

function mountBanner(record, content = ARCHIVED) {
	return mount(CnBannerWidget, {
		props: { content, objectData: record },
		global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
}

describe('CnBannerWidget — the record is the subject', () => {
	it('says nothing on a record that is not archived', async () => {
		const wrapper = mountBanner({ id: 'r-1', '@self': { id: 'r-1' } })
		await flush()
		expect(wrapper.find('[data-testid="cn-banner-widget-lead"]').exists()).toBe(false)
		expect(wrapper.text()).toBe('')
	})

	it('names who archived the record and why', async () => {
		const wrapper = mountBanner({ id: 'r-1', '@self': { id: 'r-1', archived: { by: 'Pieter', at: '2026-10-01T10:00:00Z', reason: 'Closed and filed' } } })
		await flush()
		expect(wrapper.find('[data-testid="cn-banner-widget-lead"]').text()).toContain('Pieter filed it on')
		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').text()).toContain('Closed and filed')
	})

	it('says the shorter sentence when the marker names nobody', async () => {
		const wrapper = mountBanner({ id: 'r-1', '@self': { id: 'r-1', archived: { at: '2026-10-01' } } })
		await flush()
		expect(wrapper.find('[data-testid="cn-banner-widget-lead"]').text()).toBe('This record is archived. You can read it.')
	})

	it('answers again when the record changes', async () => {
		const wrapper = mountBanner({ id: 'r-1', '@self': { id: 'r-1' } })
		await flush()
		expect(wrapper.text()).toBe('')
		await wrapper.setProps({ objectData: { id: 'r-1', '@self': { id: 'r-1', archived: { by: 'Pieter', at: '2026-10-01' } } } })
		await flush()
		expect(wrapper.text()).toContain('Pieter')
	})
})

describe('CnBannerWidget — an endpoint that names the record', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('asks the record\'s endpoint and fills the texts from its answer', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ dueForReview: true, plan: { reviewDate: '2026-09-01' } }) }))
		const wrapper = mount(CnBannerWidget, {
			props: {
				content: {
					variant: 'warning',
					text: 'Due for review since {subject.plan.reviewDate}.',
					visibleWhen: { endpoint: '/apps/x/api/plans/@object.planId', field: 'dueForReview', op: 'eq', value: true },
				},
				objectData: { id: 'r-1', planId: 'p-9' },
			},
			global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
		})
		await flush()
		await flush()
		expect(global.fetch.mock.calls[0][0]).toContain('/apps/x/api/plans/p-9')
		expect(wrapper.text()).toContain('Due for review since 2026-09-01.')
	})

	it('does not ask before the record is known', async () => {
		global.fetch = jest.fn()
		mount(CnBannerWidget, {
			props: { content: { text: 'x', visibleWhen: { endpoint: '/apps/x/api/plans/@objectId', field: 'due' } } },
		})
		await flush()
		expect(global.fetch).not.toHaveBeenCalled()
	})
})
