/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * What an audit entry says in words, shared by the History card and the
 * timeline: an action label or a change label, filled with the actor and the
 * values the entry recorded, old and new ("Places raised from 60 to 80").
 *
 * @spec openspec/changes/timeline-worded-history/specs/timeline-widget/spec.md#requirement-a-timeline-says-what-an-audit-entry-changed-in-words
 */
import { auditLabel, changedValue } from '../../src/utils/auditLabels.js'

const RAISED = { action: 'update', user: 'lotte', changed: { capacity: { old: 60, new: 80 }, data: { new: { fileName: 'a.pdf' } } } }

describe('changedValue', () => {
	it('reads the new value by default and the old one on request', () => {
		expect(changedValue(RAISED, 'capacity')).toBe('80')
		expect(changedValue(RAISED, 'capacity.new')).toBe('80')
		expect(changedValue(RAISED, 'capacity.old')).toBe('60')
	})

	it('reads into a recorded object', () => {
		expect(changedValue(RAISED, 'data.fileName')).toBe('a.pdf')
	})

	it('words a value through valueLabels', () => {
		expect(changedValue({ changed: { status: { new: 'waitlist' } } }, 'status', { status: { waitlist: 'Waiting list' } })).toBe('Waiting list')
	})
})

describe('auditLabel', () => {
	const rules = { changeLabels: [{ field: 'capacity', label: 'Places raised from {changed.capacity.old} to {changed.capacity.new}' }], actionLabels: { create: 'Created by {actor}' } }

	it('words a change by the field it changed', () => {
		expect(auditLabel(RAISED, rules, { actor: 'Lotte Mulder' })).toBe('Places raised from 60 to 80')
	})

	it('words an action, with the actor', () => {
		expect(auditLabel({ action: 'create' }, rules, { actor: 'Pieter Jansen' })).toBe('Created by Pieter Jansen')
	})

	it('answers null where nothing is declared', () => {
		expect(auditLabel({ action: 'delete' }, rules, {})).toBeNull()
	})
})

describe('auditLabel with a label that depends on the record', () => {
	const rules = {
		actionLabels: {
			create: [
				{ when: { field: 'campaign', op: 'notEmpty' }, text: 'Event created in campaign {object.campaign}' },
				{ text: 'Event created' },
			],
		},
	}

	it('takes the first entry whose condition holds for the record', () => {
		expect(auditLabel({ action: 'create' }, rules, { object: { campaign: 'Warmtenet Oost 2026' } })).toBe('Event created in campaign Warmtenet Oost 2026')
	})

	it('falls back to an entry without a condition', () => {
		expect(auditLabel({ action: 'create' }, rules, { object: { campaign: '' } })).toBe('Event created')
		expect(auditLabel({ action: 'create' }, rules, {})).toBe('Event created')
	})
})

/**
 * @spec openspec/changes/audit-label-action-prefix/specs/audit-trail/spec.md#requirement-an-action-label-can-cover-every-action-under-a-prefix
 * @spec openspec/changes/audit-label-action-prefix/specs/audit-trail/spec.md#requirement-a-label-can-name-the-tool-an-entry-records
 */
describe('auditLabel with a label for every action under a prefix', () => {
	const rules = { actionLabels: { 'mcp.*': 'Assistant: {toolId}', 'mcp.lead.*': 'Assistant on leads', 'mcp.close': 'Closed by the assistant' } }

	it('words an action through the wildcard key, with the tool it records', () => {
		expect(auditLabel({ action: 'mcp.search', toolId: 'stackiq.module.search' }, rules)).toBe('Assistant: stackiq.module.search')
	})

	it('takes the most specific wildcard first', () => {
		expect(auditLabel({ action: 'mcp.lead.search', toolId: 'pipelinq.lead.search' }, rules)).toBe('Assistant on leads')
	})

	it('lets an exact key win over a wildcard', () => {
		expect(auditLabel({ action: 'mcp.close', toolId: 'x.close' }, rules)).toBe('Closed by the assistant')
	})

	it('does not cover the prefix itself or another action', () => {
		expect(auditLabel({ action: 'mcp' }, rules)).toBeNull()
		expect(auditLabel({ action: 'update' }, rules)).toBeNull()
	})

	it('leaves {toolId} empty for an entry without a tool', () => {
		expect(auditLabel({ action: 'mcp.search' }, rules)).toBe('Assistant: ')
	})
})
