/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSecretAddressCard (secret-address-card).
 *
 * Guarded: the status says whether an address exists; a create shows the
 * address once with its safe extra links (webcal kept, javascript dropped);
 * a second create is a reset; a revoke asks first and then removes; the
 * object id fills the urls; a refusal shows the server's words; in dialog
 * mode the card sits in a dialog that emits close.
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockDelete = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		post: (...args) => mockPost(...args),
		delete: (...args) => mockDelete(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'

const CnSecretAddressCard = require('../../src/components/CnSecretAddressCard/CnSecretAddressCard.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcLoadingIcon: true,
	NcTextField: { props: ['modelValue'], template: '<input :value="modelValue" data-testid="cn-secret-address-value">' },
	NcButton: { inheritAttrs: false, props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>' },
	CnDialog: { props: ['name'], emits: ['closing'], template: '<div class="dialog" :data-name="name"><slot /><button class="x" @click="$emit(\'closing\')" /></div>' },
}

function make(props = {}) {
	return mount(CnSecretAddressCard, {
		props: {
			statusUrl: '/apps/school/api/feed',
			createUrl: '/apps/school/api/feed',
			revokeUrl: '/apps/school/api/feed',
			addressPath: 'url',
			extraLinks: [{ path: 'webcalUrl', label: 'Open in your calendar app' }, { path: 'evil', label: 'Evil' }],
			...props,
		},
		global: { stubs },
	})
}

const byId = (wrapper, id) => wrapper.find(`[data-testid="cn-secret-address-${id}"]`)

describe('CnSecretAddressCard', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPost.mockReset()
		mockDelete.mockReset()
		mockGet.mockResolvedValue({ data: { exists: false } })
		mockPost.mockResolvedValue({ data: { url: 'https://x/feed/abc', webcalUrl: 'webcal://x/feed/abc', evil: 'javascript:alert(1)' } })
	})

	test('makes an address and shows it once with its safe links', async () => {
		const wrapper = make()
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/school/api/feed')
		expect(byId(wrapper, 'create').text()).toBe('Make an address')

		await byId(wrapper, 'create').trigger('click')
		await flush()

		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/school/api/feed')
		expect(byId(wrapper, 'value').element.value).toBe('https://x/feed/abc')
		expect(byId(wrapper, 'once').exists()).toBe(true)
		const links = wrapper.findAll('[data-testid="cn-secret-address-link"]')
		expect(links).toHaveLength(1)
		expect(links[0].attributes('href')).toBe('webcal://x/feed/abc')
		expect(byId(wrapper, 'create').text()).toBe('Reset address')
	})

	test('an existing address can be reset but is not shown', async () => {
		mockGet.mockResolvedValue({ data: { exists: true } })
		const wrapper = make()
		await flush()

		expect(byId(wrapper, 'exists').exists()).toBe(true)
		expect(byId(wrapper, 'value').exists()).toBe(false)
		expect(byId(wrapper, 'create').text()).toBe('Reset address')
	})

	test('a revoke asks first, then removes the address', async () => {
		mockGet.mockResolvedValue({ data: { exists: true } })
		mockDelete.mockResolvedValue({})
		const wrapper = make()
		await flush()

		await byId(wrapper, 'revoke').trigger('click')
		expect(mockDelete).not.toHaveBeenCalled()
		await byId(wrapper, 'revoke-confirm').trigger('click')
		await flush()

		expect(mockDelete).toHaveBeenCalledWith('/index.php/apps/school/api/feed')
		expect(byId(wrapper, 'revoked').exists()).toBe(true)
		expect(byId(wrapper, 'exists').exists()).toBe(false)
	})

	test('the object id fills the urls, a POST revoke is used, and a refusal shows the server words', async () => {
		mockPost.mockImplementation((url) => (url.endsWith('/revoke')
			? Promise.resolve({})
			: Promise.reject({ response: { data: { error: 'Only staff can do this.' } } })))
		const wrapper = make({ statusUrl: '', objectId: 's 1', createUrl: '/apps/school/api/screens/{objectId}/token', revokeUrl: '/apps/school/api/screens/{objectId}/revoke', revokeMethod: 'POST', addressPath: 'address' })
		await flush()

		expect(mockGet).not.toHaveBeenCalled()
		await byId(wrapper, 'create').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/school/api/screens/s%201/token')
		expect(byId(wrapper, 'error').text()).toBe('Only staff can do this.')
	})

	test('in dialog mode the card sits in a dialog that emits close', async () => {
		const wrapper = make({ dialog: true, title: 'Screen address' })
		await flush()

		expect(wrapper.find('.dialog').attributes('data-name')).toBe('Screen address')
		expect(wrapper.find('[data-testid="cn-secret-address"]').exists()).toBe(true)
		await wrapper.find('.x').trigger('click')
		expect(wrapper.emitted('close')).toHaveLength(1)
	})
})
