/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which audit entries a history shows: not the actions or actors it leaves
 * out, and not an update that changed nothing. The History card and a tab
 * that counts the history agree because both read this.
 *
 * @spec openspec/changes/tab-count-audit-trail/specs/tab-counts/spec.md#requirement-a-history-tab-can-count-the-records-changes
 */
import { keepAuditEntries } from '../../src/utils/auditEntries.js'

const ENTRIES = [
	{ action: 'create', user: 'pieter' },
	{ action: 'read', user: 'pieter' },
	{ action: 'update', user: 'System', changed: { status: { old: 'draft', new: 'active' } } },
	{ action: 'update', user: 'pieter', changed: { '@self': { old: 1, new: 2 } } },
	{ action: 'update', user: 'pieter', changed: { flowStatus: { old: 'not_compiled', new: 'compiled' } } },
]

describe('keepAuditEntries', () => {
	it('leaves out excluded actions and updates that changed nothing', () => {
		expect(keepAuditEntries(ENTRIES, { excludeActions: ['READ'] })).toHaveLength(3)
	})

	it('leaves out excluded actors', () => {
		expect(keepAuditEntries(ENTRIES, { excludeActions: ['read'], excludeActors: ['system'] })).toHaveLength(2)
	})

	it('keeps everything but empty updates without options', () => {
		expect(keepAuditEntries(ENTRIES)).toHaveLength(4)
	})
})
