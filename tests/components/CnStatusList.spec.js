/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatusList: items with a status pill and a due date, and counts per status.
 *
 * @spec openspec/changes/status-list/specs/status-list/spec.md
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnStatusList from '../../src/components/CnStatusList/CnStatusList.vue'

jest.mock('@nextcloud/l10n', () => ({
	getLanguage: () => 'en',
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key])),
}))

const ITEMS = [
	{ id: 'a', title: 'Bouwvergunning Dorpsstraat 1', href: '/apps/dossiq/cases/a', meta: 'Z-2026-001', due: '2026-11-20', status: { label: 'In behandeling', variant: 'purple' } },
	{ id: 'b', title: 'Kapvergunning', href: 'https://op.example/wp/2', external: true, due: '2026-11-30', status: { label: 'Open', variant: 'nope' } },
	{ id: 'c', title: 'Klaar', due: '2026-11-01', done: true },
	{ id: 'd', title: '' },
]

/**
 * Mount the list.
 *
 * @param {object} props The props.
 * @return {object} The wrapper.
 */
function mountList(props = {}) {
	return mount(CnStatusList, { props: { today: '2026-11-22', ...props }, global: { stubs: { NcLoadingIcon: true } } })
}

describe('CnStatusList', () => {
	it('draws every titled item with its link, detail and status pill', () => {
		const wrapper = mountList({ items: ITEMS })
		const rows = wrapper.findAll('[data-testid="cn-status-list-item"]')
		expect(rows).toHaveLength(3)
		const first = rows[0]
		expect(first.get('a').attributes('href')).toBe('/apps/dossiq/cases/a')
		expect(first.text()).toContain('Z-2026-001')
		expect(first.text()).toContain('In behandeling')
		expect(rows[1].get('a').attributes('target')).toBe('_blank')
		expect(rows[1].get('a').attributes('rel')).toBe('noopener noreferrer')
		expect(rows[2].find('a').exists()).toBe(false)
	})

	it('marks a passed due date as overdue, unless the item is done', () => {
		const wrapper = mountList({ items: ITEMS })
		const dues = wrapper.findAll('[data-testid="cn-status-list-due"]')
		expect(dues[0].text()).toMatch(/^Overdue since/)
		expect(dues[0].classes()).toContain('cn-status-list__due--overdue')
		expect(dues[1].text()).toMatch(/^Due/)
		expect(dues[2].classes()).not.toContain('cn-status-list__due--overdue')
	})

	it('draws the counts per status above the items', () => {
		const wrapper = mountList({ items: ITEMS, counts: [{ key: 'open', label: 'Open', count: 4, variant: 'primary' }, { label: 'Broken' }] })
		const counts = wrapper.findAll('[data-testid^="cn-status-list-count-"]')
		expect(counts).toHaveLength(1)
		expect(counts[0].text()).toContain('Open')
		expect(counts[0].text()).toContain('4')
	})

	it('draws the actions slot at the end of every row', () => {
		const wrapper = mount(CnStatusList, {
			props: { items: ITEMS, today: '2026-11-22' },
			slots: { actions: (scope) => h('button', { class: 'star' }, scope.item.id) },
			global: { stubs: { NcLoadingIcon: true } },
		})
		expect(wrapper.findAll('button.star').map((b) => b.text())).toEqual(['a', 'b', 'c'])
	})

	it('says when there is nothing, and shows an error instead of items', () => {
		expect(mountList({ emptyLabel: 'No cases' }).get('[data-testid="cn-status-list-empty"]').text()).toBe('No cases')
		expect(mountList().get('[data-testid="cn-status-list-empty"]').text()).toBe('Nothing to show')
		const failed = mountList({ items: ITEMS, error: 'Could not load' })
		expect(failed.get('[data-testid="cn-status-list-error"]').text()).toBe('Could not load')
		expect(failed.find('[data-testid="cn-status-list-item"]').exists()).toBe(false)
	})
})
