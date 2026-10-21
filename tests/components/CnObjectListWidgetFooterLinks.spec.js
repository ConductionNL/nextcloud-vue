/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.footerLinks` ends an object list with a row of links, each with an
 * optional muted note (DqZaakGerelateerd: "Alle zaken op dit object",
 * "Objecttypen beheren (alleen voor beheerders)"). A link with `group` shows
 * only to members of that group.
 *
 * @spec openspec/changes/object-list-footer-links/specs/object-list/spec.md#requirement-an-object-list-can-end-with-a-row-of-links
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

let mockGroups = []
jest.mock('../../src/utils/widgetVisibility.js', () => ({
	getCurrentUserGroups: () => Promise.resolve(mockGroups),
}))

const NL = { 'All cases on this object': 'Alle zaken op dit object', 'Manage object types': 'Objecttypen beheren', '(administrators only)': '(alleen voor beheerders)' }

const LINKS = [
	{ label: 'All cases on this object', route: 'Cases', query: { object: '@objectId' } },
	{ label: 'Manage object types', href: '/settings/admin/dossiq#object-types', note: '(administrators only)', group: 'admin' },
]

async function mountList(content, push = jest.fn(() => Promise.resolve())) {
	const router = { push, resolve: (loc) => ({ href: `/r/${loc.name}?${new URLSearchParams(loc.query).toString()}` }) }
	const w = shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'dossiq', schema: 'object', columns: [{ key: 'name', label: 'Naam', widget: 'text' }], ...content } },
		global: { provide: { cnTranslate: (key) => NL[key] ?? key, cnObjectContext: { objectId: 'case-1' } }, mocks: { $router: router }, stubs: { CnDataTable: true } },
	})
	await flushPromises()
	return w
}

const linksOf = (w) => w.findAll('[data-testid="cn-object-list-widget-link"]').map((a) => a.text())

describe('CnObjectListWidget footerLinks', () => {
	beforeEach(() => {
		mockGroups = []
	})

	it('draws the links through the host translate, a route link with its resolved href', async () => {
		mockGroups = ['admin']
		const w = await mountList({ footerLinks: LINKS })
		expect(linksOf(w)).toEqual(['Alle zaken op dit object', 'Objecttypen beheren'])
		const [cases, types] = w.findAll('[data-testid="cn-object-list-widget-link"]')
		expect(cases.attributes('href')).toBe('/r/Cases?object=case-1')
		expect(types.attributes('href')).toBe('/settings/admin/dossiq#object-types')
		expect(w.find('[data-testid="cn-object-list-widget-link-note"]').text()).toBe('(alleen voor beheerders)')
	})

	it('hides a link from a user outside its group', async () => {
		const w = await mountList({ footerLinks: LINKS })
		expect(linksOf(w)).toEqual(['Alle zaken op dit object'])
	})

	it('follows a route link through the router', async () => {
		const push = jest.fn(() => Promise.resolve())
		const w = await mountList({ footerLinks: [LINKS[0]] }, push)
		await w.find('[data-testid="cn-object-list-widget-link"]').trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'Cases', query: { object: 'case-1' } })
	})

	it('draws no link row without footerLinks', async () => {
		const w = await mountList({})
		expect(w.find('[data-testid="cn-object-list-widget-links"]').exists()).toBe(false)
	})
})
