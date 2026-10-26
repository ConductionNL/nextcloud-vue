/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An object's history includes the events of records beside it
 * (`relatedSources`): DqSociaalDomein's Historie shows "Toestemming
 * vastgelegd", written on the consent's trail, beside the case's own events.
 *
 * @spec openspec/changes/audit-trail-related-sources/specs/audit-trail/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnAuditTrailCard from '../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue'

const CASE_TRAIL = [{ id: 1, action: 'update', actor: 'fatma', created: '2026-10-04T09:00:00Z' }]
const CONSENT_TRAIL = [{ id: 2, action: 'create', actor: 'fatma', created: '2026-10-03T09:00:00Z' }]

function answer(body, ok = true) {
	return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) })
}

function respond({ consentListFails = false } = {}) {
	global.fetch = jest.fn((url) => {
		if (url.includes('/objects/dossiq/case/case-1/audit-trails')) {
			return answer({ results: CASE_TRAIL })
		}
		if (url.includes('/objects/dossiq/toestemming?')) {
			return consentListFails ? answer({}, false) : answer({ results: [{ id: 'consent-1' }] })
		}
		if (url.includes('/objects/dossiq/toestemming/consent-1/audit-trails')) {
			return answer({ results: CONSENT_TRAIL })
		}
		return answer({}, false)
	})
}

afterEach(() => {
	delete global.fetch
})

const props = {
	register: 'dossiq',
	schema: 'case',
	objectId: 'case-1',
	maxDisplay: 10,
	relatedSources: [{ as: 'consent', register: 'dossiq', schema: 'toestemming', filter: { caseId: '@objectId' } }],
	actionLabels: { update: 'Case changed', create: 'Case created', 'consent.create': 'Consent recorded' },
}

const actions = (w) => w.findAll('.cn-audit-card__action').map((row) => row.text())

describe('CnAuditTrailCard relatedSources', () => {
	it('merges the related records\' events, newest first, labelled by their source', async () => {
		respond()
		const w = mount(CnAuditTrailCard, { propsData: props })
		await flushPromises()
		expect(actions(w)).toEqual(['Case changed', 'Consent recorded'])
		const listCall = global.fetch.mock.calls.map(([url]) => url).find((url) => url.includes('/objects/dossiq/toestemming?'))
		expect(listCall).toContain('caseId=case-1')
		expect(listCall).toContain('_limit=5')
	})

	it('shows the object\'s own trail when a related read fails, without saying it failed', async () => {
		respond({ consentListFails: true })
		const w = mount(CnAuditTrailCard, { propsData: props })
		await flushPromises()
		expect(actions(w)).toEqual(['Case changed'])
		expect(w.find('[data-testid="cn-audit-card-failed"]').exists()).toBe(false)
	})

	it('reads nothing more without relatedSources', async () => {
		respond()
		const w = mount(CnAuditTrailCard, { propsData: { ...props, relatedSources: [] } })
		await flushPromises()
		expect(actions(w)).toEqual(['Case changed'])
		expect(global.fetch).toHaveBeenCalledTimes(1)
	})
})
