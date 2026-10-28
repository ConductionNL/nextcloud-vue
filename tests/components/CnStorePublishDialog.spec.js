/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The store page's publish dialog (board PqStore Publiceren): pick a kind,
 * pick the local configuration the item carries, name and version it, and
 * publish to the app's store registry.
 *
 * @spec openspec/changes/store-publish-dialog/specs/store-page/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnStorePage from '../../src/components/CnStorePage/CnStorePage.vue'
import CnStorePublishDialog, { slugFor } from '../../src/components/CnStorePage/CnStorePublishDialog.vue'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('@nextcloud/dialogs', () => ({ showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

const { showError, showSuccess } = jest.requireMock('@nextcloud/dialogs')

function respond(routes) {
	global.fetch = jest.fn((url, init = {}) => {
		const key = `${init.method || 'GET'} ${url}`
		const match = Object.keys(routes).find((prefix) => key.startsWith(prefix))
		const body = match ? routes[match] : {}
		return Promise.resolve({ ok: body.status ? body.status < 300 : true, status: body.status || 200, json: () => Promise.resolve(body.json ?? body) })
	})
}

async function type(w, id, value) {
	const input = w.findAllComponents({ name: 'NcTextField' }).find((c) => c.attributes('data-testid') === id)
	input.vm.$emit('update:modelValue', value)
	await flushPromises()
}

async function mountDialog() {
	const w = mount(CnStorePublishDialog, {
		props: { app: 'pipelinq', kinds: ['pipeline', 'connector'] },
		global: { stubs: { NcSelect: { props: ['modelValue', 'options'], template: '<select data-testid="kind-select" @change="$emit(\'update:modelValue\', options[1])"></select>' } } },
	})
	await flushPromises()
	return w
}

describe('slugFor', () => {
	it('makes a store slug of a title', () => {
		expect(slugFor('Pipeline voor Woo-vragen')).toBe('pipeline-voor-woo-vragen')
		expect(slugFor('  Café & Co ')).toBe('cafe-co')
	})
})

describe('CnStorePublishDialog', () => {
	beforeEach(() => {
		showError.mockClear()
		showSuccess.mockClear()
	})

	it('lists the local configuration of the chosen kind', async () => {
		respond({ 'GET /apps/pipelinq/api/store/publishable': { objects: [{ schema: 'pipeline', id: 'p-1', title: 'Verkoop' }, { schema: 'pipeline', id: 'p-2', title: 'Woo-vragen' }] } })
		const w = await mountDialog()
		expect(global.fetch.mock.calls[0][0]).toBe('/apps/pipelinq/api/store/publishable?kind=pipeline')
		expect(w.findAll('[data-testid="store-publish-object"]').map((row) => row.text())).toEqual(['Verkoop', 'Woo-vragen'])
	})

	it('publishes the item with the chosen objects and reports success', async () => {
		respond({
			'GET /apps/pipelinq/api/store/publishable': { objects: [{ schema: 'pipeline', id: 'p-2', title: 'Woo-vragen' }] },
			'POST /apps/pipelinq/api/store/publish': { outcome: 'ok', slug: 'pipeline-voor-woo-vragen' },
		})
		const w = await mountDialog()
		await type(w, 'store-publish-title', 'Pipeline voor Woo-vragen')
		await w.find('[data-testid="store-publish-object"] input').setValue(true)
		await w.find('[data-testid="store-publish-submit"]').trigger('click')
		await flushPromises()

		const [url, init] = global.fetch.mock.calls.find(([, i]) => i?.method === 'POST')
		expect(url).toBe('/apps/pipelinq/api/store/publish')
		const body = JSON.parse(init.body)
		expect(body.item).toMatchObject({ slug: 'pipeline-voor-woo-vragen', title: 'Pipeline voor Woo-vragen', kind: 'pipeline', version: '1.0.0' })
		expect(body.objects).toEqual([{ schema: 'pipeline', id: 'p-2' }])
		expect(showSuccess).toHaveBeenCalled()
		expect(w.emitted('published')[0]).toEqual(['pipeline-voor-woo-vragen'])
	})

	it('cannot publish without a title', async () => {
		respond({ 'GET /apps/pipelinq/api/store/publishable': { objects: [] } })
		const w = await mountDialog()
		expect(w.find('[data-testid="store-publish-submit"]').attributes('disabled')).toBeDefined()
	})

	it('names the remedy when the registry is not configured', async () => {
		respond({
			'GET /apps/pipelinq/api/store/publishable': { objects: [] },
			'POST /apps/pipelinq/api/store/publish': { outcome: 'not_configured', slug: '' },
		})
		const w = await mountDialog()
		await type(w, 'store-publish-title', 'Woo')
		await w.find('[data-testid="store-publish-submit"]').trigger('click')
		await flushPromises()
		expect(showError).toHaveBeenCalledWith(expect.stringContaining('No store registry is configured'))
		expect(w.emitted('published')).toBeUndefined()
	})
})

describe('CnStorePage Publish', () => {
	it('opens the publish dialog when the app accepts a publish', async () => {
		respond({ 'GET /apps/pipelinq/api/store/items': { outcome: 'ok', cards: [] } })
		const w = mount(CnStorePage, {
			props: { app: 'pipelinq', publishable: true },
			global: { provide: { cnLook: 'board' }, stubs: { CnBuildiqEditButton: true, CnStorePublishDialog: { template: '<div data-testid="publish-dialog" />' } } },
		})
		await flushPromises()
		expect(w.find('[data-testid="publish-dialog"]').exists()).toBe(false)
		await w.find('[data-testid="store-publish"]').trigger('click')
		expect(w.find('[data-testid="publish-dialog"]').exists()).toBe(true)
	})
})
