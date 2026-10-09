/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The detail header under the board look is two rows on the ground: the title
 * as an h1 with the buttons on row 1; the pills, the breadcrumb, a middle dot
 * and the meta line on row 2. Without the look nothing changes.
 *
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-detail-header-is-two-rows-on-the-ground
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { resolveHeaderMeta } from '../../src/utils/headerMeta.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const CASE = {
	name: 'Verlichting fietspad Lindelaan',
	identifier: '2026-0082',
	channel: 'Mijn Zuiddrecht',
	kind: 'Woo request',
	status: 'In progress',
}

function makeStore(object) {
	return {
		objects: { 'reg-case': { 'id-1': object } },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

const stubs = {
	NcBreadcrumbs: { name: 'NcBreadcrumbs', template: '<nav class="nc-breadcrumbs-stub"><slot /></nav>' },
	NcBreadcrumb: { name: 'NcBreadcrumb', props: ['name', 'to', 'href'], template: '<span class="crumb">{{ name }}</span>' },
	CnDashboardGrid: { template: '<div class="grid" />' },
	CnDetailWidgetHost: { template: '<div class="host" />' },
}

function mountPage(props = {}, look = 'board', object = CASE) {
	return mount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'reg',
			schema: 'case',
			objectId: 'id-1',
			objectStore: makeStore(object),
			typePill: { field: 'kind' },
			statusPill: { field: 'status' },
			breadcrumb: { label: 'All cases', route: 'cases', currentField: 'identifier' },
			headerMeta: 'via {channel}',
			...props,
		},
		global: { stubs, provide: look ? { cnLook: look } : {} },
	})
}

const row2 = (w) => w.find('[data-testid="cn-detail-page-header-row2"]')

describe('CnDetailPage: the board header', () => {
	it('draws the title as an h1 on row 1', () => {
		const w = mountPage()
		const h1 = w.find('[data-testid="cn-detail-page-header"] h1.cn-detail-page__title')
		expect(h1.exists()).toBe(true)
		expect(h1.text()).toBe('Verlichting fietspad Lindelaan')
		expect(w.find('h2.cn-detail-page__title').exists()).toBe(false)
		expect(w.find('[data-testid="cn-detail-page-header"]').classes()).toContain('cn-detail-page__header--board')
		expect(w.classes()).toContain('cn-look-board')
	})

	it('puts the pills, the breadcrumb, a middle dot and the meta line on row 2', () => {
		const row = row2(mountPage())
		expect(row.exists()).toBe(true)
		expect(row.find('[data-testid="cn-detail-page-pill-type"]').text()).toBe('Woo request')
		expect(row.find('[data-testid="cn-detail-page-pill-status"]').text()).toBe('In progress')
		expect(row.find('[data-testid="cn-detail-page-breadcrumbs"]').text()).toContain('All cases')
		expect(row.find('[data-testid="cn-detail-page-header-dot"]').exists()).toBe(true)
		expect(row.find('[data-testid="cn-detail-page-header-meta"]').text()).toBe('via Mijn Zuiddrecht')
	})

	it('draws no breadcrumb above the header, no icon, no eyebrow and no pills in the title block', () => {
		const w = mountPage({ icon: 'Folder' })
		const header = w.find('[data-testid="cn-detail-page-header"]')
		// The only breadcrumb is the one on row 2.
		expect(w.findAll('[data-testid="cn-detail-page-breadcrumbs"]')).toHaveLength(1)
		expect(row2(w).find('[data-testid="cn-detail-page-breadcrumbs"]').exists()).toBe(true)
		expect(header.find('.cn-detail-page__icon').exists()).toBe(false)
		expect(header.find('[data-testid="cn-detail-page-type-eyebrow"]').exists()).toBe(false)
		expect(header.find('.cn-detail-page__header-text [data-testid="cn-detail-page-pills"]').exists()).toBe(false)
	})

	it('ends the breadcrumb on the kenmerk, and on the title when the record has none', () => {
		const withKenmerk = mountPage()
		expect(row2(withKenmerk).find('[data-testid="cn-detail-page-breadcrumbs"]').text()).toContain('2026-0082')
		const without = mountPage({}, 'board', { name: 'Budget 2027', kind: 'Decision', status: 'Open' })
		const text = row2(without).find('[data-testid="cn-detail-page-breadcrumbs"]').text()
		expect(text).toContain('Budget 2027')
		expect(without.find('h1.cn-detail-page__title').text()).toBe('Budget 2027')
	})

	it('draws no dot and no meta line when there is no meta', () => {
		const w = mountPage({ headerMeta: '' })
		expect(row2(w).find('[data-testid="cn-detail-page-header-dot"]').exists()).toBe(false)
		expect(row2(w).find('[data-testid="cn-detail-page-header-meta"]').exists()).toBe(false)
	})

	it('drops the meta line when a token has no value', () => {
		const w = mountPage({}, 'board', { ...CASE, channel: '' })
		expect(row2(w).find('[data-testid="cn-detail-page-header-meta"]').exists()).toBe(false)
		expect(row2(w).find('[data-testid="cn-detail-page-header-dot"]').exists()).toBe(false)
	})

	it('renders the header chips on row 2 after the meta line', () => {
		const w = mountPage({ headerFields: ['identifier'] })
		expect(row2(w).find('[data-testid="cn-detail-header-chips"]').exists()).toBe(true)
		expect(w.findAll('[data-testid="cn-detail-header-chips"]')).toHaveLength(1)
	})

	it('does not draw the header as a card in the board look', () => {
		const w = mountPage({ headerCard: true })
		expect(w.find('[data-testid="cn-detail-page-header"]').classes()).not.toContain('cn-detail-page__header--card')
	})

	it('takes the look from its own look prop without an app look', () => {
		const w = mountPage({ look: 'board' }, null)
		expect(w.find('h1.cn-detail-page__title').exists()).toBe(true)
		expect(row2(w).exists()).toBe(true)
	})

	it('renders exactly as before without the look', () => {
		const w = mountPage({}, null)
		expect(row2(w).exists()).toBe(false)
		expect(w.find('h2.cn-detail-page__title').exists()).toBe(true)
		expect(w.find('h1.cn-detail-page__title').exists()).toBe(false)
		// The breadcrumb stays above the header, the pills in the title block.
		expect(w.findAll('[data-testid="cn-detail-page-breadcrumbs"]')).toHaveLength(1)
		expect(w.find('.cn-detail-page__header-text [data-testid="cn-detail-page-pills"]').exists()).toBe(true)
		expect(w.classes()).not.toContain('cn-look-board')
		expect(w.find('[data-testid="cn-detail-page-header"]').classes()).toEqual(['cn-detail-page__header'])
	})
})

describe('resolveHeaderMeta', () => {
	it('fills tokens from the record, including dotted paths', () => {
		expect(resolveHeaderMeta('via {channel}', { channel: 'Web' })).toBe('via Web')
		expect(resolveHeaderMeta('{a.b} / {c}', { a: { b: 'x' }, c: 'y' })).toBe('x / y')
	})

	it('returns an empty line when any token is empty, and a plain template as written', () => {
		expect(resolveHeaderMeta('via {channel}', { channel: '' })).toBe('')
		expect(resolveHeaderMeta('via {channel}', null)).toBe('')
		expect(resolveHeaderMeta('Mijn Zuiddrecht', null)).toBe('Mijn Zuiddrecht')
		expect(resolveHeaderMeta('', {})).toBe('')
	})
})

describe('manifest: the board header keys on a detail page', () => {
	const manifest = (config) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'CaseDetail', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 'case', ...config } }],
	})

	it('accepts headerMeta, tabsLabel and identifierField', () => {
		const result = validateManifestV2(manifest({ look: 'board', headerMeta: 'via {channel}', tabsLabel: 'Case parts', identifierField: 'identifier' }))
		expect(result.errors).toEqual([])
	})

	it('refuses an empty or non-text value', () => {
		expect(validateManifestV2(manifest({ headerMeta: '' })).valid).toBe(false)
		expect(validateManifestV2(manifest({ tabsLabel: 3 })).valid).toBe(false)
		expect(validateManifestV2(manifest({ identifierField: '' })).valid).toBe(false)
	})
})
