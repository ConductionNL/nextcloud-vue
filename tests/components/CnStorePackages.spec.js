/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The shipped packages under the board look (board DqMarktplaats).
 *
 * @spec openspec/changes/store-shipped-packages/specs/store-shipped-packages/spec.md
 */

import { mount } from '@vue/test-utils'
import CnStorePackages from '../../src/components/CnStorePage/CnStorePackages.vue'

const packages = [
	{ id: 'a', title: 'A', version: '1.0.0', summary: 'First', installed: '1.0.0', onRequest: false },
	{ id: 'b', title: 'B', version: '2.0.0', summary: 'Second', installed: '', onRequest: true },
	{ id: 'c', title: 'C', version: '3.0.0', summary: 'Third', installed: '', onRequest: false },
]

const flush = async () => {
	await new Promise((resolve) => setTimeout(resolve, 0))
	await new Promise((resolve) => setTimeout(resolve, 0))
}

async function factory(canInstall = true) {
	const wrapper = mount(CnStorePackages, {
		props: { app: 'dossiq', canInstall, config: { title: 'Shipped', notice: { title: 'No registry.', text: 'Nothing fetched.' }, aside: [{ title: 'Registry', rows: [{ label: 'Status', value: 'Not set', pill: true }] }] } },
	})
	await flush()
	return wrapper
}

describe('CnStorePackages', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ packages, success: true }) })
	})

	it('lists the packages with their count', async () => {
		const wrapper = await factory()
		expect(wrapper.findAll('[data-testid="store-package"]')).toHaveLength(3)
		expect(wrapper.find('[data-testid="store-packages-count"]').text()).toContain('3 packages · 1 installed')
		expect(wrapper.find('[data-testid="store-packages-notice"]').text()).toContain('No registry.')
		expect(wrapper.find('[data-testid="store-packages-aside"]').text()).toContain('Not set')
	})

	it('offers Install only on an on-request package that is not installed', async () => {
		const wrapper = await factory()
		expect(wrapper.findAll('[data-testid="store-package-install"]')).toHaveLength(1)
		expect(wrapper.findAll('[data-testid="store-package-installed"]')).toHaveLength(1)
	})

	it('hides Install from a reader who may not install', async () => {
		const wrapper = await factory(false)
		expect(wrapper.find('[data-testid="store-package-install"]').exists()).toBe(false)
	})

	it('posts the install and reads the list back', async () => {
		const wrapper = await factory()
		await wrapper.vm.install(packages[1])
		await flush()
		const [url, init] = global.fetch.mock.calls[1]
		expect(url).toContain('/api/store/packages/b/install')
		expect(init.method).toBe('POST')
		expect(global.fetch).toHaveBeenCalledTimes(3)
	})

	it('says so when the list cannot be read', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })
		const wrapper = await factory()
		expect(wrapper.find('[data-testid="store-packages-failed"]').exists()).toBe(true)
	})
})
