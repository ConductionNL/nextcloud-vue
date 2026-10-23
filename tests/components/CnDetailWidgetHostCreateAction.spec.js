/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The catalog Add the host draws in a card or panel menu answers to the list's
 * `content.createAction` exactly as the list's own Add does: its label, and
 * no Add where its condition fails against the page record.
 */
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const { catalogAddEnabled, addLabel, catalogAddInHeader, catalogAddInMenu } = CnDetailWidgetHost.computed

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

describe('CnDetailWidgetHost — where the catalog Add stands', () => {
	/**
	 * A host context for the placement computeds.
	 *
	 * @param {string} look The injected look.
	 * @param {boolean} isBare Whether the host is in a tab panel.
	 * @param {boolean} enabled Whether the Add is offered at all.
	 * @return {object} The context.
	 */
	function placed(look, isBare, enabled = true) {
		const ctx = { cnLook: look, isBare, catalogAddEnabled: enabled }
		ctx.catalogAddInHeader = catalogAddInHeader.call(ctx)
		return ctx
	}

	it('is a title-row button, not a menu item, on a board-look card', () => {
		const ctx = placed('board', false)
		expect(ctx.catalogAddInHeader).toBe(true)
		expect(catalogAddInMenu.call(ctx)).toBe(false)
	})

	it('stays a menu item in the Nextcloud look', () => {
		const ctx = placed('nextcloud', false)
		expect(ctx.catalogAddInHeader).toBe(false)
		expect(catalogAddInMenu.call(ctx)).toBe(true)
	})

	it('is no title-row button in a tab panel', () => {
		expect(placed('board', true).catalogAddInHeader).toBe(false)
	})

	it('is nowhere when the Add is off', () => {
		const ctx = placed('board', false, false)
		expect(ctx.catalogAddInHeader).toBe(false)
		expect(catalogAddInMenu.call(ctx)).toBe(false)
	})
})
