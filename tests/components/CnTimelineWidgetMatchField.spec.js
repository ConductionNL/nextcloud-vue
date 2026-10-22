/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTimelineWidget `related[].matchField` and `summaryField`: related rows
 * found by a field of the current object (a pupil's user id) instead of its
 * id, each with a summary line; nothing is read while that field is empty.
 *
 * @spec openspec/changes/timeline-match-field/specs/timeline-widget/spec.md#requirement-related-rows-can-match-a-field-of-the-current-object
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((path) => `/index.php${path}`) }))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const PROFILE = { id: 'lp-1', ncUserId: 'pupil-1' }
const CONTENT = {
	related: [
		{ schema: 'dossier-note', field: 'learnerId', matchField: 'ncUserId', label: 'Note', dateField: 'createdAt', titleField: 'title', summaryField: 'body' },
		{ schema: 'behaviour-incident', field: 'learnerRef', label: 'Incident', dateField: 'occurredAt' },
	],
}

describe('CnTimelineWidget matchField', () => {
	beforeEach(() => axios.get.mockReset())

	it('matches a related schema on a field of the current object and shows its summary', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({ data: { results: url.includes('dossier-note')
			? [{ id: 'n1', createdAt: '2026-10-01T09:00:00Z', title: 'Talk with mother', body: 'Agreed on homework help.' }]
			: [] } }))
		const wrapper = mount(CnTimelineWidget, { props: { register: 'school', schema: 'learner-profile', objectId: 'lp-1', object: PROFILE, content: CONTENT } })
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/school/dossier-note', { params: { learnerId: 'pupil-1', _limit: 50 } })
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/school/behaviour-incident', { params: { learnerRef: 'lp-1', _limit: 50 } })
		const event = wrapper.find('[data-testid="cn-timeline-widget-event"]')
		expect(event.text()).toContain('Talk with mother')
		expect(event.text()).toContain('Agreed on homework help.')
	})

	it('reads nothing for a related schema whose match field is empty', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		mount(CnTimelineWidget, { props: { register: 'school', schema: 'learner-profile', objectId: 'lp-1', object: { id: 'lp-1' }, content: CONTENT } })
		await flushPromises()
		expect(axios.get.mock.calls.map((call) => call[0])).toEqual(['/index.php/apps/openregister/api/objects/school/behaviour-incident'])
	})
})
