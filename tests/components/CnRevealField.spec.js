/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRevealField: a protected value shown masked until the user asks, fetched
 * on every reveal so each viewing can be logged, with an optional reason.
 *
 * @spec openspec/changes/reveal-field/specs/reveal-field/spec.md
 */
import { mount } from '@vue/test-utils'
import CnRevealField from '../../src/components/CnRevealField/CnRevealField.vue'

async function flush() {
	for (let i = 0; i < 3; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

function mountField(props = {}) {
	return mount(CnRevealField, {
		props: { label: 'BSN', maskedValue: '*****4001', load: jest.fn().mockResolvedValue('123454001'), ...props },
	})
}

describe('CnRevealField', () => {
	it('shows the masked value and a Show button named after the label', () => {
		const w = mountField({ note: 'Het tonen van het BSN wordt gelogd.' })
		expect(w.find('[data-testid="cn-reveal-value"]').text()).toBe('*****4001')
		const toggle = w.find('[data-testid="cn-reveal-toggle"]')
		expect(toggle.text()).toBe('Show')
		expect(toggle.attributes('aria-label')).toBe('Show BSN')
		expect(w.find('[data-testid="cn-reveal-note"]').text()).toBe('Het tonen van het BSN wordt gelogd.')
		expect(w.find('[data-testid="cn-reveal-value"]').attributes('aria-labelledby')).toBe(w.find('.cn-reveal-field__label').attributes('id'))
	})

	it('fetches the value on Show, shows it and emits revealed', async () => {
		const load = jest.fn().mockResolvedValue('123454001')
		const w = mountField({ load })
		await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
		await flush()
		expect(load).toHaveBeenCalledWith('')
		expect(w.find('[data-testid="cn-reveal-value"]').text()).toBe('123454001')
		expect(w.find('[data-testid="cn-reveal-toggle"]').attributes('aria-label')).toBe('Hide BSN')
		expect(w.emitted('revealed')).toEqual([[{ reason: '' }]])
	})

	it('masks again on Hide and fetches again on the next Show', async () => {
		const load = jest.fn().mockResolvedValue('123454001')
		const w = mountField({ load })
		await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
		await flush()
		await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
		expect(w.find('[data-testid="cn-reveal-value"]').text()).toBe('*****4001')
		expect(w.emitted('hidden')).toHaveLength(1)
		await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
		await flush()
		expect(load).toHaveBeenCalledTimes(2)
	})

	it('asks the reason first when requireReason is set and passes it to load', async () => {
		const load = jest.fn().mockResolvedValue('123454001')
		const w = mountField({ load, requireReason: true })
		await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
		expect(load).not.toHaveBeenCalled()
		expect(w.find('[data-testid="cn-reveal-reason"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-reveal-reason-submit"]').attributes('disabled')).toBeDefined()
		w.vm.reason = '  Identificatie bij het loket  '
		await w.vm.$nextTick()
		await w.find('form').trigger('submit')
		await flush()
		expect(load).toHaveBeenCalledWith('Identificatie bij het loket')
		expect(w.find('[data-testid="cn-reveal-reason"]').exists()).toBe(false)
		expect(w.emitted('revealed')).toEqual([[{ reason: 'Identificatie bij het loket' }]])
	})

	it('cancelling the reason fetches nothing', async () => {
		const load = jest.fn()
		const w = mountField({ load, requireReason: true })
		await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
		await w.find('[data-testid="cn-reveal-reason-cancel"]').trigger('click')
		expect(w.find('[data-testid="cn-reveal-reason"]').exists()).toBe(false)
		expect(load).not.toHaveBeenCalled()
	})

	it('keeps the value masked and says so when load fails or answers nothing', async () => {
		for (const load of [jest.fn().mockRejectedValue(new Error('403')), jest.fn().mockResolvedValue('')]) {
			const w = mountField({ load })
			await w.find('[data-testid="cn-reveal-toggle"]').trigger('click')
			await flush()
			expect(w.find('[data-testid="cn-reveal-value"]').text()).toBe('*****4001')
			expect(w.find('[data-testid="cn-reveal-error"]').attributes('role')).toBe('alert')
			expect(w.emitted('revealed')).toBeUndefined()
		}
	})
})
