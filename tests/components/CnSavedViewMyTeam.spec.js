/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTeamwachtrij opens the team queue on the reader's own team, "Team: Woo en
 * informatie", removable. The view's filter is `assignedGroup: '@myTeam'`: a
 * saved view's tokens are resolved when it is applied, `@myTeam` is the team
 * the app answers, and a reader in no team gets no team filter at all, never
 * all of their groups.
 *
 * @spec openspec/changes/saved-view-tokens-my-team/specs/saved-views-ui/spec.md#requirement-a-saved-views-filter-tokens-are-resolved-when-it-is-applied
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path, generateOcsUrl: (path) => path }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'pieter' })) }))
jest.mock('../../src/utils/groupAutocomplete.js', () => ({
	__esModule: true,
	groupDisplayName: (gid) => (gid === 'zuiddrecht-woo-en-informatie' ? 'Woo en informatie' : null),
	loadGroupDisplayName: jest.fn(() => Promise.resolve('')),
	searchNextcloudGroups: jest.fn(() => Promise.resolve([])),
	resolveNextcloudGroup: jest.fn(() => Promise.resolve(null)),
	clearGroupNameCache: jest.fn(),
}))

const { mount } = require('@vue/test-utils')
const axios = require('@nextcloud/axios').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
const { registerMyTeamSource } = require('../../src/utils/myTeam.js')

const VIEWS = [{ slug: 'team-queue', name: 'Team queue', filters: { assignedGroup: '@myTeam' } }]
const flush = () => new Promise((resolve) => setTimeout(resolve))

/**
 * @return {{wrapper: object, replace: jest.Mock}} The page and its router's replace.
 */
function mountPage() {
	const replace = jest.fn(() => Promise.resolve())
	const wrapper = mount(CnIndexPage, {
		propsData: { title: 'Cases', register: 'dossiq', schema: { slug: 'case', properties: {} }, objects: [], allowSavedViews: true, defaultSavedViews: VIEWS },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnPageHeader: true, CnIcon: true },
		mocks: { $route: { name: 'Cases', params: {}, query: {} }, $router: { push: jest.fn(), replace } },
	})
	return { wrapper, replace }
}

beforeEach(() => {
	jest.clearAllMocks()
	axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
})

afterEach(() => registerMyTeamSource(null))

describe('a saved view on @myTeam', () => {
	it('filters on the team the app answers', async () => {
		registerMyTeamSource(() => Promise.resolve('zuiddrecht-woo-en-informatie'))
		const { wrapper, replace } = mountPage()
		await flush()
		wrapper.vm.onApplySavedView(wrapper.vm.defaultFilterViews[0])
		await flush()
		expect(replace.mock.calls.at(-1)[0].query.assignedGroup).toBe('zuiddrecht-woo-en-informatie')
	})

	it('drops the filter for a reader in no team', async () => {
		registerMyTeamSource(() => Promise.resolve(null))
		const { wrapper, replace } = mountPage()
		await flush()
		wrapper.vm.onApplySavedView(wrapper.vm.defaultFilterViews[0])
		await flush()
		const query = replace.mock.calls.at(-1)[0].query
		expect(query.assignedGroup).toBeUndefined()
		expect(JSON.stringify(query)).not.toContain('@myTeam')
	})

	it('drops it when the app names no team source', async () => {
		const { wrapper, replace } = mountPage()
		await flush()
		wrapper.vm.onApplySavedView(wrapper.vm.defaultFilterViews[0])
		await flush()
		expect(replace.mock.calls.at(-1)[0].query.assignedGroup).toBeUndefined()
	})
})

describe('the team chip', () => {
	it('names a Nextcloud group by its display name', () => {
		const ctx = {
			refLabels: {},
			effectiveFacetData: {},
			effectiveSchema: { properties: { assignedGroup: { type: 'string', referenceType: 'nextcloud-group' } } },
			cnTranslate: (text) => text,
		}
		expect(CnIndexPage.methods.activeFilterValueLabel.call(ctx, 'assignedGroup', 'zuiddrecht-woo-en-informatie')).toBe('Woo en informatie')
		expect(CnIndexPage.methods.activeFilterValueLabel.call(ctx, 'assignedGroup', 'other')).toBe('other')
	})
})
