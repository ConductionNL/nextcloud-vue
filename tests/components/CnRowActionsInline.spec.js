/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row can show its first actions as buttons beside the menu: board
 * PqWachtrij draws "In behandeling nemen" as a light-blue pill and View as an
 * eye on every queue row, with no menu when nothing else is left.
 *
 * @spec openspec/changes/index-row-inline-actions/specs/index-row-inline-actions/spec.md#requirement-a-row-can-show-its-first-actions-as-buttons
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnRowActions from '@/components/CnRowActions/CnRowActions.vue'

const take = jest.fn()
const actions = [
	{ id: 'assign-to-me', label: 'Take it on', handler: take },
	{ id: 'view', label: 'View', icon: 'EyeOutline', iconOnly: true, handler: jest.fn() },
	{ id: 'archive', label: 'Archive', handler: jest.fn() },
]

describe('CnRowActions inline', () => {
	it('draws the first actions as buttons, the first as a tonal pill and an iconOnly one as a named icon', async () => {
		const w = mount(CnRowActions, { props: { actions, row: { id: 't1' }, inline: 2 } })
		const buttons = w.findAll('[data-testid="cn-row-action-inline"]')
		expect(buttons).toHaveLength(2)
		expect(buttons[0].text()).toBe('Take it on')
		expect(buttons[0].classes()).toContain('cn-button--tonal')
		expect(buttons[1].text()).toBe('')
		expect(buttons[1].attributes('aria-label')).toBe('View')
		await buttons[0].trigger('click')
		expect(take).toHaveBeenCalledWith({ id: 't1' })
		expect(w.emitted('action')[0][0]).toMatchObject({ action: 'Take it on', id: 'assign-to-me' })
	})

	it('keeps the rest in the menu, and draws no menu when nothing is left', () => {
		const withRest = mount(CnRowActions, { props: { actions, row: { id: 't1' }, inline: 2 } })
		expect(withRest.findComponent({ name: 'NcActions' }).exists()).toBe(true)
		expect(withRest.vm.menuActions.map((a) => a.id)).toEqual(['archive'])
		const allInline = mount(CnRowActions, { props: { actions: actions.slice(0, 2), row: { id: 't1' }, inline: 2 } })
		expect(allInline.findComponent({ name: 'NcActions' }).exists()).toBe(false)
	})

	it('draws the menu alone by default', () => {
		const w = mount(CnRowActions, { props: { actions, row: { id: 't1' } } })
		expect(w.findAll('[data-testid="cn-row-action-inline"]')).toHaveLength(0)
		expect(w.findComponent({ name: 'NcActions' }).exists()).toBe(true)
	})

	it('is an index page option, handed to every row menu', () => {
		const page = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
		expect(page).toMatch(/rowInlineActions: \{/)
		expect((page.match(/:inline="rowInlineActions"/g) || []).length).toBe(4)
	})
})
