/**
 * Tests for CnActionsBar's `headerActions[]` rendering — the receiving
 * end of CnIndexPage's `config.headerActions[]` (manifest-icons-and-
 * page-actions change). The bar only renders the buttons and emits
 * `@header-action` on click; handler dispatch happens upstream.
 */

import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

function mountBar(extra = {}) {
	return mount(CnActionsBar, {
		propsData: { selectedIds: [], objectCount: 0, ...extra },
		stubs: {
			// NcActions / NcActionButton can't easily auto-render their
			// children with their real popover layout under jsdom; stub
			// them to just render slots as a flat list so we can find
			// the rendered buttons.
			NcActions: {
				template: '<div class="nc-actions-stub"><slot /></div>',
			},
			NcActionButton: {
				template: '<button class="nc-action-button-stub" :data-disabled="disabled" @click="$emit(\'click\')"><span class="nc-action-button-stub__icon"><slot name="icon" /></span><span class="nc-action-button-stub__label"><slot /></span></button>',
				props: ['disabled', 'title'],
			},
			NcActionSeparator: { template: '<hr class="nc-action-separator-stub" />' },
			NcButton: { template: '<button class="nc-button-stub" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>', props: ['type', 'disabled'] },
			NcCheckboxRadioSwitch: { template: '<div class="nc-checkbox-radio-switch-stub"><slot /></div>' },
			NcLoadingIcon: { template: '<div class="nc-loading-icon-stub" />' },
			CnIcon: { template: '<span class="cn-icon-stub" :data-icon-name="name" />', props: ['name', 'size'] },
			Plus: { template: '<span class="plus-stub" />' },
			Refresh: { template: '<span class="refresh-stub" />' },
			ContentCopy: { template: '<span class="content-copy-stub" />' },
			TrashCanOutline: { template: '<span class="trash-stub" />' },
			Import: { template: '<span class="import-stub" />' },
			Export: { template: '<span class="export-stub" />' },
		},
	})
}

describe('CnActionsBar — headerActions rendering', () => {
	it('renders nothing extra in the overflow when headerActions is empty', () => {
		const wrapper = mountBar()
		const buttons = wrapper.findAll('.nc-action-button-stub')
		// Built-ins: Refresh + 4 mass actions = 5 (mass actions visible
		// only because showMass* defaults are true; the count text on
		// the disabled mass-action gating doesn't matter — the BUTTON is
		// still rendered).
		const labels = buttons.map(b => b.find('.nc-action-button-stub__label').text())
		expect(labels).toContain('Refresh')
		expect(labels).not.toContain('View logs')
	})

	it('renders one NcActionButton per headerActions entry', () => {
		const wrapper = mountBar({
			headerActions: [
				{ id: 'view-logs', label: 'View logs' },
				{ id: 'open-api', label: 'Open API docs' },
			],
		})
		const buttons = wrapper.findAll('.nc-action-button-stub')
		const labels = buttons.map(b => b.find('.nc-action-button-stub__label').text())
		expect(labels).toContain('View logs')
		expect(labels).toContain('Open API docs')
	})

	it('emits @header-action with { action, id } on click', async () => {
		const wrapper = mountBar({
			headerActions: [{ id: 'view-logs', label: 'View logs' }],
		})
		const buttons = wrapper.findAll('.nc-action-button-stub')
		const target = buttons.find(b => b.find('.nc-action-button-stub__label').text() === 'View logs')
		expect(target).toBeDefined()
		await target.trigger('click')
		expect(wrapper.emitted('header-action')).toEqual([[{ action: 'view-logs', id: 'view-logs' }]])
	})

	it('renders a CnIcon for an MDI-style icon name (e.g. "History")', () => {
		const wrapper = mountBar({
			headerActions: [{ id: 'h', label: 'H', icon: 'History' }],
		})
		const cnIcon = wrapper.find('.cn-icon-stub')
		expect(cnIcon.exists()).toBe(true)
		expect(cnIcon.attributes('data-icon-name')).toBe('History')
	})

	it('renders a <span> CSS-icon for an icon-* class', () => {
		const wrapper = mountBar({
			headerActions: [{ id: 'h', label: 'H', icon: 'icon-history' }],
		})
		const icon = wrapper.find('.cn-actions-bar__header-action-icon')
		expect(icon.exists()).toBe(true)
		expect(icon.classes()).toContain('icon-history')
	})

	it('propagates disabled flag to the NcActionButton', () => {
		const wrapper = mountBar({
			headerActions: [{ id: 'h', label: 'H', disabled: true }],
		})
		const target = wrapper.findAll('.nc-action-button-stub')			.find(b => b.find('.nc-action-button-stub__label').text() === 'H')
		// The stub coerces `disabled` to the DOM attribute as the literal "true" string
		expect(target.attributes('data-disabled')).toBe('true')
	})

	it('declares headerActions as Array prop with empty default', () => {
		const propDef = CnActionsBar.props.headerActions
		expect(propDef).toBeDefined()
		expect(propDef.type).toBe(Array)
		expect(propDef.default()).toEqual([])
	})

	it('isMdiIconName returns false for icon-* and true for plain names', () => {
		const wrapper = mountBar()
		expect(wrapper.vm.isMdiIconName('icon-link')).toBe(false)
		expect(wrapper.vm.isMdiIconName('History')).toBe(true)
		expect(wrapper.vm.isMdiIconName('')).toBe(false)
		expect(wrapper.vm.isMdiIconName(undefined)).toBe(false)
	})
})
