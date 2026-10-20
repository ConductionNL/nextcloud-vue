/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The redaction editor as a page: a manifest names it by type, and its
 * breadcrumb leads back to the record without a wrapper component.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-the-redaction-editor-is-a-page-type
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url, params = {}) => '/index.php' + url.replace(/\{(\w+)\}/g, (_m, k) => params[k] ?? `{${k}}`) }))

import { mount } from '@vue/test-utils'
import CnRedactionEditor from '../../src/components/CnRedactionEditor/CnRedactionEditor.vue'
import { defaultPageTypes } from '../../src/components/CnPageRenderer/pageTypes.js'

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const CRUMBS = [
	{ label: 'All items', route: { name: 'Items' } },
	{ label: '{identifier}', fallback: 'Item', route: { name: 'ItemDetail', params: { id: '{recordId}' } } },
	{ label: 'Redact' },
]

function mountEditor(record) {
	mockGet.mockImplementation((url) => {
		if (url.includes('/apps/openregister/api/objects/x/item/r-1')) {
			return record instanceof Error ? Promise.reject(record) : Promise.resolve({ data: record })
		}
		return Promise.resolve({ data: { documents: [] } })
	})
	return mount(CnRedactionEditor, {
		props: { recordId: 'r-1', config: { urls: { list: '/apps/x/api/items/{recordId}/redactions' } }, breadcrumbs: CRUMBS, recordSource: { register: 'x', schema: 'item' } },
		global: { stubs: { CnBreadcrumbs: { props: ['crumbs'], template: '<nav data-testid="cn-redaction-crumbs">{{ JSON.stringify(crumbs) }}</nav>' } } },
	})
}

describe('CnRedactionEditor as a page', () => {
	it('is the redaction page type', () => {
		expect(defaultPageTypes.redaction).toBeTruthy()
	})

	it('names the record in the trail, and leads back to it', async () => {
		const w = mountEditor({ id: 'r-1', identifier: '2026-0012' })
		await flush()
		const crumbs = JSON.parse(w.find('[data-testid="cn-redaction-crumbs"]').text())
		expect(crumbs).toEqual([
			{ label: 'All items', to: { name: 'Items', params: {} } },
			{ label: '2026-0012', to: { name: 'ItemDetail', params: { id: 'r-1' } } },
			{ label: 'Redact' },
		])
	})

	it('falls back to the word when the record cannot be read', async () => {
		const w = mountEditor(new Error('404'))
		await flush()
		expect(JSON.parse(w.find('[data-testid="cn-redaction-crumbs"]').text())[1].label).toBe('Item')
	})
})
