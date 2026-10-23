/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A confirm dialog's primary button can carry an icon, as board
 * DqFilterVerwijderen draws "Weergave verwijderen" with a bin (r23: icon
 * true > false). The index page's delete-view confirm uses it.
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnConfirmDialog from '../../src/dialogs/CnConfirmDialog.vue'

const indexPage = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
const stubs = {
	CnIcon: { name: 'CnIcon', props: ['name', 'size'], template: '<i class="cn-icon" :data-name="name" />' },
	NcButton: { name: 'NcButton', template: '<button><slot name="icon" /><slot /></button>' },
}

describe('CnConfirmDialog confirmIcon', () => {
	it('puts the named icon on the confirm button', () => {
		const w = mount(CnConfirmDialog, { props: { confirmIcon: 'DeleteOutline', variant: 'error' }, global: { stubs } })
		const confirm = w.find('[data-testid="cn-confirm-dialog-confirm"]')
		expect(confirm.find('.cn-icon').attributes('data-name')).toBe('DeleteOutline')
	})

	it('draws no icon when none is named', () => {
		const w = mount(CnConfirmDialog, { global: { stubs } })
		expect(w.find('[data-testid="cn-confirm-dialog-confirm"] .cn-icon').exists()).toBe(false)
	})

	it('is used by the index page\'s delete-view confirm', () => {
		const at = indexPage.indexOf('ref="deleteViewConfirmDialog"')
		expect(at).toBeGreaterThan(-1)
		const tag = indexPage.slice(at, indexPage.indexOf('/>', at))
		expect(tag).toContain('confirmIcon="DeleteOutline"')
	})
})
