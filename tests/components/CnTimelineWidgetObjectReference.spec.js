/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqEvenement: "Evenement aangemaakt in campagne Warmtenet Oost 2026".
 * The event holds its campaign as an id; `resolve` names the record a
 * reference points at, so a label's `{object.campaign}` reads its title.
 *
 * @spec openspec/changes/timeline-label-reads-a-reference/specs/timeline-widget/spec.md#requirement-a-label-can-name-the-record-a-reference-points-at
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))
const mockResolve = jest.fn(async () => ({ c1: 'Warmtenet Oost 2026' }))
jest.mock('../../src/composables/useRefLabels.js', () => ({
	...jest.requireActual('../../src/composables/useRefLabels.js'),
	useRefLabels: () => ({ resolve: mockResolve }),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const AUDIT = [{ id: 1, action: 'create', user: 'Pieter Jansen', created: '2026-09-24T10:00:00Z' }]

function mountWidget(content) {
	axios.get.mockResolvedValue({ data: { results: AUDIT } })
	return mount(CnTimelineWidget, {
		props: { register: 'pipelinq', schema: 'campaignEvent', objectId: 'e1', object: { id: 'e1', campaign: 'c1' }, content },
	})
}

const labels = (w) => w.findAll('.cn-timeline-widget__label').map((n) => n.text())

beforeEach(() => {
	axios.get.mockReset()
	mockResolve.mockClear()
})

describe('CnTimelineWidget resolve', () => {
	it('names the record a reference points at in a label', async () => {
		const w = mountWidget({
			auditTrail: true,
			actionLabels: { create: 'Event created in campaign {object.campaign}' },
			resolve: { campaign: { schema: 'campaign' } },
		})
		await flushPromises()
		await flushPromises()
		expect(mockResolve).toHaveBeenCalledWith('pipelinq', 'campaign', ['c1'], '')
		expect(labels(w)).toEqual(['Event created in campaign Warmtenet Oost 2026'])
	})

	it('keeps the id without resolve', async () => {
		const w = mountWidget({ auditTrail: true, actionLabels: { create: 'Event created in campaign {object.campaign}' } })
		await flushPromises()
		expect(mockResolve).not.toHaveBeenCalled()
		expect(labels(w)).toEqual(['Event created in campaign c1'])
	})
})
