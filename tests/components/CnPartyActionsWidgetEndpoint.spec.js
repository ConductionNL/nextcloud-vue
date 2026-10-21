/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * party-actions growth: indicators read from an app endpoint with their
 * severity, period, source and an "I have seen this" acknowledgement that
 * then reads "Seen by ... on ..."; quick actions whose target takes a
 * `|tel`, `|mailto` or `|geo` filter and are left out when the value does not
 * make a link; and an action label filled from the record.
 *
 * @spec openspec/changes/party-actions-endpoint-indicators/specs/party-actions-widget/spec.md
 */
var mockGet = jest.fn()
var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { flushPromises, mount } from '@vue/test-utils'
import { contactHref } from '../../src/utils/contactHref.js'

const CnPartyActionsWidget = require('../../src/components/CnPartyActionsWidget/CnPartyActionsWidget.vue').default

const SOURCE = {
	url: '/apps/pipelinq/api/leaves/party/@objectId',
	itemsPath: 'indicators',
	labelPath: 'label',
	tonePath: 'severity',
	toneMap: { critical: 'error', warning: 'warning', info: 'info' },
	toneLabels: { critical: 'Critical', warning: 'Warning', info: 'Information' },
	meta: [['From {validFrom|date} until {validUntil|date}', 'Since {validFrom|date}'], ['Source: {source}']],
	ack: {
		whenPath: 'requiresAcknowledgement',
		donePath: 'acknowledgedAt',
		endpoint: '/apps/pipelinq/api/party-indicator-values/{id}/acknowledge',
		label: 'I have seen this',
		seen: 'Seen by {acknowledgedBy} on {acknowledgedAt|date}',
		errorText: 'The acknowledgement could not be saved.',
	},
}

const ROWS = [
	{ id: 'v-1', label: 'Aggression', severity: 'critical', validFrom: '2026-01-05', requiresAcknowledgement: true, acknowledgedAt: null, source: 'Police' },
	{ id: 'v-2', label: 'Deceased', severity: 'info', validFrom: '2026-02-01', validUntil: '2026-03-01', requiresAcknowledgement: true, acknowledgedAt: '2026-02-02', acknowledgedBy: 'Pieter' },
]

/**
 * Mount the band for party p-1.
 *
 * @param {object} content The content.
 * @param {object} [objectData] The record.
 * @return {object} The wrapper.
 */
function mountBand(content, objectData = { id: 'p-1' }) {
	return mount(CnPartyActionsWidget, {
		props: { content, objectData, objectId: 'p-1' },
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: {
				CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' },
				NcButton: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
			},
		},
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockGet.mockResolvedValue({ data: { indicators: ROWS } })
})

describe('CnPartyActionsWidget: indicators from an endpoint', () => {
	it('reads the endpoint for the party and draws each indicator with its severity and meta line', async () => {
		const w = mountBand({ indicatorSource: SOURCE })
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/nc/apps/pipelinq/api/leaves/party/p-1')
		const items = w.findAll('.cn-party-actions-widget__indicator')
		expect(items).toHaveLength(2)
		expect(items[0].classes()).toContain('cn-party-actions-widget__indicator--error')
		expect(items[0].find('[data-testid="cn-party-indicator-tone"]').text()).toBe('Critical')
		expect(items[0].find('[data-testid="cn-party-indicator-meta"]').text()).toMatch(/^Since .+ · Source: Police$/)
		expect(items[1].find('[data-testid="cn-party-indicator-meta"]').text()).toMatch(/^From .+ until .+$/)
	})

	it('asks for an acknowledgement where it is needed and says who saw the others', async () => {
		const w = mountBand({ indicatorSource: SOURCE })
		await flushPromises()
		const items = w.findAll('.cn-party-actions-widget__indicator')
		expect(items[0].find('[data-testid="cn-party-indicator-ack"]').text()).toBe('I have seen this')
		expect(items[1].find('[data-testid="cn-party-indicator-ack"]').exists()).toBe(false)
		expect(items[1].find('[data-testid="cn-party-indicator-seen"]').text()).toMatch(/^Seen by Pieter on .+/)
	})

	it('posts the acknowledgement and reads the indicators again', async () => {
		mockPost.mockResolvedValue({ data: {} })
		const w = mountBand({ indicatorSource: SOURCE })
		await flushPromises()
		await w.find('[data-testid="cn-party-indicator-ack"]').trigger('click')
		await flushPromises()
		expect(mockPost).toHaveBeenCalledWith('/nc/apps/pipelinq/api/party-indicator-values/v-1/acknowledge')
		expect(mockGet).toHaveBeenCalledTimes(2)
	})

	it('says so when the acknowledgement fails', async () => {
		mockPost.mockRejectedValue(new Error('down'))
		const w = mountBand({ indicatorSource: SOURCE })
		await flushPromises()
		await w.find('[data-testid="cn-party-indicator-ack"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-party-indicator-error"]').text()).toBe('The acknowledgement could not be saved.')
	})
})

describe('CnPartyActionsWidget: link filters and label templates', () => {
	const ACTIONS = [
		{ id: 'call', label: 'Call {phone}', type: 'navigate', target: '@object.phone|tel' },
		{ id: 'mail', label: 'Mail', type: 'navigate', target: '@object.email|mailto' },
		{ id: 'route', label: 'Directions', type: 'navigate', target: '@object.address|geo' },
	]

	it('turns the record values into links and fills the label', () => {
		const w = mountBand({ actions: ACTIONS }, { id: 'p-1', phone: '06 12 34 56 78', email: 'jan@example.nl', address: 'Dorpsstraat 4\n1234 AB Zuiddrecht' })
		const drawn = w.findComponent({ name: 'CnActionButtons' }).props('actions')
		expect(drawn.map((a) => [a.id, a.target, a.label])).toEqual([
			['call', 'tel:0612345678', 'Call 06 12 34 56 78'],
			['mail', 'mailto:jan@example.nl', 'Mail'],
			['route', 'geo:0,0?q=Dorpsstraat%204%2C%201234%20AB%20Zuiddrecht', 'Directions'],
		])
	})

	it('leaves out an action whose value makes no link', () => {
		const w = mountBand({ actions: ACTIONS }, { id: 'p-1', phone: 'unknown', email: 'not an address' })
		expect(w.findComponent({ name: 'CnActionButtons' }).exists()).toBe(false)
	})

	it('normalises phone numbers like a dialler', () => {
		expect(contactHref('tel', '+31 (0)6-12')).toBe('tel:+310612')
		expect(contactHref('tel', '0031 6 12')).toBe('tel:+31612')
		expect(contactHref('mailto', 'a@b.nl')).toBe('mailto:a@b.nl')
		expect(contactHref('geo', '')).toBeNull()
	})
})

describe('CnPartyActionsWidget: a source that fails, actions beside the list, reading again', () => {
	it('says the warnings could not be loaded instead of saying there are none', async () => {
		mockGet.mockRejectedValue(new Error('down'))
		const w = mountBand({ indicatorSource: { ...SOURCE, errorText: 'The list of warnings could not be loaded.' }, emptyText: 'No warnings on this record.' })
		await flushPromises()
		expect(w.find('[data-testid="cn-party-indicator-load-error"]').text()).toBe('The list of warnings could not be loaded.')
		expect(w.find('[data-testid="cn-party-indicator-load-error"]').attributes('role')).toBe('alert')
		expect(w.find('[data-testid="cn-party-actions-empty"]').exists()).toBe(false)
	})

	it('draws indicatorActions beside the indicators and emptyActions when there are none', async () => {
		const add = [{ id: 'add-warning', label: 'Add a warning', type: 'open-form' }]
		const w = mountBand({ indicatorSource: SOURCE, emptyActions: add, indicatorActions: add })
		await flushPromises()
		expect(w.find('[data-testid="cn-party-actions-indicator-actions"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-party-actions-add"]').exists()).toBe(false)

		mockGet.mockResolvedValue({ data: { indicators: [] } })
		const empty = mountBand({ indicatorSource: SOURCE, emptyActions: add, indicatorActions: add })
		await flushPromises()
		expect(empty.find('[data-testid="cn-party-actions-indicator-actions"]').exists()).toBe(false)
		expect(empty.find('[data-testid="cn-party-actions-add"]').exists()).toBe(true)
	})

	it('reads the indicators again when an object is created or the page asks', async () => {
		const w = mountBand({ indicatorSource: SOURCE })
		await flushPromises()
		window.dispatchEvent(new CustomEvent('cn-walkthrough:object-created', { detail: { id: 'n-1' } }))
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(2)
		w.unmount()
		window.dispatchEvent(new CustomEvent('cn-walkthrough:object-created', { detail: { id: 'n-2' } }))
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(2)
	})
})

describe('contactHref: numbers, mail and addresses as typed', () => {
	it.each([
		['06 12 34 56 78', 'tel:0612345678'],
		['+31 6-1234 5678', 'tel:+31612345678'],
		['0031 20 123 4567', 'tel:+31201234567'],
		['020/123.45.67', 'tel:0201234567'],
	])('dials %s as %s', (typed, href) => {
		expect(contactHref('tel', typed)).toBe(href)
	})

	it.each([null, '', 'n.v.t.'])('makes no call link for %s', (typed) => {
		expect(contactHref('tel', typed)).toBeNull()
	})

	it('mails an address, ignores something that is not one, and maps an address one line per comma', () => {
		expect(contactHref('mailto', ' info@bakkerijdejong.nl ')).toBe('mailto:info@bakkerijdejong.nl')
		expect(contactHref('mailto', 'bakkerij')).toBeNull()
		expect(contactHref('geo', 'Dorpsstraat 1\n1234 AB Utrecht')).toBe('geo:0,0?q=' + encodeURIComponent('Dorpsstraat 1, 1234 AB Utrecht'))
		expect(contactHref('geo', '   ')).toBeNull()
	})
})
