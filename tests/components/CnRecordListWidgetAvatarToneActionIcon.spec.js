/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakBesluiten Adviezen: an open request's initials sit on the warning
 * tint (`avatar.tone`), a received one's stay neutral, and "Herinneren"
 * carries its icon (`rowAction.icon`).
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const ROWS = [
	{ id: 'a-1', subject: 'Advies verlichting', advisor: 'Mobiliteit Verkeer', status: 'requested' },
	{ id: 'a-2', subject: 'Juridische toets', advisor: 'Juridische Zaken', status: 'received' },
]

/** Let the reads settle. */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

describe('record list avatar tone and row action icon', () => {
	it('tints an open request\'s initials and draws the reminder\'s icon', async () => {
		axios.get.mockResolvedValue({ data: { results: ROWS, total: 2 } })
		const w = mount(CnRecordListWidget, {
			props: {
				content: {
					register: 'r',
					schema: 'advice',
					presentation: 'rows',
					title: '{subject}',
					avatar: { text: '{advisor}', size: 32, tone: { field: 'status', map: { requested: 'warning' } } },
					rowAction: { label: 'Remind', icon: 'BellOutline', endpoint: '/apps/x/remind/{id}', labels: { field: 'status', map: { received: '' } } },
				},
				objectId: 'c-1',
				objectData: { id: 'c-1' },
			},
			global: { stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' }, NcLoadingIcon: true } },
		})
		await flush()
		const avatars = w.findAll('[data-testid="cn-record-list-avatar"]')
		expect(avatars[0].classes()).toContain('cn-status-badge--warning')
		expect(avatars[1].classes().join(' ')).not.toContain('cn-status-badge--')
		const action = w.find('[data-testid="cn-record-list-action"]')
		expect(action.find('.icon').attributes('data-name')).toBe('BellOutline')
		expect(action.text()).toBe('Remind')
	})
})
