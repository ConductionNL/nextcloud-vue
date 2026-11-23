/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A caption's own count (`{count}` over `captionSource`) is written the way
 * the reader's locale writes a number: "3.912 berichten" in Dutch, as board
 * PqNieuwsbrieven draws it, not "3912 berichten".
 *
 * @spec openspec/changes/stat-caption-count-grouped/specs/stat-widget/spec.md#requirement-a-caption-count-is-written-in-the-readers-locale
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p, params = {}) => `/nc${p.replace(/\{(\w+)\}/g, (m, k) => params[k])}`) }))
jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	getCanonicalLocale: () => 'nl-NL',
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }

describe('CnStatWidget: a caption count in the reader\'s locale', () => {
	it('groups the thousands of {count}', async () => {
		axios.get.mockImplementation(async (url, { params }) => ({ data: { value: params['filter[escalated]'] !== undefined ? 3912 : 4 } }))
		const w = mount(CnStatWidget, {
			propsData: {
				content: {
					label: 'Sent this month',
					source: { register: 'pipelinq', schema: 'blast', filter: { status: 'sent' } },
					caption: '{count} messages',
					captionSource: { metric: 'sum', field: 'totals.sent', filter: { status: 'sent', escalated: true } },
				},
			},
			stubs,
			provide: { cnWorkspaceContext: {} },
		})
		await flush()
		await flush()
		await flush()
		expect(w.find('[data-testid="cn-stat-widget-caption"]').text()).toBe('3.912 messages')
	})
})
