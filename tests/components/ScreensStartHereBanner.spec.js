/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-start-here-banner: an attention card that names ONE record, the first
 * row of an ordered query ("Begin hier"), and shows nothing when the query is
 * empty.
 *
 * @spec openspec/changes/screens-start-here-banner/specs/start-here-banner/spec.md
 */
import { mount } from '@vue/test-utils'
import { fillTemplate } from '@/utils/fillTemplate.js'
import { readVisibleWhenValue } from '@/utils/visibleWhen.js'

const CnBannerWidget = require('../../src/components/CnBannerWidget/CnBannerWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve))

const ROW = { id: 't-9', title: 'Afvalpas werkt niet bij de container', contactName: 'M. de Graaf', createdAt: '2026-10-04T08:00:00Z' }

const CARD = {
	layout: 'attention',
	variant: 'info',
	kicker: 'Start here',
	title: '{subject.title}',
	reason: '{subject.contactName} has waited {subject.createdAt|days} days.',
	actions: [{ label: 'Answer now', route: { name: 'TicketDetail', params: { id: '@subject.id' } } }],
	visibleWhen: {
		source: { register: 'pipelinq', schema: 'ticket', filter: { assignee: '@me', status: { in: ['new'] } }, order: { slaDeadline: 'asc' } },
		field: 'id',
		op: 'notEmpty',
	},
}

const router = () => ({ push: jest.fn().mockResolvedValue(), resolve: (l) => ({ href: `/app/${l.name}/${l.params ? l.params.id : ''}` }) })

describe('start-here banner', () => {
	afterEach(() => {
		delete global.fetch
		jest.useRealTimers()
	})

	it('asks for the first row of the ordered query', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [ROW], total: 3 }) })
		mount(CnBannerWidget, { propsData: CARD, mocks: { $router: router() } })
		await flush()
		const url = decodeURIComponent(global.fetch.mock.calls[0][0])
		expect(url).toContain('/apps/openregister/api/objects/pipelinq/ticket')
		expect(url).toContain('_order[slaDeadline]=asc')
		expect(url).toContain('_limit=1')
		expect(url).toContain('status[in][]=new')
	})

	it('names the row in the title and the reason, and routes the action to its id', async () => {
		jest.useFakeTimers({ now: new Date('2026-10-07T08:00:00Z'), doNotFake: ['setTimeout'] })
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [ROW], total: 1 }) })
		const wrapper = mount(CnBannerWidget, { propsData: CARD, mocks: { $router: router() } })
		await flush()
		expect(wrapper.find('.cn-banner-widget__title').text()).toBe('Afvalpas werkt niet bij de container')
		expect(wrapper.find('.cn-banner-widget__reason').text()).toBe('M. de Graaf has waited 3 days.')
		expect(wrapper.find('[data-testid="cn-banner-widget-action"]').attributes('href')).toBe('/app/TicketDetail/t-9')
	})

	it('shows nothing when the query is empty', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [], total: 0 }) })
		const wrapper = mount(CnBannerWidget, { propsData: CARD, mocks: { $router: router() } })
		await flush()
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-banner-widget-unchecked"]').exists()).toBe(false)
	})

	it('renders from a row the page already read, without a second request', async () => {
		global.fetch = jest.fn()
		const wrapper = mount(CnBannerWidget, {
			propsData: { ...CARD, conditionOutcome: { met: true, value: 't-9', row: ROW } },
			mocks: { $router: router() },
		})
		await flush()
		expect(global.fetch).not.toHaveBeenCalled()
		expect(wrapper.find('.cn-banner-widget__title').text()).toBe('Afvalpas werkt niet bij de container')
	})

	it('keeps {value} working next to subject tokens, and does not name a failed check by a template', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })
		const wrapper = mount(CnBannerWidget, { propsData: CARD })
		await flush()
		expect(wrapper.find('[data-testid="cn-banner-widget-unchecked"] .cn-banner-widget__unchecked-text').text()).toBe('Could not check')
	})

	it('without subject tokens a card is untouched', async () => {
		const wrapper = mount(CnBannerWidget, { propsData: { layout: 'attention', title: 'Plain {value}', reason: 'Because' } })
		await flush()
		expect(wrapper.find('.cn-banner-widget__title').text()).toBe('Plain {value}')
	})
})

describe('readVisibleWhenValue sink and fillTemplate days', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('hands the first row to the sink', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [ROW, { id: 'x' }], total: 2 }) })
		const sink = {}
		const value = await readVisibleWhenValue({ source: { register: 'r', schema: 's' }, field: 'id' }, undefined, sink)
		expect(value).toBe('t-9')
		expect(sink.row).toEqual(ROW)
	})

	it('days counts whole days since the date', () => {
		const now = new Date('2026-10-07T12:00:00Z')
		expect(fillTemplate('{a|days} d', { a: '2026-10-04T08:00:00Z' }, now)).toBe('3 d')
		expect(fillTemplate('{a|days} d', { a: 'nope' }, now)).toBe('')
	})
})
