/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dialog reads an input's choices off its context, asks the free text
 * only after Other, and sends Other as nothing.
 */
import { mount } from '@vue/test-utils'
import CnTransitionInputDialog from '../../src/dialogs/CnTransitionInputDialog.vue'
import { OTHER_OPTION_VALUE } from '../../src/utils/transitionInputs.js'

const INPUTS = [
	{ field: 'pauseReason', optionsSource: 'reasons', optionValue: 'key', optionLabel: 'name', required: true, other: { label: 'Other', input: 'reason' } },
	{ field: 'reason', widget: 'textarea', required: true },
	{ field: 'days', widget: 'number', default: '14' },
]

function mountDialog(reasons) {
	return mount(CnTransitionInputDialog, {
		props: { transition: { action: 'pause', label: 'Pause', inputs: INPUTS }, context: { reasons } },
	})
}

describe('inputs read off the context', () => {
	it('sends the picked key, the days as a number, and no text that was not asked', async () => {
		const w = mountDialog([{ key: 'consent', name: 'Consent' }])
		expect(w.vm.canConfirm).toBe(false)
		w.vm.setValue('pauseReason', 'consent')
		await w.vm.$nextTick()
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ pauseReason: 'consent', days: 14 })
	})

	it('needs the text after Other and sends Other as nothing', async () => {
		const w = mountDialog([{ key: 'consent', name: 'Consent' }])
		w.vm.setValue('pauseReason', OTHER_OPTION_VALUE)
		await w.vm.$nextTick()
		expect(w.vm.canConfirm).toBe(false)
		w.vm.setValue('reason', 'Something else')
		await w.vm.$nextTick()
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ pauseReason: '', reason: 'Something else', days: 14 })
	})

	it('control: without choices the text alone is asked', async () => {
		const w = mountDialog([])
		expect(w.find('[data-testid="cn-transition-input-pauseReason"]').exists()).toBe(false)
		w.vm.setValue('reason', 'Waiting')
		await w.vm.$nextTick()
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ reason: 'Waiting', days: 14 })
	})
})
