/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The catalog Add the host draws in a card or panel menu answers to the list's
 * `content.createAction` exactly as the list's own Add does: its label, and
 * no Add where its condition fails against the page record.
 */
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const { catalogAddEnabled, addLabel } = CnDetailWidgetHost.computed

const ACTION = {
	type: 'open-modal',
	target: 'SubRecordModal',
	label: 'Create sub-record',
	visibleWhen: { field: 'endDate', op: 'empty' },
}

/**
 * A host context for the computed.
 *
 * @param {object} content The widget content.
 * @param {object|null} object The page record.
 * @return {object} The context.
 */
function host(content, object) {
	return { widget: { type: 'object-list' }, content, object, cnTranslate: (k) => (k === 'Create sub-record' ? 'Subrecord aanmaken' : k) }
}

describe('CnDetailWidgetHost — the catalog Add and createAction', () => {
	it('offers Add where the condition holds, with the action label', () => {
		const ctx = host({ createAction: ACTION }, { id: 1 })
		expect(catalogAddEnabled.call(ctx)).toBe(true)
		expect(addLabel.call(ctx)).toBe('Subrecord aanmaken')
	})

	it('offers no Add where the condition fails', () => {
		expect(catalogAddEnabled.call(host({ createAction: ACTION }, { endDate: '2026-10-01' }))).toBe(false)
	})

	it('keeps the plain Add for a list without createAction', () => {
		const ctx = host({}, { id: 1 })
		expect(catalogAddEnabled.call(ctx)).toBe(true)
		expect(addLabel.call(ctx)).toBe('Add')
	})

	it('keeps allowCreate: false as the off switch', () => {
		expect(catalogAddEnabled.call(host({ createAction: ACTION, allowCreate: false }, { id: 1 }))).toBe(false)
	})
})
