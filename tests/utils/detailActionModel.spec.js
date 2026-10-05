// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import {
	groupMenuEntries,
	isChecklistItemDone,
	normalisePinnedAction,
	resolveNextStep,
	resolvePill,
	resolveTabCount,
	stageEntry,
	stageOf,
} from '../../src/utils/detailActionModel.js'

describe('detailActionModel', () => {
	describe('stageOf / stageEntry', () => {
		it('reads the stage from status by default and from a dot-path when told', () => {
			expect(stageOf({ status: 'received' })).toBe('received')
			expect(stageOf({ '@self': { stage: 'b' } }, '@self.stage')).toBe('b')
			expect(stageOf({ status: 3 })).toBe('3')
		})

		it('answers an empty stage for no record, no value or an object value', () => {
			expect(stageOf(null)).toBe('')
			expect(stageOf({})).toBe('')
			expect(stageOf({ status: { id: 1 } })).toBe('')
		})

		it('matches a stage exactly first, then ignoring case', () => {
			expect(stageEntry({ open: 1, Open: 2 }, 'Open')).toBe(2)
			expect(stageEntry({ in_behandeling: 'x' }, 'In_Behandeling')).toBe('x')
			expect(stageEntry({ open: 1 }, 'closed')).toBeUndefined()
			expect(stageEntry(null, 'open')).toBeUndefined()
			expect(stageEntry({ '': 1 }, '')).toBeUndefined()
		})
	})

	describe('normalisePinnedAction', () => {
		it('treats a string as the id of a declared action', () => {
			expect(normalisePinnedAction('message', 'x')).toEqual({ id: 'message', inline: null })
		})

		it('keeps an inline action and gives it an id when it has none', () => {
			expect(normalisePinnedAction({ label: 'Take on', type: 'api-call' }, 'cn-primary'))
				.toEqual({ id: 'cn-primary', inline: { id: 'cn-primary', label: 'Take on', type: 'api-call' } })
			expect(normalisePinnedAction({ id: 'take', label: 'Take on' }, 'cn-primary').id).toBe('take')
		})

		it('drops what it cannot render', () => {
			expect(normalisePinnedAction('', 'x')).toBeNull()
			expect(normalisePinnedAction(null, 'x')).toBeNull()
			expect(normalisePinnedAction({ id: 'no-label' }, 'x')).toBeNull()
			expect(normalisePinnedAction(['a'], 'x')).toBeNull()
		})
	})

	describe('groupMenuEntries', () => {
		const entries = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]
		const actions = {
			a: { group: 'Case' },
			b: {},
			c: { group: 'Publication' },
			d: { group: 'Case' },
			e: { adminOnly: true, group: 'Case' },
		}

		it('puts ungrouped entries first, then groups in first appearance order', () => {
			const groups = groupMenuEntries(entries, actions)
			expect(groups.map((g) => g.label)).toEqual(['', 'Case', 'Publication'])
			expect(groups[1].entries.map((e) => e.id)).toEqual(['a', 'd'])
		})

		it('hides admin only entries from everyone else', () => {
			const ids = groupMenuEntries(entries, actions).flatMap((g) => g.entries.map((e) => e.id))
			expect(ids).not.toContain('e')
		})

		it('gives admins the admin entries as the last group', () => {
			const groups = groupMenuEntries(entries, actions, { isAdmin: true, adminLabel: 'Administration' })
			const last = groups[groups.length - 1]
			expect(last.label).toBe('Administration')
			expect(last.entries.map((e) => e.id)).toEqual(['e'])
		})

		it('returns one captionless group when nothing is grouped, and none when empty', () => {
			expect(groupMenuEntries([{ id: 'x' }], {})).toEqual([{ key: '', label: '', entries: [{ id: 'x' }] }])
			expect(groupMenuEntries([], {})).toEqual([])
			expect(groupMenuEntries(null)).toEqual([])
		})
	})

	describe('checklist and next step', () => {
		const record = { status: 'handling', receiptConfirmed: true, documents: [], decision: '' }

		it('decides done from a literal, a condition or a field', () => {
			expect(isChecklistItemDone({ done: true }, record)).toBe(true)
			expect(isChecklistItemDone({ doneField: 'receiptConfirmed' }, record)).toBe(true)
			expect(isChecklistItemDone({ doneField: 'documents' }, record)).toBe(false)
			expect(isChecklistItemDone({ doneWhen: { field: 'status', op: 'eq', value: 'handling' } }, record)).toBe(true)
			expect(isChecklistItemDone({ doneWhen: { field: 'decision', op: 'notEmpty' } }, record)).toBe(false)
			expect(isChecklistItemDone({ label: 'no rule' }, record)).toBe(false)
			expect(isChecklistItemDone({ doneField: 'x' }, null)).toBe(false)
		})

		const config = {
			stages: {
				handling: {
					title: 'Step 2: handling',
					after: 'Then: decision',
					checklist: [
						{ label: 'Confirm receipt', doneField: 'receiptConfirmed' },
						{ label: 'Review the documents', doneField: 'documents', hint: '2 of 5 done' },
						{ notALabel: true },
					],
				},
				empty: { checklist: [] },
			},
		}

		it('resolves the card for the current stage', () => {
			expect(resolveNextStep(config, record)).toEqual({
				stage: 'handling',
				title: 'Step 2: handling',
				after: 'Then: decision',
				items: [
					{ label: 'Confirm receipt', done: true, hint: '' },
					{ label: 'Review the documents', done: false, hint: '2 of 5 done' },
				],
			})
		})

		it('answers null when the stage declares no checklist', () => {
			expect(resolveNextStep(config, { status: 'closed' })).toBeNull()
			expect(resolveNextStep(config, { status: 'empty' })).toBeNull()
			expect(resolveNextStep(null, record)).toBeNull()
			expect(resolveNextStep(config, null)).toBeNull()
		})

		it('reads the stage from its own field when the config names one', () => {
			expect(resolveNextStep({ field: 'phase', stages: config.stages }, { phase: 'handling' })).not.toBeNull()
		})
	})

	describe('resolvePill', () => {
		it('returns what the badge needs, keyed on the raw value', () => {
			expect(resolvePill({ field: 'status', colorMap: { open: 'success' }, labels: { open: 'Open case' } }, { status: 'open' }))
				.toEqual({ label: 'Open case', colorKey: 'open', colorMap: { open: 'success' }, variant: 'default' })
		})

		it('falls back to the raw value as the label', () => {
			expect(resolvePill({ field: 'type', variant: 'error' }, { type: 'Woo request' }))
				.toEqual({ label: 'Woo request', colorKey: 'Woo request', colorMap: null, variant: 'error' })
		})

		it('renders nothing for an empty field or no config', () => {
			expect(resolvePill({ field: 'status' }, { status: '' })).toBeNull()
			expect(resolvePill({ field: 'status' }, null)).toBeNull()
			expect(resolvePill({}, { status: 'open' })).toBeNull()
			expect(resolvePill(null, { status: 'open' })).toBeNull()
		})
	})

	describe('resolveTabCount', () => {
		it('takes a literal count, a list length or a number field', () => {
			expect(resolveTabCount({ count: 5 }, {})).toBe(5)
			expect(resolveTabCount({ countField: 'documents' }, { documents: [1, 2] })).toBe(2)
			expect(resolveTabCount({ countField: 'openTasks' }, { openTasks: '3' })).toBe(3)
		})

		it('counts a missing field as zero and declares nothing as null', () => {
			expect(resolveTabCount({ countField: 'documents' }, {})).toBe(0)
			expect(resolveTabCount({ countField: 'documents' }, null)).toBe(0)
			expect(resolveTabCount({}, {})).toBeNull()
			expect(resolveTabCount(null, {})).toBeNull()
			expect(resolveTabCount({ countField: 'name' }, { name: 'abc' })).toBeNull()
		})
	})
})
