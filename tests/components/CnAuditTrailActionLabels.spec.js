/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A trail can say what happened in words (`actionLabels`): DqTaak reads
 * "Task picked up by Pieter Jansen" where the engine wrote `claim (active)`.
 *
 * @spec openspec/changes/audit-trail-action-labels/specs/audit-trail/spec.md#requirement-a-trail-can-say-what-happened-in-words
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnAuditTrailCard from '../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue'
import CnAuditTrailWidget from '../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue'

const ENTRIES = [
	{ id: 1, action: 'create', stateAfter: 'active', actor: 'flow', performerType: 'flow', created: '2026-10-05T14:20:00Z' },
	{ id: 2, action: 'claim', stateAfter: 'active', actor: 'pieter', actorDisplayName: 'Pieter Jansen', performerType: 'user', created: '2026-10-06T07:05:00Z' },
	{ id: 3, action: 'complete', stateAfter: 'completed', actor: 'pieter', performerType: 'user', created: '2026-10-07T07:05:00Z' },
	{ id: 4, action: 'escalate', stateAfter: 'active', actor: 'flow', created: '2026-10-08T07:05:00Z' },
]

const LABELS = {
	create: 'Task created',
	claim: 'Task picked up by {actor}',
	'complete:completed': 'Task finished by {actor}, {state}',
}

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: ENTRIES }) })
})

afterEach(() => {
	delete global.fetch
})

function rows(w) {
	return w.findAll('.cn-audit-card__row').map((row) => ({
		action: row.find('.cn-audit-card__action').text(),
		actor: row.find('.cn-audit-card__actor').text(),
	}))
}

describe('CnAuditTrailCard actionLabels', () => {
	it('words an action, an action in a state, and fills in who did it', async () => {
		const w = mount(CnAuditTrailCard, { propsData: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, actionLabels: LABELS } })
		await flushPromises()
		const shown = rows(w)
		expect(shown[0].action).toBe('Task created')
		expect(shown[1].action).toBe('Task picked up by Pieter Jansen')
		expect(shown[2].action).toBe('Task finished by pieter, completed')
	})

	it('names the actor once: not again under a label that already does', async () => {
		const w = mount(CnAuditTrailCard, { propsData: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, actionLabels: LABELS } })
		await flushPromises()
		const shown = rows(w)
		expect(shown[1].actor).toBe('')
		expect(shown[0].actor).toContain('flow')
	})

	it('keeps the raw action for one the labels do not name', async () => {
		const w = mount(CnAuditTrailCard, { propsData: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, actionLabels: LABELS } })
		await flushPromises()
		expect(rows(w)[3].action).toBe('escalate (active)')
	})

	it('reads the labels from widget content, through the app\'s translate', async () => {
		const DUTCH = { 'Task picked up by {actor}': 'Taak opgepakt door {actor}' }
		const w = mount(CnAuditTrailWidget, {
			props: { content: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, actionLabels: LABELS } },
			global: { provide: { cnTranslate: (s) => DUTCH[s] || s } },
		})
		await flushPromises()
		expect(rows(w)[1].action).toBe('Taak opgepakt door Pieter Jansen')
	})
})
