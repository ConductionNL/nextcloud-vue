/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row button offered by a predicate on the file's row (DqZaakDocumenten:
 * "Beoordelen" only on a document that carries a review verdict, so not on
 * the case's own draft).
 *
 * @spec openspec/changes/files-row-button-visible-if-row/specs/files-browser/spec.md
 */
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
import { hostActionApplies } from '../../src/components/CnFilesBrowser/filesBrowser.js'

const pdf = { fileid: 21, basename: 'a.pdf', mime: 'application/pdf' }
const row = (fields) => (key) => fields[key]

describe('a predicate in visibleIf.row', () => {
	const action = { id: 'assess', visibleIf: { row: { reviewVerdict: { notEmpty: true } } } }

	it('offers the action while the field holds a value', () => {
		expect(hostActionApplies(action, pdf, row({ reviewVerdict: 'open' }))).toBe(true)
		expect(hostActionApplies(action, pdf, row({ reviewVerdict: 'openbaar' }))).toBe(true)
	})

	it('does not offer it while the field is empty or missing', () => {
		expect(hostActionApplies(action, pdf, row({}))).toBe(false)
		expect(hostActionApplies(action, pdf, row({ reviewVerdict: '' }))).toBe(false)
		expect(hostActionApplies(action, pdf, row({ reviewVerdict: null }))).toBe(false)
		expect(hostActionApplies(action, pdf)).toBe(false)
	})

	it('reads the other predicates of a form condition too', () => {
		const inList = { visibleIf: { row: { status: { in: ['open', 'paused'] } } } }
		expect(hostActionApplies(inList, pdf, row({ status: 'paused' }))).toBe(true)
		expect(hostActionApplies(inList, pdf, row({ status: 'closed' }))).toBe(false)
	})

	it('still compares a plain value strictly', () => {
		const plain = { visibleIf: { row: { canChangeAccess: true } } }
		expect(hostActionApplies(plain, pdf, row({ canChangeAccess: true }))).toBe(true)
		expect(hostActionApplies(plain, pdf, row({ canChangeAccess: 'true' }))).toBe(false)
	})
})

describe('the row button', () => {
	const vm = (rowButton, rowData) => {
		const self = { rowButton, resolvedRowData: rowData }
		self.rowValueOf = CnFilesBrowser.methods.rowValueOf.bind(self)
		self.isFolder = CnFilesBrowser.methods.isFolder.bind(self)
		return self
	}
	const button = { id: 'assess', label: 'Assess', visibleIf: { row: { reviewVerdict: { notEmpty: true } } } }

	it('reads its visibleIf.row from the file\'s row, as a row action does', () => {
		const self = vm(button, { 21: { reviewVerdict: 'open' }, 22: { title: 'Concept' } })
		expect(CnFilesBrowser.methods.rowButtonApplies.call(self, pdf)).toBe(true)
		expect(CnFilesBrowser.methods.rowButtonApplies.call(self, { ...pdf, fileid: 22 })).toBe(false)
	})

	it('is drawn on every file when it names no condition', () => {
		const self = vm({ id: 'assess', label: 'Assess' }, {})
		expect(CnFilesBrowser.methods.rowButtonApplies.call(self, pdf)).toBe(true)
	})

	it('is not drawn without a row button or on a folder', () => {
		expect(CnFilesBrowser.methods.rowButtonApplies.call(vm(null, {}), pdf)).toBe(false)
		const self = vm(button, { 21: { reviewVerdict: 'open' } })
		self.isFolder = () => true
		expect(CnFilesBrowser.methods.rowButtonApplies.call(self, pdf)).toBe(false)
	})
})
