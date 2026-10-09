/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-4
 */
import { flush, mountForm } from '../support/formPageHarness.js'

const fields = [{ key: 'income', type: 'string', label: 'Income' }]
const unmet = [{ message: 'Het inkomen is te laag voor deze regeling' }, { message: 'Second' }]

describe('CnFormPage unmet conditions', () => {
	it('lists the host\'s conditions above the submit button', () => {
		const w = mountForm({ fields, unmetConditions: unmet })
		const list = w.get('[data-testid="cn-form-page-unmet"]')
		expect(list.text()).toContain('Het inkomen is te laag voor deze regeling')
		const html = w.html()
		expect(html.indexOf('cn-form-page-unmet')).toBeLessThan(html.indexOf('cn-form-page__submit'))
	})

	it('with blockSubmit, submit is disabled and the first message is its reason', () => {
		const w = mountForm({ fields, unmetConditions: unmet, blockSubmit: true })
		const submit = w.get('button[type="submit"]')
		expect(submit.attributes('disabled')).toBeDefined()
		expect(submit.attributes('title')).toBe('Het inkomen is te laag voor deze regeling')
	})

	it('without blockSubmit the list is shown and submit stays enabled', () => {
		const w = mountForm({ fields, unmetConditions: unmet })
		expect(w.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
	})

	it('a held form does not submit on Enter either', async () => {
		const handler = jest.fn()
		const w = mountForm({ fields, unmetConditions: unmet, blockSubmit: true, submitHandler: 'h', customComponents: { h: handler } })
		await w.find('form').trigger('submit')
		await flush()
		expect(handler).not.toHaveBeenCalled()
	})

	it('submits once the conditions are gone', async () => {
		const handler = jest.fn()
		const w = mountForm({ fields, unmetConditions: unmet, blockSubmit: true, submitHandler: 'h', customComponents: { h: handler } })
		await w.setProps({ unmetConditions: [] })
		await w.find('form').trigger('submit')
		await flush()
		expect(handler).toHaveBeenCalled()
		expect(w.find('[data-testid="cn-form-page-unmet"]').exists()).toBe(false)
	})
})
