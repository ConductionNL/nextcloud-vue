/**
 * Tests for CnShareCreate — create-share dialog (shares Tier-2 leaf).
 *
 * Covers:
 *  - permission toggling builds the bitmask correctly;
 *  - submit is blocked until a file + (type-appropriate) recipient is set;
 *  - user/group shares require a selected principal;
 *  - email shares require a valid email address;
 *  - public-link shares need no recipient;
 *  - submit emits `create` with the resolved payload;
 *  - changing share type resets the recipient state.
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

const { mount } = require('@vue/test-utils')
const CnShareCreate = require('../CnShareCreate.vue').default

const FILES = [{ fileId: 10, fileName: 'doc.txt' }]

const mountWith = (props = {}) => mount(CnShareCreate, {
	propsData: { files: FILES, ...props },
})

describe('CnShareCreate', () => {
	it('defaults to a user share with Read permission', () => {
		const wrapper = mountWith()
		expect(wrapper.vm.shareType).toBe(0)
		expect(wrapper.vm.permissions).toBe(1)
		wrapper.destroy()
	})

	it('toggles permission bits', () => {
		const wrapper = mountWith()
		wrapper.vm.togglePermission(2, true) // Update
		expect(wrapper.vm.hasPermission(2)).toBe(true)
		expect(wrapper.vm.permissions & 2).toBe(2)
		wrapper.vm.togglePermission(1, false) // remove Read
		expect(wrapper.vm.hasPermission(1)).toBe(false)
		wrapper.destroy()
	})

	it('blocks submit when no file is selected', () => {
		const wrapper = mountWith()
		wrapper.setData({ selectedPrincipal: { value: 'bob', label: 'Bob' } })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})

	it('requires a principal for a user share', () => {
		const wrapper = mountWith()
		wrapper.setData({ selectedFile: { value: 10, label: 'doc.txt' } })
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.setData({ selectedPrincipal: { value: 'bob', label: 'Bob' } })
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('requires a valid email for an email share', () => {
		const wrapper = mountWith()
		wrapper.setData({
			selectedFile: { value: 10, label: 'doc.txt' },
			shareType: 4,
			email: 'not-an-email',
		})
		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.setData({ email: 'bob@example.com' })
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('needs no recipient for a public link share', () => {
		const wrapper = mountWith()
		wrapper.setData({
			selectedFile: { value: 10, label: 'doc.txt' },
			shareType: 3,
		})
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('emits create with the resolved payload for a user share', () => {
		const wrapper = mountWith()
		wrapper.setData({
			selectedFile: { value: 10, label: 'doc.txt' },
			selectedPrincipal: { value: 'bob', label: 'Bob' },
			permissions: 1,
		})
		wrapper.vm.submit()
		const payload = wrapper.emitted('create')[0][0]
		expect(payload.fileId).toBe(10)
		expect(payload.shareType).toBe(0)
		expect(payload.shareWith).toBe('bob')
		expect(payload.permissions).toBe(1)
		expect(payload.password).toBeNull()
		wrapper.destroy()
	})

	it('passes a password only for public/email shares', () => {
		const wrapper = mountWith()
		wrapper.setData({
			selectedFile: { value: 10, label: 'doc.txt' },
			shareType: 3,
			password: 'secret',
		})
		wrapper.vm.submit()
		const payload = wrapper.emitted('create')[0][0]
		expect(payload.shareWith).toBeNull()
		expect(payload.password).toBe('secret')
		wrapper.destroy()
	})

	it('resets recipient state when the share type changes', async () => {
		const wrapper = mountWith()
		wrapper.setData({ selectedPrincipal: { value: 'bob', label: 'Bob' }, email: 'x@y.z' })
		wrapper.setData({ shareType: 3 })
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.selectedPrincipal).toBeNull()
		expect(wrapper.vm.email).toBe('')
		wrapper.destroy()
	})
})
