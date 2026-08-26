/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnBreadcrumbs — the declarative breadcrumb trail wrapping
 * NcBreadcrumbs/NcBreadcrumb: one entry per crumb, link targets on every
 * crumb but the last, the last crumb unlinked with aria-current="page",
 * icon crumbs resolved through CnIcon, and nothing rendered for an empty
 * trail.
 */

import { mount } from '@vue/test-utils'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'

const CRUMBS = [
	{ icon: 'Home', to: { name: 'SecretList' } },
	{ label: 'Team vault', to: { name: 'SecretListFolder', params: { folderId: '7' } } },
	{ label: 'Production' },
]

const crumbEls = (wrapper) => wrapper.findAll('[data-testid^="cn-breadcrumbs-crumb-"]')

describe('CnBreadcrumbs', () => {
	it('renders one NcBreadcrumb per crumb with the label as its name', () => {
		const wrapper = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS } })
		const crumbs = crumbEls(wrapper)
		expect(crumbs).toHaveLength(3)
		expect(crumbs[1].attributes('name')).toBe('Team vault')
		expect(crumbs[2].attributes('name')).toBe('Production')
	})

	it('links every crumb but the last, which renders unlinked with aria-current="page"', () => {
		const wrapper = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS } })
		const crumbs = crumbEls(wrapper)
		// Non-last crumbs carry their router target; the stub reflects the
		// bound `to` object as an attribute.
		expect(crumbs[0].attributes('to')).toBeDefined()
		expect(crumbs[1].attributes('to')).toBeDefined()
		expect(crumbs[0].attributes('aria-current')).toBeUndefined()
		expect(crumbs[1].attributes('aria-current')).toBeUndefined()
		// The last crumb is the current location: no target, aria-current set.
		expect(crumbs[2].attributes('to')).toBeUndefined()
		expect(crumbs[2].attributes('href')).toBeUndefined()
		expect(crumbs[2].attributes('aria-current')).toBe('page')
	})

	it('drops the link from the last crumb even when the caller supplies one', () => {
		const wrapper = mount(CnBreadcrumbs, {
			propsData: { crumbs: [{ label: 'Only', to: { name: 'Somewhere' }, href: '/x' }] },
		})
		const crumb = crumbEls(wrapper)[0]
		expect(crumb.attributes('to')).toBeUndefined()
		expect(crumb.attributes('href')).toBeUndefined()
		expect(crumb.attributes('aria-current')).toBe('page')
	})

	it('renders an href crumb as a plain link', () => {
		const wrapper = mount(CnBreadcrumbs, {
			propsData: { crumbs: [{ label: 'Docs', href: 'https://example.org' }, { label: 'Here' }] },
		})
		expect(crumbEls(wrapper)[0].attributes('href')).toBe('https://example.org')
	})

	it('resolves crumb icons through CnIcon by PascalCase name', () => {
		const wrapper = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS } })
		const icon = crumbEls(wrapper)[0].findComponent({ name: 'CnIcon' })
		expect(icon.exists()).toBe(true)
		expect(icon.props('name')).toBe('Home')
	})

	it('renders nothing for an empty trail', () => {
		const wrapper = mount(CnBreadcrumbs, { propsData: { crumbs: [] } })
		expect(wrapper.find('[data-testid="cn-breadcrumbs"]').exists()).toBe(false)
	})

	it('labels the nav landmark, with an overridable aria-label', () => {
		const wrapper = mount(CnBreadcrumbs, { propsData: { crumbs: CRUMBS } })
		expect(wrapper.find('[data-testid="cn-breadcrumbs"]').attributes('aria-label')).toBe('Breadcrumbs')
		const custom = mount(CnBreadcrumbs, {
			propsData: { crumbs: CRUMBS, ariaLabel: 'Folder trail' },
		})
		expect(custom.find('[data-testid="cn-breadcrumbs"]').attributes('aria-label')).toBe('Folder trail')
	})
})
