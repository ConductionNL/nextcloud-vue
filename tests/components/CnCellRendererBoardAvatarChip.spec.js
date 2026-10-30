/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaken / DqContacten: in the board look a person is an initials chip, never
 * the Nextcloud avatar picture; the Nextcloud look keeps the picture.
 *
 * @spec openspec/changes/board-avatar-chip/specs/data-table/spec.md#requirement-a-board-avatar-cell-draws-the-initials-chip
 */
const { mount } = require('@vue/test-utils')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

function render(look, widgetProps) {
	return mount(CnCellRenderer, {
		propsData: { value: 'pieter', widget: 'avatar', widgetProps: { user: true, nameField: 'name', ...widgetProps }, row: { name: 'Pieter Jansen' } },
		global: { provide: { cnLook: look }, stubs: { NcAvatar: { template: '<span class="nc-avatar-stub" />' } } },
	})
}

describe('CnCellRenderer avatar chip', () => {
	it('draws the initials chip in the board look', () => {
		const w = render('board', { size: 28 })
		expect(w.find('.nc-avatar-stub').exists()).toBe(false)
		const chip = w.find('.cn-cell-renderer__avatar-initials')
		expect(chip.text()).toBe('PJ')
		expect(chip.attributes('style')).toContain('width: 28px')
	})

	it('tones the chip grey with tone neutral', () => {
		expect(render('board', { tone: 'neutral' }).find('.cn-cell-renderer__avatar-initials').classes()).toContain('cn-cell-renderer__avatar-initials--neutral')
	})

	it('marks a grey chip of 28px or less compact (PqLeads owner: 12px initials)', () => {
		const classes = (props) => render('board', { tone: 'neutral', ...props }).find('.cn-cell-renderer__avatar-initials').classes()
		expect(classes({ size: 28 })).toContain('cn-cell-renderer__avatar-initials--compact')
		expect(classes({ size: 36 })).not.toContain('cn-cell-renderer__avatar-initials--compact')
	})

	it('keeps the avatar picture in the Nextcloud look', () => {
		expect(render('nextcloud', {}).find('.nc-avatar-stub').exists()).toBe(true)
	})
})
