/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/files-preview-in-place/tasks.md#task-2
 */
import { shallowMount } from '@vue/test-utils'
import CnFilePreview from '../../src/components/CnFilePreview/CnFilePreview.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcButton: { template: '<a class="btn"><slot /></a>' },
	NcLoadingIcon: true,
}

async function preview(file, body, init = {}) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: init.status || 200,
		headers: { get: () => init.contentRange || '' },
		text: async () => body,
	})
	const w = shallowMount(CnFilePreview, { propsData: { file: { accessUrl: '/s/x', id: 3, ...file } }, stubs })
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('CnFilePreview', () => {
	it('asks for the first megabyte only', async () => {
		await preview({ name: 'a.csv' }, 'a,b\n1,2\n')
		expect(global.fetch.mock.calls[0][1].headers.Range).toBe('bytes=0-1048575')
	})

	it('renders a CSV as a table with the first row as header', async () => {
		const w = await preview({ name: 'a.csv' }, 'name,age\nAnna,30\n"Bram, B",41\n')
		expect(w.findAll('th').map((th) => th.text())).toEqual(['name', 'age'])
		expect(w.findAll('tbody tr')).toHaveLength(2)
		expect(w.findAll('tbody td').at(2).text()).toBe('Bram, B')
		expect(w.find('[data-testid="cn-file-preview-count"]').text()).toBe('Showing all 2 rows')
	})

	it('shows 100 rows and an estimate for a long file', async () => {
		const rows = ['id,value']
		for (let i = 0; i < 300; i++) {
			rows.push(`${i},v${i}`)
		}
		const w = await preview({ name: 'big.csv', size: 40000 * 8 }, rows.join('\n'))
		expect(w.findAll('tbody tr')).toHaveLength(100)
		expect(w.find('[data-testid="cn-file-preview-count"]').text()).toMatch(/^Showing the first 100 of about [\d,.\s]+ rows$/)
	})

	it('parses a TSV', async () => {
		const w = await preview({ name: 'a.tsv' }, 'a\tb\n1\t2\n')
		expect(w.findAll('th').map((th) => th.text())).toEqual(['a', 'b'])
	})

	it('formats JSON read-only', async () => {
		const w = await preview({ name: 'a.json' }, '{"a":1}')
		expect(w.find('pre').text()).toBe('{\n  "a": 1\n}')
	})

	it('shows raw text and a sentence for a CSV with unbalanced quotes', async () => {
		const w = await preview({ name: 'a.csv' }, 'a,b\n"open,1\n')
		expect(w.find('[data-testid="cn-file-preview-unreadable"]').exists()).toBe(true)
		expect(w.find('pre').text()).toContain('"open,1')
		expect(w.find('table').exists()).toBe(false)
	})

	it('renders cell content as text, never HTML', async () => {
		const w = await preview({ name: 'a.csv' }, 'h\n<img src=x onerror=alert(1)>\n')
		expect(w.find('td img').exists()).toBe(false)
		expect(w.find('td').text()).toBe('<img src=x onerror=alert(1)>')
	})

	it('offers Download and Open in Files', async () => {
		const w = await preview({ name: 'a.csv' }, 'h\n1\n')
		const labels = w.findAll('.btn').map((b) => b.text())
		expect(labels).toEqual(['Open in Files', 'Download'])
	})

	it('says so when the file cannot be loaded', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, headers: { get: () => '' }, text: async () => '' })
		const w = shallowMount(CnFilePreview, { propsData: { file: { accessUrl: '/s/x', name: 'a.csv' } }, stubs })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(w.find('.note').text()).toBe('The preview could not be loaded.')
	})
})
