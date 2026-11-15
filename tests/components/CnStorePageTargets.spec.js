/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An install can go into a chosen target (`targets`), as larpinq installs a
 * skill bundle into one world: the chosen id travels as `target`, and a page
 * without targets installs as before.
 *
 * @spec openspec/changes/store-install-target/specs/store-page/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const calls = []
beforeEach(() => {
	calls.length = 0
	global.fetch = jest.fn((url, init) => {
		calls.push({ url, init })
		return Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'ok', cards: [{ slug: 'skills', title: 'Skills' }], components: [] }) })
	})
	axios.get.mockReset()
})

const installCall = () => calls.find((c) => c.url.endsWith('/install'))

describe('CnStorePage targets', () => {
	it('sends the chosen target in the install body, the first by default', async () => {
		const w = mount(CnStorePage, { props: { app: 'larpinq', targets: [{ id: 'w1', label: 'Aldoria' }, { id: 'w2', label: 'Mirewood' }] } })
		await flushPromises()
		expect(w.find('[data-testid="store-target"]').exists()).toBe(true)
		await w.vm.install({ slug: 'skills', title: 'Skills' })
		expect(JSON.parse(installCall().init.body)).toEqual({ target: 'w1' })
		w.vm.targetId = 'w2'
		calls.length = 0
		await w.vm.install({ slug: 'skills', title: 'Skills' })
		expect(JSON.parse(installCall().init.body)).toEqual({ target: 'w2' })
	})

	it('reads the targets from a register source', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 'w7', name: 'Aldoria' }] } })
		const w = mount(CnStorePage, { props: { app: 'larpinq', targets: { register: 'larpinq', schema: 'setting', labelField: 'name' } } })
		await flushPromises()
		expect(w.vm.targetOptions).toEqual([{ id: 'w7', label: 'Aldoria' }])
		await w.vm.install({ slug: 'skills', title: 'Skills' })
		expect(JSON.parse(installCall().init.body)).toEqual({ target: 'w7' })
	})

	it('installs as before without targets', async () => {
		const w = mount(CnStorePage, { props: { app: 'larpinq' } })
		await flushPromises()
		expect(w.find('[data-testid="store-target"]').exists()).toBe(false)
		await w.vm.install({ slug: 'skills', title: 'Skills' })
		expect(installCall().init.body).toBeUndefined()
	})
})
