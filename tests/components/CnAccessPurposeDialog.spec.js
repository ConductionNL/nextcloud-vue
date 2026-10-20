/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The access purpose dialog: the offered purposes plus "Other", which needs a
 * written purpose before it can be submitted.
 *
 * @spec openspec/changes/detail-access-purpose/specs/detail-access-purpose/spec.md#requirement-a-detail-page-can-ask-for-a-purpose-before-it-opens
 */
import { mount } from '@vue/test-utils'
import CnAccessPurposeDialog from '../../src/dialogs/CnAccessPurposeDialog.vue'

/**
 * Mount the dialog with its parts stubbed.
 *
 * @return {import('@vue/test-utils').VueWrapper} The dialog.
 */
function mountDialog() {
	return mount(CnAccessPurposeDialog, {
		props: { options: [{ value: 'handling', label: 'Handling the case' }, { value: 'other', label: 'ignored' }] },
		global: {
			stubs: {
				CnDialog: { template: '<div><slot /><slot name="actions" /></div>' },
			},
		},
	})
}

describe('CnAccessPurposeDialog', () => {
	it('offers the purposes and Other once', () => {
		const w = mountDialog()
		expect(w.vm.choices.map((choice) => choice.value)).toEqual(['handling', 'other'])
	})

	it('submits a listed purpose without a note', async () => {
		const w = mountDialog()
		await w.setData({ purpose: 'handling', note: 'ignored' })
		w.vm.submit()
		expect(w.emitted('submit')).toEqual([[{ purpose: 'handling', note: '' }]])
	})

	it('needs a written purpose for Other', async () => {
		const w = mountDialog()
		await w.setData({ purpose: 'other', note: '  ' })
		expect(w.vm.complete).toBe(false)
		w.vm.submit()
		expect(w.emitted('submit')).toBeUndefined()
		await w.setData({ note: 'Steekproef van de functionaris gegevensbescherming' })
		w.vm.submit()
		expect(w.emitted('submit')).toEqual([[{ purpose: 'other', note: 'Steekproef van de functionaris gegevensbescherming' }]])
	})
})
