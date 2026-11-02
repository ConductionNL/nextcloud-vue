/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row's one action can be an icon button (DqZaakBetrokkenen Toegang: the
 * revoke button on a live link). The label names it for assistive technology
 * and as its tooltip.
 *
 * @spec openspec/changes/record-list-icon-row-action/specs/record-list/spec.md#requirement-a-rows-one-action-can-be-an-icon-button
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const LINKS = [
	{ accessLinkId: 7, label: 'Sanne de Vries', state: 'live' },
	{ accessLinkId: 8, label: 'Bureau Noord', state: 'revoked' },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountList(rowAction) {
	return mount(CnRecordListWidget, {
		props: {
			content: {
				endpointSource: { url: '/apps/dossiq/api/access-links/case/@objectId', responsePath: 'results' },
				title: 'Link for {label}',
				rowAction,
			},
			objectId: 'z-1',
			objectData: { id: 'z-1' },
		},
		global: { stubs: { CnIcon: true, NcLoadingIcon: true } },
	})
}

const REVOKE = {
	label: 'Revoke link',
	icon: 'LinkVariantOff',
	iconOnly: true,
	variant: 'outlined',
	endpoint: '/apps/dossiq/api/access-links/{accessLinkId}?caseId=@objectId',
	method: 'DELETE',
	labels: { field: 'state', map: { revoked: '' } },
}

beforeEach(() => {
	axios.get.mockReset()
	axios.request.mockReset()
	axios.get.mockResolvedValue({ data: { results: LINKS } })
})

describe('rowAction iconOnly', () => {
	it('draws the icon alone, named by its label', async () => {
		const w = mountList(REVOKE)
		await flush()
		const actions = w.findAll('[data-testid="cn-record-list-action"]')
		expect(actions).toHaveLength(1)
		const button = actions[0]
		expect(button.text()).toBe('')
		expect(button.attributes('aria-label')).toBe('Revoke link')
		expect(button.attributes('title')).toBe('Revoke link')
		expect(button.classes()).toContain('cn-record-list__action--icon')
		expect(button.findComponent({ name: 'CnIcon' }).exists()).toBe(true)
	})

	it('calls the endpoint for its row', async () => {
		const w = mountList(REVOKE)
		await flush()
		axios.request.mockResolvedValue({ data: {} })
		await w.find('[data-testid="cn-record-list-action"]').trigger('click')
		await flush()
		expect(axios.request).toHaveBeenCalledWith({ method: 'delete', url: '/apps/dossiq/api/access-links/7?caseId=z-1' })
	})

	it('keeps its label as text without an icon', async () => {
		const { icon, ...withoutIcon } = REVOKE
		const w = mountList(withoutIcon)
		await flush()
		const button = w.find('[data-testid="cn-record-list-action"]')
		expect(button.text()).toBe('Revoke link')
		expect(button.classes()).not.toContain('cn-record-list__action--icon')
	})
})
