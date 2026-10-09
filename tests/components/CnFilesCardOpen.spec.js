/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/files-preview-in-place/tasks.md#task-3
 */
import { shallowMount } from '@vue/test-utils'
import CnFilesCard from '../../src/components/CnFilesCard/CnFilesCard.vue'

const files = [
	{ id: 1, name: 'Besluit.pdf', type: 'application/pdf', path: '/admin/files/Besluit.pdf', url: 'https://x.nl/b.pdf', size: 10 },
	{ id: 2, name: 'data.csv', type: 'text/csv', url: 'https://x.nl/d.csv', size: 20 },
]

async function mountCard() {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: files }) })
	const w = shallowMount(CnFilesCard, {
		propsData: { register: 'r', schema: 's', objectId: 'o' },
		stubs: { CnDetailCard: { template: '<div><slot /><slot name="footer" /></div>' }, CnFilePreview: true },
	})
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('CnFilesCard opens files through the opener', () => {
	afterEach(() => {
		delete window.OCA
		jest.restoreAllMocks()
	})

	it('renders rows as buttons labelled with the file name', async () => {
		const w = await mountCard()
		const buttons = w.findAll('button.cn-files-card__open')
		expect(buttons.map((b) => b.attributes('aria-label'))).toEqual(['Besluit.pdf', 'data.csv'])
		expect(w.find('a').exists()).toBe(false)
	})

	it('opens in the Viewer when it handles the type', async () => {
		const open = jest.fn()
		window.OCA = { Viewer: { open } }
		const w = await mountCard()
		await w.findAll('button.cn-files-card__open').at(0).trigger('click')
		expect(open).toHaveBeenCalledWith({ path: '/admin/files/Besluit.pdf' })
	})

	it('previews a CSV in the page', async () => {
		const w = await mountCard()
		await w.findAll('button.cn-files-card__open').at(1).trigger('click')
		expect(w.vm.previewFile.name).toBe('data.csv')
	})
})
