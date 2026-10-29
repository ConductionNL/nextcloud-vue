/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A reported header action with `variant: "secondary"` is the card's outlined
 * button in the title row (PqKlant/PqOrganisatie Contactkanalen and Relaties
 * "Toevoegen", as DqTaak "Notitie toevoegen"); with `items` it opens a menu of
 * those items. The side column shows such a button.
 *
 * @spec openspec/changes/header-item-card-button/specs/header-item-card-button/spec.md
 */
const fs = require('fs')
const path = require('path')
const { mount } = require('@vue/test-utils')
const CnDetailWidgetHeaderItems = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue').default
const CnDetailWidgetHost = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Mount the header items with the given actions.
 *
 * @param {Array<object>} actions The reported actions.
 * @return {object} The wrapper.
 */
function mountItems(actions) {
	return mount(CnDetailWidgetHeaderItems, {
		props: { header: { pill: null, note: '', actions } },
		global: {
			stubs: {
				CnIcon: true,
				CnStatusBadge: true,
				NcButton: { template: '<button class="nc-button-stub" :data-variant="variant" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>', props: ['variant', 'ariaLabel'], emits: ['click'] },
				NcActions: { template: '<div class="nc-actions-stub" :data-variant="variant" :data-menu-name="menuName" :data-force="String(forceMenu)" :aria-label="ariaLabel"><slot name="icon" /><slot /></div>', props: ['variant', 'menuName', 'forceMenu', 'forceName', 'ariaLabel'] },
				NcActionButton: { template: '<button class="nc-action-button-stub" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
			},
		},
	})
}

describe('CnDetailWidgetHeaderItems: the card button', () => {
	it('draws a secondary action as the outlined card button, named by its aria label', async () => {
		const run = jest.fn()
		const w = mountItems([{ label: 'Add', ariaLabel: 'Add relationship', icon: 'Plus', variant: 'secondary', run }])
		const button = w.find('.cn-detail-widget-header-items__card-button')
		expect(button.exists()).toBe(true)
		expect(button.attributes('data-variant')).toBe('secondary')
		expect(button.attributes('aria-label')).toBe('Add relationship')
		expect(button.text()).toBe('Add')
		expect(w.find('.cn-detail-page__catalog-action').exists()).toBe(false)
		await button.trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
	})

	it('draws an action with items as a secondary menu of those items', async () => {
		const email = jest.fn()
		const phone = jest.fn()
		const w = mountItems([{
			label: 'Add',
			ariaLabel: 'Add channel',
			icon: 'Plus',
			variant: 'secondary',
			items: [{ label: 'Email address', run: email }, { label: 'Phone number', run: phone }],
		}])
		const menu = w.find('.nc-actions-stub')
		expect(menu.classes()).toContain('cn-detail-widget-header-items__card-button')
		expect(menu.attributes('data-variant')).toBe('secondary')
		expect(menu.attributes('data-menu-name')).toBe('Add')
		expect(menu.attributes('data-force')).toBe('true')
		expect(menu.attributes('aria-label')).toBe('Add channel')
		const items = w.findAll('.nc-action-button-stub')
		expect(items.map((i) => i.text())).toEqual(['Email address', 'Phone number'])
		await items[1].trigger('click')
		expect(phone).toHaveBeenCalledTimes(1)
		expect(email).not.toHaveBeenCalled()
	})

	it('keeps the tinted catalog action for an action without a variant', () => {
		const w = mountItems([{ label: 'Add', run: () => {} }])
		expect(w.find('.cn-detail-page__catalog-action').exists()).toBe(true)
		expect(w.find('.cn-detail-widget-header-items__card-button').exists()).toBe(false)
	})
})

describe('CnDetailWidgetHost: a reported menu action', () => {
	it('keeps an action that has items and no run of its own', () => {
		const ctx = { rendererHeader: null }
		CnDetailWidgetHost.methods.onRendererHeader.call(ctx, {
			actions: [{ label: 'Add', items: [{ label: 'Email address', run: () => {} }] }, { label: 'Empty', items: [] }],
		})
		expect(ctx.rendererHeader.actions.map((a) => a.label)).toEqual(['Add'])
	})
})

describe('board look: the side column shows a card button', () => {
	it('lists the card button in the rule that shows a side card\'s actions', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page__side .cn-widget-wrapper__actions:has(.cn-detail-page__catalog-action),')
		expect(at).toBeGreaterThan(-1)
		const head = css.slice(at, css.indexOf('{', at))
		expect(head).toContain(':has(.cn-detail-widget-header-items__card-button)')
	})
})
