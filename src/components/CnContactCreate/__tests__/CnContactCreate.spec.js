/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactCreate — render, validate, emit `create`.
 */

const { mount } = require('@vue/test-utils')
const CnContactCreate = require('../CnContactCreate.vue').default

describe('CnContactCreate', () => {
	it('renders the dialog with form fields', () => {
		const wrapper = mount(CnContactCreate)
		const fields = wrapper.findAll('.stub.NcTextField')
		// displayName + email + phone + org = 4 NcTextField stubs.
		expect(fields.length).toBe(4)
		wrapper.destroy()
	})

	it('marks displayName required (empty form cannot submit)', () => {
		const wrapper = mount(CnContactCreate)
		expect(wrapper.vm.canSubmit).toBe(false)
		expect(wrapper.vm.displayNameError).not.toBe('')
		wrapper.destroy()
	})

	it('flags an invalid email', async () => {
		const wrapper = mount(CnContactCreate)
		wrapper.vm.form.displayName = 'Jan'
		wrapper.vm.form.email = 'not-an-email'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.emailError).not.toBe('')
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.destroy()
	})

	it('accepts a valid form and emits `create`', async () => {
		const wrapper = mount(CnContactCreate)
		wrapper.vm.form.displayName = 'Jan de Vries'
		wrapper.vm.form.email = 'jan@example.nl'
		wrapper.vm.form.phone = '+31 6 1234'
		wrapper.vm.form.org = 'Acme'
		wrapper.vm.form.role = { value: 'applicant' }
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.vm.submit()
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('create')).toBeTruthy()
		const payload = wrapper.emitted('create')[0][0]
		expect(payload.displayName).toBe('Jan de Vries')
		expect(payload.email).toBe('jan@example.nl')
		expect(payload.phone).toBe('+31 6 1234')
		expect(payload.org).toBe('Acme')
		expect(payload.role).toBe('applicant')
		wrapper.destroy()
	})

	it('refuses to emit when validation fails', async () => {
		const wrapper = mount(CnContactCreate)
		wrapper.vm.form.displayName = '   '
		wrapper.vm.form.email = 'jan@example.nl'
		await wrapper.vm.$nextTick()
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})

	it('trims and normalises optional fields to null when empty', async () => {
		const wrapper = mount(CnContactCreate)
		wrapper.vm.form.displayName = 'Anna'
		wrapper.vm.form.email = ''
		wrapper.vm.form.phone = '   '
		wrapper.vm.form.org = ''
		await wrapper.vm.$nextTick()
		wrapper.vm.submit()
		const payload = wrapper.emitted('create')[0][0]
		expect(payload.email).toBeNull()
		expect(payload.phone).toBeNull()
		expect(payload.org).toBeNull()
		wrapper.destroy()
	})
})
