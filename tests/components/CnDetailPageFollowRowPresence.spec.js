/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak's follow row says who else is looking at the case now, with their
 * initials, before "Volgen", and draws no follower count
 * (`followRow: { presence: true, count: false }`).
 *
 * @spec openspec/changes/follow-row-presence/specs/board-follow-row/spec.md#requirement-the-follow-row-can-say-who-else-is-looking
 */
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'

const mockOthers = ref([])
const mockPresenceOptions = []
jest.mock('../../src/composables/useObjectPresence.js', () => ({
	useObjectPresence: (r, s, id, options) => {
		mockPresenceOptions.push(options)
		return { others: mockOthers, count: { value: 0 } }
	},
}))
jest.mock('../../src/utils/userDisplayName.js', () => ({
	userDisplayName: (uid) => ({ anouk: 'Anouk Bakker', lars: 'Lars de Koning' }[uid] || ''),
}))

import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

/**
 * @param {object} props Extra props.
 * @return {object} The page in the board look.
 */
function mountPage(props = {}) {
	return mount(CnDetailPage, {
		props: {
			title: 'Zaak',
			register: 'dossiq',
			schema: 'case',
			objectId: 'c1',
			look: 'board',
			objectStore: reactive({
				objects: { 'dossiq-case': { c1: { id: 'c1', title: 'Verlichting fietspad', '@self': { watching: false, watcherCount: 2, can: { manage: true } } } } },
				objectTypeRegistry: { 'dossiq-case': { register: 'dossiq', schema: 'case' } },
				schemas: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn().mockResolvedValue(null),
				fetchSchema: jest.fn().mockResolvedValue(null),
			}),
			...props,
		},
		global: {
			stubs: { CnFollowToggle: { props: ['watcherCount'], template: '<i class="follow" :data-count="watcherCount" />' }, CnPresenceAvatars: { props: ['present'], template: '<b class="avatars" :data-n="present.length" />' } },
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn() } },
		},
	})
}

beforeEach(() => {
	mockOthers.value = []
	mockPresenceOptions.length = 0
})

describe('CnDetailPage follow row: who else is looking', () => {
	it('says who else is looking, with their initials, before the Follow control', async () => {
		mockOthers.value = [{ user: 'anouk' }]
		const w = mountPage({ followRow: { presence: true, count: false } })
		await flushPromises()
		const row = w.find('[data-testid="cn-detail-page-header-row3"]')
		expect(row.find('[data-testid="cn-detail-page-presence"]').text()).toContain('Anouk Bakker is also looking at this record now')
		expect(row.find('.avatars').attributes('data-n')).toBe('1')
		expect(row.html().indexOf('cn-detail-page-presence')).toBeLessThan(row.html().indexOf('class="follow"'))
	})

	it('counts the others when more than one is looking', async () => {
		mockOthers.value = [{ user: 'anouk' }, { user: 'lars' }, { user: 'x' }]
		const w = mountPage({ followRow: { presence: true } })
		await flushPromises()
		expect(w.find('[data-testid="cn-detail-page-presence"]').text()).toContain('Anouk Bakker and 2 others are also looking at this record now')
	})

	it('says nothing while nobody else is there', async () => {
		const w = mountPage({ followRow: { presence: true } })
		await flushPromises()
		expect(w.find('[data-testid="cn-detail-page-presence"]').exists()).toBe(false)
	})

	it('drops the follower count with count: false, and keeps it otherwise', async () => {
		const w = mountPage({ followRow: { presence: true, count: false } })
		await flushPromises()
		expect(w.find('.follow').attributes('data-count')).toBeUndefined()
		const plain = mountPage()
		await flushPromises()
		expect(plain.find('.follow').attributes('data-count')).toBe('2')
	})

	it('subscribes to presence only when the row asks for it', async () => {
		mountPage({ followRow: { presence: true } })
		mountPage()
		expect(mockPresenceOptions[0].enabled()).toBe(true)
		expect(mockPresenceOptions[1].enabled()).toBe(false)
	})

	it('is accepted by the manifest schema', () => {
		const result = validateManifestV2({
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.0.0',
			menu: [],
			pages: [{ id: 'Case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', followRow: { presence: true, count: false } } }],
		})
		expect(result.errors).toEqual([])
	})
})
