/**
 * Tests for CnConfirmDialog — the generic, verb-agnostic two-phase
 * (confirm → result) dialog used to confirm-gate declarative object-op
 * actions (list-widget-enrichment "delete always confirms; patch/create
 * confirm only on opt-in").
 *
 * The dialog performs NO operation itself: it emits `confirm`, the parent
 * does the work and reports back through `setResult()` on a ref.
 */

import { mount } from '@vue/test-utils'
import CnConfirmDialog from '../../src/dialogs/CnConfirmDialog.vue'

describe('CnConfirmDialog — confirm phase', () => {
	it('renders the confirm phase with the message and no result', () => {
		const wrapper = mount(CnConfirmDialog, {
			propsData: { message: 'Really accept this request?' },
		})
		const confirmPhase = wrapper.find('[data-testid-phase="confirm"]')
		expect(confirmPhase.exists()).toBe(true)
		expect(confirmPhase.text()).toContain('Really accept this request?')
		expect(wrapper.find('[data-testid-phase="result"]').exists()).toBe(false)
	})

	it('emits confirm (and enters loading) when the primary button is clicked', async () => {
		const wrapper = mount(CnConfirmDialog)
		await wrapper.find('[data-testid="cn-confirm-dialog-confirm"]').trigger('click')
		expect(wrapper.emitted('confirm')).toBeTruthy()
		expect(wrapper.vm.loading).toBe(true)
	})

	it('emits close when the cancel button is clicked', async () => {
		const wrapper = mount(CnConfirmDialog)
		// First NcButton in #actions is the cancel/close button.
		await wrapper.findAll('.stub.NcButton').at(0).trigger('click')
		expect(wrapper.emitted('close')).toBeTruthy()
	})

	it('defaults to the primary (non-destructive) variant', () => {
		const wrapper = mount(CnConfirmDialog)
		expect(wrapper.props('variant')).toBe('primary')
	})

	it('accepts variant="error" for destructive confirms', () => {
		const wrapper = mount(CnConfirmDialog, { propsData: { variant: 'error' } })
		expect(wrapper.props('variant')).toBe('error')
	})
})

describe('CnConfirmDialog — result phase', () => {
	it('setResult({ success }) flips to the result phase and shows the success text', async () => {
		jest.useFakeTimers()
		const wrapper = mount(CnConfirmDialog, {
			propsData: { successText: 'Request accepted.' },
		})
		wrapper.vm.setResult({ success: true })
		await wrapper.vm.$nextTick()
		const resultPhase = wrapper.find('[data-testid-phase="result"]')
		expect(resultPhase.exists()).toBe(true)
		expect(resultPhase.text()).toContain('Request accepted.')
		expect(wrapper.find('[data-testid-phase="confirm"]').exists()).toBe(false)
		// The primary confirm button is gone in the result phase.
		expect(wrapper.find('[data-testid="cn-confirm-dialog-confirm"]').exists()).toBe(false)
		// Success auto-closes after 2s.
		jest.advanceTimersByTime(2000)
		expect(wrapper.emitted('close')).toBeTruthy()
		jest.useRealTimers()
	})

	it('setResult({ error }) shows the error and does NOT auto-close', async () => {
		jest.useFakeTimers()
		const wrapper = mount(CnConfirmDialog)
		wrapper.vm.setResult({ error: 'You are not allowed to do this' })
		await wrapper.vm.$nextTick()
		const resultPhase = wrapper.find('[data-testid-phase="result"]')
		expect(resultPhase.exists()).toBe(true)
		expect(resultPhase.text()).toContain('You are not allowed to do this')
		jest.advanceTimersByTime(5000)
		expect(wrapper.emitted('close')).toBeFalsy()
		jest.useRealTimers()
	})

	it('setResult clears the loading state', async () => {
		const wrapper = mount(CnConfirmDialog)
		await wrapper.find('[data-testid="cn-confirm-dialog-confirm"]').trigger('click')
		expect(wrapper.vm.loading).toBe(true)
		wrapper.vm.setResult({ error: 'nope' })
		expect(wrapper.vm.loading).toBe(false)
	})
})
