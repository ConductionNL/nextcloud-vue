/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/detail-page-object-widgets/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnObjectFilesWidget from '../../src/components/CnObjectFilesWidget/CnObjectFilesWidget.vue'

jest.mock('../../src/utils/cnFetch.js', () => ({
	cnFetchJson: (...args) => global.__filesApi(...args),
}))

async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0))
	await new Promise((resolve) => setTimeout(resolve, 0))
}
const stubs = {
	NcButton: { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'type', 'variant'], emits: ['click'] },
	NcLoadingIcon: true,
}
const SELF = { '@self': { id: 'P1', register: 'petstore', schema: 'pet' } }
const BASE = '/apps/openregister/api/objects/petstore/pet/P1/files'

let stored
let calls
beforeEach(() => {
	stored = []
	calls = []
	global.__filesApi = async (url, options = {}) => {
		const method = options.method || 'GET'
		calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null })
		if (method === 'POST') {
			stored.push({ id: `f${stored.length + 1}`, title: JSON.parse(options.body).name })
			return {}
		}
		if (method === 'DELETE') {
			stored = stored.filter((f) => url.endsWith(`/${f.id}`) === false)
			return null
		}
		return { results: stored }
	}
})

const mountWidget = (props = {}) => mount(CnObjectFilesWidget, { props: { objectData: SELF, ...props }, global: { stubs } })

describe('CnObjectFilesWidget', () => {
	it('lists the object\'s files from the object-files endpoint, context from @self', async () => {
		stored = [{ id: 'f0', title: 'old.pdf' }]
		const w = mountWidget()
		await flush()
		expect(calls[0]).toMatchObject({ url: BASE, method: 'GET' })
		expect(w.findAll('[data-testid="cn-object-files-row"]')).toHaveLength(1)
		expect(w.text()).toContain('old.pdf')
	})

	it('uploads a picked file as JSON {name, content}, then lists it, then deletes it', async () => {
		const w = mountWidget()
		await flush()
		expect(w.find('[data-testid="cn-object-files-empty"]').exists()).toBe(true)

		const file = new File(['hello'], 'pet.jpg', { type: 'image/jpeg' })
		await w.vm.upload([file])
		await flush()
		const post = calls.find((c) => c.method === 'POST')
		expect(post.url).toBe(BASE)
		expect(post.body.name).toBe('pet.jpg')
		expect(post.body.content).toMatch(/^data:image\/jpeg;base64,/)
		expect(w.text()).toContain('pet.jpg')
		expect(w.emitted('uploaded')[0][0]).toEqual(['pet.jpg'])

		await w.get('[data-testid="cn-object-files-delete"]').trigger('click')
		await flush()
		expect(calls.find((c) => c.method === 'DELETE').url).toBe(`${BASE}/f1`)
		expect(w.findAll('[data-testid="cn-object-files-row"]')).toHaveLength(0)
	})

	it('accepts a dropped file', async () => {
		const w = mountWidget()
		await flush()
		const file = new File(['x'], 'dropped.txt', { type: 'text/plain' })
		await w.get('[data-testid="cn-object-files"]').trigger('drop', { dataTransfer: { files: [file] } })
		await flush()
		expect(calls.some((c) => c.method === 'POST' && c.body.name === 'dropped.txt')).toBe(true)
	})

	it('disables upload and fetches nothing until the record is saved', async () => {
		const w = mountWidget({ objectData: { '@self': { register: 'petstore', schema: 'pet' } } })
		await flush()
		expect(calls).toHaveLength(0)
		expect(w.get('[data-testid="cn-object-files-upload"]').attributes('disabled')).toBeDefined()
		expect(w.find('[data-testid="cn-object-files-unsaved"]').exists()).toBe(true)
	})

	it('shows an error and emits it when the request fails', async () => {
		global.__filesApi = async () => {
			throw new Error('nope')
		}
		const w = mountWidget()
		await flush()
		expect(w.get('[data-testid="cn-object-files-error"]').exists()).toBe(true)
		expect(w.emitted('error')).toHaveLength(1)
	})
})
