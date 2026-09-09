/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The same untyped name chain, in the two other places it was written out.
 *
 * `CnFormDialog.displayLabel` was the one reported (a case's requester showed
 * no name). It was not the only copy: `CnObjectDataWidget.objectDisplayName`
 * labels a related object on a detail page, and `CnDeleteDialog.itemName`
 * names the record in "Are you sure you want to permanently delete …". Both
 * took the first TRUTHY key starting at `name`, so both returned the
 * structured `name` block of a Haal Centraal person record — which is
 * `[object Object]` on screen, and in the delete dialog's case a confirmation
 * prompt naming nothing.
 *
 * Fixed by inspection rather than from a report, so they are tested here
 * rather than assumed.
 */

import { mount } from '@vue/test-utils'
import CnDeleteDialog from '../../src/components/CnDeleteDialog/CnDeleteDialog.vue'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const PERSON = {
	id: 'person-uuid-1',
	name: { givenNames: 'Test', surname: 'Zonder' },
	displayName: 'Test Zonder',
	'@self': { id: 'person-uuid-1', name: 'Test Zonder' },
}

describe('CnObjectDataWidget — a structured name is not a label', () => {
	const nameOf = (obj, id) => CnObjectDataWidget.methods.objectDisplayName.call({}, obj, id)

	it('skips the structured block and takes displayName', () => {
		expect(nameOf(PERSON, PERSON.id)).toBe('Test Zonder')
	})

	it('never returns a non-string', () => {
		expect(typeof nameOf(PERSON, PERSON.id)).toBe('string')
	})

	it('falls back to the id when nothing nameable is a string', () => {
		expect(nameOf({ id: 'p', name: { surname: 'Janssen' } }, 'p')).toBe('p')
	})

	it('still prefers a plain string name, and still builds one from first/last', () => {
		expect(nameOf({ name: 'Plain', id: 'p' }, 'p')).toBe('Plain')
		expect(nameOf({ firstName: 'Ada', lastName: 'Lovelace', id: 'p' }, 'p')).toBe('Ada Lovelace')
	})
})

describe('CnDeleteDialog — the confirmation names the record', () => {
	const nameShown = (item, props = {}) => mount(CnDeleteDialog, {
		propsData: { item, ...props },
		global: { stubs: { NcDialog: true, NcButton: true, NcNoteCard: true, NcLoadingIcon: true, CnIcon: true } },
	}).vm.itemName

	it('does not put a structured name object into the prompt', () => {
		expect(nameShown(PERSON)).toBe('Test Zonder')
	})

	it('never returns a non-string for a nameable record', () => {
		expect(typeof nameShown(PERSON)).toBe('string')
	})

	it('still honours nameField and nameFormatter', () => {
		expect(nameShown({ id: 'x', reference: 'ZAAK-1' }, { nameField: 'reference' })).toBe('ZAAK-1')
		expect(nameShown(PERSON, { nameFormatter: () => 'Formatted' })).toBe('Formatted')
	})

	it('skips a structured nameField rather than showing it', () => {
		// `nameField` defaults to 'title'; point it at the structured block on
		// purpose. Falling through beats rendering the object.
		expect(nameShown(PERSON, { nameField: 'name' })).toBe('Test Zonder')
	})
})
