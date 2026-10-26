/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record list avatar can carry the primary tint (`avatar.tone: "primary"`),
 * as DqZaakGerelateerd draws a related case's type initials (r31: grey).
 *
 * @spec openspec/changes/record-list-avatar-tone/specs/record-list-avatar/spec.md
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

function mountList(avatar) {
	return mount(CnRecordListWidget, {
		props: { content: { endpointSource: { url: '/apps/x/api/related', responsePath: 'results' }, presentation: 'rows', title: '{title}', avatar } },
		global: { mocks: { $router: { push: jest.fn() } } },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: { results: [{ id: 'c-1', title: 'Aanleg fietspad Lindelaan', caseTypeTitle: 'Omgevingsvergunning' }] } })
	invalidateEndpointSourceCache()
})

describe('CnRecordListWidget avatar tone', () => {
	it('tints the avatar and reads its initials from the template', async () => {
		const w = mountList({ text: '{caseTypeTitle}', size: 32, tone: 'primary' })
		await flush()
		expect(w.find('.cn-record-list__list').classes()).toContain('cn-record-list__list--avatar-primary')
		expect(w.find('[data-testid="cn-record-list-avatar"]').text()).toBe('O')
	})

	it('keeps the plain avatar without a tone', async () => {
		const w = mountList('{title}')
		await flush()
		expect(w.find('.cn-record-list__list').classes()).not.toContain('cn-record-list__list--avatar-primary')
	})
})
