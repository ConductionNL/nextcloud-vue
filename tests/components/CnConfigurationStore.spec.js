/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnConfigurationStore — the federated configuration store settings
 * pane: it lists the user's GitHub credentials (provider-filtered), reflects and
 * persists the chosen store credential, browses published bundles by a type's
 * topic, and fails soft when OpenRegister is unreachable.
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'

import CnConfigurationStore from '../../src/components/CnConfigurationStore/CnConfigurationStore.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showError: jest.fn(),
	showSuccess: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcAppSettingsSection: { name: 'NcAppSettingsSection', template: '<div><slot /></div>' },
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	NcNoteCard: { name: 'NcNoteCard', template: '<div class="note"><slot /></div>' },
	NcEmptyContent: { name: 'NcEmptyContent', template: '<div class="empty"><slot /></div>' },
	NcButton: { name: 'NcButton', template: '<button><slot /></button>' },
	NcSelect: {
		name: 'NcSelect',
		props: ['options', 'value'],
		template: '<select class="ncselect" @change="$emit(\'input\', options[$event.target.value])"><option v-for="(o,i) in options" :key="i" :value="i">{{ o.name }}</option></select>',
	},
	NcTextField: {
		name: 'NcTextField',
		props: ['value', 'label'],
		template: '<input class="nctextfield" :value="value" @input="$emit(\'input\', $event.target.value)" />',
	},
}

function routes(overrides = {}) {
	const creds = overrides.credentials ?? [
		{ id: 'gh-1', name: 'My GitHub', provider: 'github' },
		{ id: 'gl-1', name: 'My GitLab', provider: 'gitlab' },
	]
	axios.get.mockImplementation((url) => {
		if (url.includes('/credentials')) return Promise.resolve({ data: { results: creds } })
		if (url.includes('/preferences/')) return Promise.resolve({ data: { value: overrides.pref ?? '' } })
		if (url.includes('/federated-config/types')) return Promise.resolve({ data: { types: overrides.types ?? [{ id: 'a.b', name: 'A/B', topic: 'a-b' }] } })
		if (url.includes('/federated-config/public-key')) return Promise.resolve({ data: { publicKey: overrides.key ?? 'KEY==' } })
		if (url.includes('/federated-config/discover')) return Promise.resolve({ data: { results: overrides.discovered ?? [] } })
		if (url.includes('/federated-config/trust')) {
			return overrides.trust
				? Promise.resolve({ data: overrides.trust })
				: Promise.reject(Object.assign(new Error('forbidden'), { response: { status: 403 } }))
		}
		return Promise.resolve({ data: {} })
	})
	axios.put.mockResolvedValue({ data: { value: overrides.pref ?? '' } })
}

describe('CnConfigurationStore', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.put.mockReset()
	})

	it('lists only GitHub credentials in the picker', async () => {
		routes()
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		expect(wrapper.vm.githubCredentials.map((c) => c.id)).toEqual(['gh-1'])
	})

	it('reflects the persisted credential choice', async () => {
		routes({ pref: 'gh-1' })
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		expect(wrapper.vm.selectedCredential?.id).toBe('gh-1')
	})

	it('persists a new credential choice via the preferences endpoint', async () => {
		routes()
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		await wrapper.vm.onCredentialChange({ id: 'gh-1', name: 'My GitHub', provider: 'github' })
		expect(axios.put).toHaveBeenCalledWith(
			expect.stringContaining('/preferences/federated-config-credential'),
			{ value: 'gh-1' },
		)
	})

	it('discovers published bundles for the picked type', async () => {
		routes({ discovered: [{ repo: 'org/pack', url: 'https://x', stars: 3, description: 'd' }] })
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		await wrapper.vm.onTypeChange({ id: 'a.b', name: 'A/B', topic: 'a-b' })
		expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('discover?topic=a-b'))
		expect(wrapper.vm.discovered).toHaveLength(1)
	})

	it('fails soft when OpenRegister is unreachable', async () => {
		axios.get.mockRejectedValue(new Error('boom'))
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		expect(wrapper.vm.unavailable).toBe(true)
	})

	it('shows the governance block for an admin (trust endpoint returns config)', async () => {
		routes({ trust: { sourceAllowlist: 'ConductionNL', trustedKeys: '', publishGroups: 'editors', installGroups: '' } })
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		expect(wrapper.vm.trust).not.toBeNull()
		expect(wrapper.vm.trust.sourceAllowlist).toBe('ConductionNL')
	})

	it('hides the governance block for a non-admin (trust 403)', async () => {
		routes() // no trust override → the trust route rejects 403
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		expect(wrapper.vm.trust).toBeNull()
	})

	it('saves each trust field through the trust endpoint', async () => {
		routes({ trust: { sourceAllowlist: 'acme', trustedKeys: 'K=', publishGroups: '', installGroups: 'staff' } })
		const wrapper = mount(CnConfigurationStore, { stubs })
		await flush()
		await wrapper.vm.saveTrust()
		expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('/federated-config/trust'), { field: 'sourceAllowlist', value: 'acme' })
		expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('/federated-config/trust'), { field: 'installGroups', value: 'staff' })
	})
})
