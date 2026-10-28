/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The host draws a list's extra adds (`content.addActions`) beside its catalog
 * Add, in the title row on a board card and in the Actions menu otherwise, and
 * a click opens the list's create form with that add's defaults.
 *
 * @spec openspec/changes/object-list-add-actions/specs/object-list/spec.md#requirement-a-list-can-offer-more-than-one-add
 */
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const { catalogAddActions } = CnDetailWidgetHost.computed
const { invokeCatalogAdd } = CnDetailWidgetHost.methods

const CONTENT = { addActions: [{ label: 'Add own line', icon: 'Pencil', createDefaults: { kind: 'own' } }, { icon: 'Plus' }] }

describe('CnDetailWidgetHost — extra adds', () => {
	it('lists the extra adds with translated labels where the Add is offered', () => {
		const ctx = { content: CONTENT, catalogAddEnabled: true, cnTranslate: (k) => `T(${k})` }
		expect(catalogAddActions.call(ctx)).toEqual([{ label: 'T(Add own line)', icon: 'Pencil', createDefaults: { kind: 'own' } }])
	})

	it('offers none where the Add is not offered', () => {
		expect(catalogAddActions.call({ content: CONTENT, catalogAddEnabled: false })).toEqual([])
	})

	it('opens the list\'s form with the extra add\'s defaults', () => {
		const target = { openCreate: jest.fn(), openCreateWith: jest.fn() }
		invokeCatalogAdd.call({ $refs: { renderer: target } }, { kind: 'own' })
		expect(target.openCreateWith).toHaveBeenCalledWith({ kind: 'own' })
		expect(target.openCreate).not.toHaveBeenCalled()
	})

	it('opens the plain form from the catalog Add', () => {
		const target = { openCreate: jest.fn(), openCreateWith: jest.fn() }
		invokeCatalogAdd.call({ $refs: { renderer: target } })
		expect(target.openCreate).toHaveBeenCalled()
		expect(target.openCreateWith).not.toHaveBeenCalled()
	})
})
