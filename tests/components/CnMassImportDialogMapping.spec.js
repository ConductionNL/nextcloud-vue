/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMassImportDialog as board PqImporteren draws it: the picked file's rows and
 * columns, the template download, a table that maps each column to a field or
 * leaves it out, and a switch that checks the file first and imports nothing.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnMassImportDialog from '../../src/components/CnMassImportDialog/CnMassImportDialog.vue'

jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p }))

const FIELDS = [
	{ key: 'title', label: 'Title' },
	{ key: 'client', label: 'Client' },
]

/**
 * A picked file whose text() the dialog reads.
 *
 * @param {string} name The file name.
 * @param {string} text The content.
 * @return {File} The file.
 */
function file(name, text) {
	const f = new File([text], name, { type: 'text/csv' })
	f.text = () => Promise.resolve(text)
	return f
}

/**
 * The text of an uploaded file (jsdom's File has no text()).
 *
 * @param {Blob} blob The upload.
 * @return {Promise<string>} Its text.
 */
function readText(blob) {
	return new Promise((resolve) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result)
		reader.readAsText(blob)
	})
}

/**
 * Mount the dialog and pick a file.
 *
 * @param {object} props Dialog props.
 * @param {File} picked The file to pick.
 * @return {Promise<object>} The wrapper.
 */
async function pick(props, picked) {
	const wrapper = mount(CnMassImportDialog, { props, attachTo: document.body })
	await wrapper.vm.handleFileSelect({ target: { files: [picked] } })
	await flushPromises()
	return wrapper
}

describe('CnMassImportDialog, mapping and check first', () => {
	it('names rows and columns of the picked file and maps them to fields', async () => {
		const wrapper = await pick({ fields: FIELDS }, file('tickets.csv', 'Title,Klant,Notitie\nA,B,C\nD,E,F\n'))
		expect(wrapper.find('[data-testid="cn-mass-import-file-summary"]').text()).toContain('2 rows · 3 columns')
		const rows = wrapper.findAll('[data-testid="cn-mass-import-mapping"] tbody tr')
		expect(rows.map((r) => r.find('td').text())).toEqual(['Title', 'Klant', 'Notitie'])
		expect(wrapper.vm.mapping).toEqual({ Title: 'title', Klant: '', Notitie: '' })
		wrapper.unmount()
	})

	it('uploads the file renamed to the chosen fields', async () => {
		const wrapper = await pick({ fields: FIELDS }, file('tickets.csv', 'Title,Klant,Notitie\nA,B,C\n'))
		wrapper.vm.setMapping('Klant', 'client')
		wrapper.vm.executeImport()
		const [payload] = wrapper.emitted('confirm')[0]
		expect(await readText(payload.file)).toBe('title,client\nA,B\n')
		expect(payload.mapping).toEqual({ Title: 'title', Klant: 'client', Notitie: '' })
		wrapper.unmount()
	})

	it('shows no mapping without fields, and uploads the picked file as it is', async () => {
		const picked = file('tickets.csv', 'Title\nA\n')
		const wrapper = await pick({}, picked)
		expect(wrapper.find('[data-testid="cn-mass-import-mapping"]').exists()).toBe(false)
		wrapper.vm.executeImport()
		expect(wrapper.emitted('confirm')[0][0].file).toBe(picked)
		wrapper.unmount()
	})

	it('offers the template when it has an address', async () => {
		const wrapper = await pick({ templateUrl: '/nc/template.csv' }, file('t.csv', 'Title\nA\n'))
		expect(wrapper.find('[data-testid="cn-mass-import-template"]').attributes('href')).toBe('/nc/template.csv')
		wrapper.unmount()
	})

	it('checks first, then imports the same file for real', async () => {
		const wrapper = await pick({ checkFirst: true }, file('t.csv', 'Title\nA\n'))
		wrapper.vm.dryRun = true
		wrapper.vm.executeImport()
		expect(wrapper.emitted('confirm')[0][0].options).toEqual({ dryRun: true })
		wrapper.vm.setResult({ success: true, dryRun: true, summary: { Sheet: { found: 1, created: [], errors: [] } } })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-mass-import-checked"]').exists()).toBe(true)
		await wrapper.find('[data-testid="cn-mass-import-run"]').trigger('click')
		expect(wrapper.emitted('confirm')[1][0].options).toEqual({})
		wrapper.unmount()
	})
})
