import axios from '@nextcloud/axios'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list's header link can point into another app with a value of the
 * record in its path: DqContact's Tickets card links "Alle 2 tickets bekijken"
 * to `/apps/pipelinq/tickets/party/{ref}` with the party's master entity.
 *
 * @spec openspec/changes/record-list-header-href-params/specs/record-widgets/spec.md#requirement-a-record-list-header-link-can-fill-its-url-from-the-record
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => `/index.php${path}` }))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountList(headerLink, objectData) {
	return mount(CnRecordListWidget, {
		props: { content: { register: 'r', schema: 'case', headerLink }, objectId: 'p-1', objectData },
		global: { stubs: { CnIcon: true, NcLoadingIcon: true } },
	})
}

function lastLink(w) {
	const events = w.emitted('header')
	return events[events.length - 1][0].link
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: [{ id: 't-1' }, { id: 't-2' }], total: 2 } })
})

describe('CnRecordListWidget header link href with params', () => {
	const LINK = { label: 'All {total} tickets', href: '/apps/pipelinq/tickets/party/{ref}', params: { ref: '@object.masterEntityRef' } }

	it('fills the path from the record and makes it a Nextcloud URL', async () => {
		const w = mountList(LINK, { id: 'p-1', masterEntityRef: 'm 1/x' })
		await flush()
		expect(lastLink(w)).toEqual({ label: 'All 2 tickets', href: '/index.php/apps/pipelinq/tickets/party/m%201%2Fx' })
	})

	it('draws no link while the record does not name the value', async () => {
		const w = mountList(LINK, { id: 'p-1' })
		await flush()
		expect(lastLink(w)).toBeNull()
	})

	it('leaves an href without params as written', async () => {
		const w = mountList({ label: 'Docs', href: 'https://example.org/x' }, { id: 'p-1' })
		await flush()
		expect(lastLink(w)).toEqual({ label: 'Docs', href: 'https://example.org/x' })
	})
})
