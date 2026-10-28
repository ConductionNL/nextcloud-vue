/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A banner's subject tokens can name an app formatter: PqDashboard's "Eerst,
 * vandaag" reads "Via telefoon" from a ticket whose channel is stored as
 * `phone` (`{subject.channel|channelWord}`).
 *
 * @spec openspec/changes/screens-start-here-banner/specs/start-here-banner/spec.md#requirement-a-banner-can-name-the-first-row-of-a-query
 */
import { mount } from '@vue/test-utils'

const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default

describe('CnBannerWidget subject formatters', () => {
	const content = {
		layout: 'attention',
		variant: 'error',
		title: 'Question from {subject.clientName} about {subject.title}',
		text: '{subject.title}',
		reason: 'Via {subject.channel|channelWord} · waiting {subject.waitingDays} days.',
		visibleWhen: { endpoint: '/apps/pipelinq/api/worklist/first', field: 'found', op: 'eq', value: true },
	}
	const row = { found: true, title: 'the waste pass', clientName: 'M. de Graaf', channel: 'phone', waitingDays: 3 }

	it('fills a subject token through the app formatter it names', () => {
		const wrapper = mount(CnBannerWidget, {
			props: { content, conditionOutcome: { met: true, value: true, row } },
			global: { provide: { cnFormatters: { channelWord: (value) => ({ phone: 'telefoon' }[value] || value) } } },
		})
		expect(wrapper.find('.cn-banner-widget__title').text()).toBe('Question from M. de Graaf about the waste pass')
		expect(wrapper.find('.cn-banner-widget__reason').text()).toBe('Via telefoon · waiting 3 days.')
	})

	it('falls back to fallbackTitle when a title token is empty', () => {
		const wrapper = mount(CnBannerWidget, {
			props: { content: { ...content, fallbackTitle: '{subject.title}' }, conditionOutcome: { met: true, value: true, row: { ...row, clientName: '' } } },
			global: { provide: { cnFormatters: { channelWord: (value) => value } } },
		})
		expect(wrapper.find('.cn-banner-widget__title').text()).toBe('the waste pass')
	})
})
