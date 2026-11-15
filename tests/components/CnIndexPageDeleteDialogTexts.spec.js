/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page can word its single-item delete dialog (`deleteDialog`), and
 * the dialog can say what else the delete removes (`description`), as a
 * publication's delete says its attachments leave the public page too.
 *
 * @spec openspec/changes/index-delete-dialog-texts/specs/index-delete-dialog-texts/spec.md
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnDeleteDialog from '../../src/components/CnDeleteDialog/CnDeleteDialog.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const ITEM = { id: 'p1', title: 'Besluit 12' }

describe('CnDeleteDialog description', () => {
	it('draws the description under the question, with the item name', () => {
		const w = mount(CnDeleteDialog, { props: { item: ITEM, description: '"{name}" and its attachments leave the public page.' } })
		expect(w.find('[data-testid="cn-delete-description"]').text()).toBe('"Besluit 12" and its attachments leave the public page.')
	})

	it('draws nothing without one', () => {
		const w = mount(CnDeleteDialog, { props: { item: ITEM } })
		expect(w.find('[data-testid="cn-delete-description"]').exists()).toBe(false)
	})
})

describe('CnIndexPage deleteDialog', () => {
	const mountPage = (props, provide = {}) => shallowMount(CnIndexPage, { props: { objects: [ITEM], ...props }, global: { provide } })

	it('hands the dialog its title, question and description, translated', () => {
		const w = mountPage({ deleteDialog: { title: 'Delete publication', message: 'Delete "{name}"?', description: 'It leaves the sitemap.' } }, { cnTranslate: (key) => `nl:${key}` })
		expect(w.vm.singleDeleteDialogTexts).toEqual({ dialogTitle: 'nl:Delete publication', warningText: 'nl:Delete "{name}"?', description: 'nl:It leaves the sitemap.' })
	})

	it('leaves unset texts out, so the dialog keeps its defaults', () => {
		expect(mountPage({ deleteDialog: { description: 'Gone from the sitemap.' } }).vm.singleDeleteDialogTexts).toEqual({ description: 'Gone from the sitemap.' })
		expect(mountPage({}).vm.singleDeleteDialogTexts).toEqual({})
	})

	it('is accepted by the manifest schema, and an unknown key is not', () => {
		const manifest = (deleteDialog) => ({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '1.0.0',
			menu: [],
			pages: [{ id: 'Pubs', route: '/pubs', type: 'index', title: 'Pubs', config: { register: 'r', schema: 's', deleteDialog } }],
		})
		expect(validateManifestV2(manifest({ title: 'Delete publication', message: 'Delete "{name}"?', description: 'It leaves the sitemap.' })).valid).toBe(true)
		expect(validateManifestV2(manifest({ body: 'x' })).valid).toBe(false)
	})
})
