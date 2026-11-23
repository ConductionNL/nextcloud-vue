/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A change label can say from what to what (`{from}`, `{to}`), name a user or
 * group by display name (`values`), and show a note under its entry (`note`):
 * a ticket's handover history, "Passed to Samira Haddou by Lotte".
 *
 * @spec openspec/changes/audit-change-from-to/specs/audit-trail/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('../../src/utils/userDisplayName.js', () => ({ __esModule: true, userDisplayName: (uid) => ({ samira: 'Samira Haddou', lotte: 'Lotte Mulder' })[uid] || '' }))
jest.mock('../../src/utils/groupAutocomplete.js', () => ({ __esModule: true, groupDisplayName: (gid) => (gid === 'kcc' ? 'KCC Team' : null), loadGroupDisplayName: jest.fn(() => Promise.resolve('')) }))

const { auditLabel, changeNote, changeRuleFor, changeSideValue } = require('../../src/utils/auditLabels.js')
const { auditValueName } = require('../../src/utils/auditValueName.js')
const { loadGroupDisplayName } = require('../../src/utils/groupAutocomplete.js')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

const HANDOVER = { id: '1', action: 'update', user: 'lotte', changed: { assignee: { old: 'lotte', new: 'samira' }, handoverNote: { new: 'Customer calls back Monday' } } }
const MOVED = { id: '2', action: 'update', user: 'lotte', changed: { status: { old: 'new', new: 'open' } } }
const RULES = {
	changeLabels: [
		{ field: 'assignee', values: 'user', note: 'handoverNote', label: 'Passed from {from} to {to} by {actor}' },
		{ field: 'team', values: 'group', label: 'Moved to team {to}' },
		{ field: 'status', label: 'Status {from} → {to}' },
	],
	valueLabels: { status: { new: 'New', open: 'Open' } },
}

describe('change labels from and to', () => {
	it('fills {from} and {to} with the rule field\'s old and new value, in valueLabels words', () => {
		expect(auditLabel(MOVED, RULES, { actor: 'Lotte' })).toBe('Status New → Open')
	})

	it('names user and group ids by display name with values', () => {
		expect(auditLabel(HANDOVER, RULES, { actor: 'Lotte Mulder', names: auditValueName })).toBe('Passed from Lotte Mulder to Samira Haddou by Lotte Mulder')
		expect(auditLabel({ action: 'update', changed: { team: { new: 'kcc' } } }, RULES, { names: auditValueName })).toBe('Moved to team KCC Team')
	})

	it('reads ids as they are without a name lookup, and while a name loads', () => {
		expect(auditLabel(HANDOVER, RULES, { actor: 'Lotte' })).toBe('Passed from lotte to samira by Lotte')
		expect(auditLabel({ action: 'update', changed: { team: { new: 'backoffice' } } }, RULES, { names: auditValueName })).toBe('Moved to team backoffice')
		expect(loadGroupDisplayName).toHaveBeenCalledWith('backoffice')
	})

	it('leaves {from} empty when the entry recorded only the new value', () => {
		const rule = changeRuleFor({ changed: { status: 'open' } }, RULES.changeLabels)
		expect(changeSideValue({ changed: { status: 'open' } }, rule, 'old')).toBe('')
		expect(changeSideValue({ changed: { status: 'open' } }, rule, 'new', { valueLabels: RULES.valueLabels })).toBe('Open')
	})

	it('gives the rule\'s note, and none without one', () => {
		expect(changeNote(HANDOVER, changeRuleFor(HANDOVER, RULES.changeLabels))).toBe('Customer calls back Monday')
		expect(changeNote(MOVED, changeRuleFor(MOVED, RULES.changeLabels))).toBe('')
		expect(changeNote(MOVED, null)).toBe('')
	})
})

describe('CnAuditTrailCard with a handover rule', () => {
	it('draws the worded handover and its note under the entry', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [HANDOVER, MOVED] }) })
		const wrapper = mount(CnAuditTrailCard, {
			propsData: { register: 'r1', schema: 's1', objectId: 'o1', changeLabels: RULES.changeLabels, valueLabels: RULES.valueLabels },
		})
		await flushPromises()
		const text = wrapper.text()
		expect(text).toContain('Passed from Lotte Mulder to Samira Haddou by Lotte Mulder')
		expect(text).toContain('Status New → Open')
		const notes = wrapper.findAll('[data-testid="cn-audit-card-note"]')
		expect(notes).toHaveLength(1)
		expect(notes[0].text()).toBe('Customer calls back Monday')
		wrapper.unmount()
	})
})
