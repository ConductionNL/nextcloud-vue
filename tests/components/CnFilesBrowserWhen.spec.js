import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `when` on a files browser column or action, and `rowProps` on a modal
 * action (DqZaakDocumenten "Beoordelen").
 *
 * @spec openspec/changes/files-review-row-when/specs/files-review-row-when/spec.md
 */
import { hostActionApplies } from '../../src/components/CnFilesBrowser/filesBrowser.js'
import { normaliseFileColumns } from '../../src/components/CnFilesBrowser/filesBrowserColumns.js'

describe('when on files browser entries', () => {
	it('keeps a column only when its when is true', () => {
		const keys = (when) => normaliseFileColumns(['name', { key: 'reviewVerdict', source: 'row', ...when }]).map((c) => c.key)
		expect(keys({ when: true })).toEqual(['name', 'reviewVerdict'])
		expect(keys({ when: false })).toEqual(['name'])
		expect(keys({ when: '@context.caseType.documentReview.enabled' })).toEqual(['name'])
		expect(keys({})).toEqual(['name', 'reviewVerdict'])
	})

	it('offers an action only when its when is true', () => {
		const node = { basename: 'a.pdf', mime: 'application/pdf' }
		expect(hostActionApplies({ id: 'a', when: true }, node)).toBe(true)
		expect(hostActionApplies({ id: 'a', when: false }, node)).toBe(false)
		expect(hostActionApplies({ id: 'a', when: '@context.x' }, node)).toBe(false)
		expect(hostActionApplies({ id: 'a' }, node)).toBe(true)
	})
})

describe('rowProps on a modal action', () => {
	it('adds the clicked file\'s row-data fields to the modal props', () => {
		const dispatched = []
		const vm = {
			currentPath: '/x',
			resolvedRowData: { 21: { id: 'doc-1', title: 'Advies' } },
			cnDispatchAction: (action) => dispatched.push(action),
		}
		vm.rowPropsOf = CnFilesBrowser.methods.rowPropsOf.bind(vm)
		CnFilesBrowser.methods.runHostAction.call(vm, { id: 'assess', type: 'open-modal', target: 'D', props: { caseId: 'c' }, rowProps: { documentId: 'id' } }, { fileid: 21, basename: 'a.pdf', path: '/x/a.pdf' })
		expect(dispatched[0].props).toMatchObject({ caseId: 'c', fileId: 21, documentId: 'doc-1' })
	})
})
