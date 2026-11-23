/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldCatalogueDialog (DqZaaktypeVelden "Attribuut kiezen uit de
 * catalogus"): folders with counts, the attributes under their folder with
 * type and usage, Add emits the choice, a read refusal is the dialog's alert.
 *
 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
 */
import { mount } from '@vue/test-utils'
import CnFieldCatalogueDialog from '../../src/components/CnFieldCatalogueDialog/CnFieldCatalogueDialog.vue'

const FOLDERS = [{ id: 'adres', name: 'Adres' }, { id: 'fin', name: 'Financiën' }, { id: 'shared', name: 'Gedeelde attributen' }]
const FIELDS = [
	{ id: 'bedrag', name: 'Bedrag', typeLabel: 'getal, euro', folderId: 'fin' },
	{ id: 'kostenplaats', name: 'Kostenplaats', typeLabel: 'keuze', folderId: 'fin' },
	{ id: 'kenteken', name: 'Kenteken', typeLabel: 'tekst', folderId: 'shared', usageCount: 3 },
	{ id: 'straat', name: 'Straat', typeLabel: 'tekst', folderId: 'adres' },
	{ id: 'los', name: 'Los veld', type: 'string' },
]
const DIALOG = { props: ['name', 'notices'], template: '<div class="dialog"><h2>{{ name }}</h2><p v-for="n in notices" :key="n.text" :role="n.role" class="notice">{{ n.text }}</p><slot /><slot name="actions" /></div>' }
const BUTTON = { props: ['variant', 'disabled'], emits: ['click'], template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' }

/**
 * @param {object} props The props.
 * @return {object} The dialog.
 */
function mountDialog(props = {}) {
	return mount(CnFieldCatalogueDialog, {
		props: { fields: FIELDS, folders: FOLDERS, usageLabel: 'in {count} zaaktypen', ...props },
		global: { provide: { cnTranslate: (key) => key }, stubs: { CnDialog: DIALOG, NcButton: BUTTON, CnIcon: true, Folder: true } },
	})
}

describe('CnFieldCatalogueDialog', () => {
	it('lists All first with every count, then the folders and the uncategorised fields', () => {
		const w = mountDialog({ excludeIds: ['straat'] })
		const folders = w.findAll('.cn-folder-tree__item').map((b) => `${b.find('.cn-folder-tree__name').text()} ${b.find('.cn-folder-tree__count').text()}`)
		expect(folders).toEqual(['All attributes 4', 'Adres 0', 'Financiën 2', 'Gedeelde attributen 1', 'Uncategorised 1'])
		expect(w.findAll('.cn-field-catalogue__heading').map((h) => h.text())).toEqual(['Financiën', 'Gedeelde attributen', 'Uncategorised'])
		expect(w.text()).toContain('tekst · in 3 zaaktypen')
	})

	it('narrows to one folder and emits the chosen fields on Add', async () => {
		const w = mountDialog()
		await w.findAll('.cn-folder-tree__item')[2].trigger('click')
		expect(w.findAll('[data-testid="cn-field-catalogue-option"]')).toHaveLength(2)
		const confirm = w.find('[data-testid="cn-field-catalogue-confirm"]')
		expect(confirm.attributes('disabled')).toBeDefined()
		await w.findAll('[data-testid="cn-field-catalogue-option"] input')[1].setValue(true)
		await confirm.trigger('click')
		expect(w.emitted('select')[0][0]).toEqual([FIELDS[1]])
	})

	it('draws a read refusal as the dialog alert, and Cancel closes', async () => {
		const w = mountDialog({ error: 'U mag de catalogus niet lezen.' })
		expect(w.find('.notice').attributes('role')).toBe('alert')
		await w.find('[data-testid="cn-field-catalogue-cancel"]').trigger('click')
		expect(w.emitted('closing')).toHaveLength(1)
	})
})
