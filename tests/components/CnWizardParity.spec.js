/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board stepper, eyebrow and footer of wizards and stepped form pages
 * (screens-wizard-parity). The Nextcloud look is asserted unchanged.
 *
 * @spec openspec/changes/screens-wizard-parity/tasks.md
 */
import { mount } from '@vue/test-utils'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import CnStepper from '../../src/components/CnStepper/CnStepper.vue'
import CnWizardDialog from '../../src/components/CnWizardDialog/CnWizardDialog.vue'

const board = { provide: { cnLook: 'board' } }
const steps = [
	{ id: 'a', label: 'Audience' },
	{ id: 'b', label: 'Course' },
	{ id: 'c', label: 'Confirm' },
	{ id: 'd', label: 'Send' },
	{ id: 'e', label: 'Done' },
]
const slots = Object.fromEntries(steps.map((s) => [`step-${s.id}`, `<p>${s.label}</p>`]))

function wizard(props = {}, look = true) {
	return mount(CnWizardDialog, { props: { steps, dialogTitle: 'New newsletter', ...props }, slots, global: look ? board : {} })
}

describe('the board stepper (task 1)', () => {
	it('draws check, current and upcoming states on step 3 of 5', () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 2, look: 'board' } })
		const items = w.findAll('li')
		expect(items.map((i) => i.classes().filter((c) => /^cn-stepper__item--(done|current|upcoming)$/.test(c)).join())).toEqual([
			'cn-stepper__item--done',
			'cn-stepper__item--done',
			'cn-stepper__item--current',
			'cn-stepper__item--upcoming',
			'cn-stepper__item--upcoming',
		])
		// A finished step shows an SVG check, never a text glyph.
		expect(items[0].find('svg').exists()).toBe(true)
		expect(items[0].text()).not.toContain('✓')
		// The current and the upcoming steps show their number.
		expect(items[2].find('.cn-stepper__dot').text()).toBe('3')
		expect(items[3].find('.cn-stepper__dot').text()).toBe('4')
		expect(w.classes()).toContain('cn-stepper--board')
	})

	it('colours the connector after a finished step and not otherwise', () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 2, look: 'board' } })
		const connectors = w.findAll('.cn-stepper__connector')
		expect(connectors).toHaveLength(4)
		expect(connectors.map((c) => c.classes().includes('cn-stepper__connector--done'))).toEqual([true, true, false, false])
	})

	it('keeps the stacked stepper, with its text glyph and class names, in the Nextcloud look', () => {
		const w = mount(CnStepper, { props: { steps, currentIndex: 1, look: 'nextcloud' } })
		expect(w.classes()).not.toContain('cn-stepper--board')
		expect(w.find('.cn-wizard-dialog__progress-item--done .cn-wizard-dialog__progress-check').text()).toBe('✓')
		expect(w.findAll('.cn-wizard-dialog__progress-connector--done')).toHaveLength(1)
	})

	it('follows the injected look when no prop is given', () => {
		expect(mount(CnStepper, { props: { steps, currentIndex: 0 }, global: board }).classes()).toContain('cn-stepper--board')
		expect(mount(CnStepper, { props: { steps, currentIndex: 0 } }).classes()).not.toContain('cn-stepper--board')
	})
})

describe('the stepper is an ordered list (task 2)', () => {
	it.each([['board', true], ['nextcloud', false]])('in the %s look: ol, li, aria-current on the current step only, no tab roles', (_n, isBoard) => {
		const w = wizard({}, isBoard)
		const list = w.find('ol')
		expect(list.attributes('aria-label')).toBe('Steps')
		expect(list.attributes('role')).toBeUndefined()
		expect(w.findAll('[role="tab"], [role="tablist"]')).toHaveLength(0)
		const items = w.findAll('ol > li')
		expect(items).toHaveLength(5)
		expect(items.map((i) => i.attributes('aria-current'))).toEqual(['step', undefined, undefined, undefined, undefined])
	})

	it('a finished step is a button only with allowJumpBack, and the circle is hidden from assistive technology', async () => {
		const w = wizard({ allowJumpBack: true })
		await w.vm.jumpTo('c')
		const items = w.findAll('ol > li')
		expect(items[0].find('button').exists()).toBe(true)
		expect(items[1].find('button').exists()).toBe(true)
		expect(items[2].find('button').exists()).toBe(false)
		expect(items[3].find('button').exists()).toBe(false)
		expect(items[0].find('.cn-stepper__dot').attributes('aria-hidden')).toBe('true')
		expect(items[0].find('.cn-stepper__sr').text()).toBe(', completed')
		await items[0].find('button').trigger('click')
		expect(w.vm.currentIndex).toBe(0)
	})

	it('without allowJumpBack no step holds an interactive element', async () => {
		const w = wizard({ allowJumpBack: false })
		await w.vm.jumpTo('c')
		expect(w.findAll('ol button')).toHaveLength(0)
	})
})

describe('the wizard eyebrow (task 3)', () => {
	it('follows the step', async () => {
		const w = wizard({})
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').text()).toBe('New newsletter, step 1 of 5')
		await w.vm.jumpTo('e')
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').text()).toBe('New newsletter, step 5 of 5')
	})

	it('takes a context and a translated sentence', () => {
		const w = wizard({ eyebrowContext: 'Nieuwsbrief', stepEyebrow: '{context}, stap {step} van {total}' })
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').text()).toBe('Nieuwsbrief, stap 1 van 5')
	})

	it('draws no eyebrow in the Nextcloud look or in the result phase', async () => {
		expect(wizard({}, false).find('[data-testid="cn-dialog-eyebrow"]').exists()).toBe(false)
		const w = wizard({})
		w.vm.setResult({ success: true })
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').exists()).toBe(false)
	})
})

describe('the wizard footer (task 4)', () => {
	const footer = (w) => w.findAll('.stub.NcButton:not(.cn-dialog-header__close)').map((b) => b.attributes('data-testid'))

	it('is 720 wide', () => {
		expect(wizard({}).find('.stub.NcDialog').element.style.getPropertyValue('--cn-dialog-width')).toBe('720px')
	})

	it('shows Cancel and a primary Next with a chevron on the first step', () => {
		const w = wizard({})
		expect(footer(w)).toEqual(['cn-wizard-cancel', 'cn-wizard-next'])
		expect(w.find('[data-testid="cn-wizard-next"]').attributes('alignment')).toBe('center-reverse')
		expect(w.find('[data-testid="cn-wizard-next"] .chevron-right-icon').exists()).toBe(true)
	})

	it('adds Back with a chevron on a middle step', async () => {
		const w = wizard({})
		await w.vm.next()
		expect(footer(w)).toEqual(['cn-wizard-cancel', 'cn-wizard-back', 'cn-wizard-next'])
		expect(w.find('[data-testid="cn-wizard-back"] .chevron-left-icon').exists()).toBe(true)
	})

	it('finishes with the verb and its icon on the last step', async () => {
		const w = wizard({ submitLabel: 'Create blast' })
		await w.vm.jumpTo('e')
		expect(footer(w)).toEqual(['cn-wizard-cancel', 'cn-wizard-back', 'cn-wizard-next'])
		const primary = w.find('[data-testid="cn-wizard-next"]')
		expect(primary.text()).toContain('Create blast')
		expect(primary.attributes('alignment')).toBe('center')
		expect(primary.find('.check-icon').exists()).toBe(true)
	})

	it('takes a submitIcon', async () => {
		const Icon = { template: '<span class="my-icon" />' }
		const w = wizard({ submitIcon: Icon })
		await w.vm.jumpTo('e')
		expect(w.find('[data-testid="cn-wizard-next"] .my-icon').exists()).toBe(true)
	})

	it('has no chevrons in the Nextcloud look', async () => {
		const w = wizard({}, false)
		await w.vm.next()
		expect(w.find('.chevron-left-icon, .chevron-right-icon').exists()).toBe(false)
		expect(w.find('[data-testid="cn-wizard-next"]').attributes('alignment')).toBe('center')
	})
})

describe('a stepped form page (task 5)', () => {
	const pageSteps = [
		{ id: 's1', title: 'Contact', fields: ['name'] },
		{ id: 's2', title: 'Request', fields: ['what'] },
		{ id: 's3', title: 'Check', fields: ['ok'] },
	]
	const fields = [
		{ key: 'name', label: 'Name', type: 'string' },
		{ key: 'what', label: 'What', type: 'string' },
		{ key: 'ok', label: 'OK', type: 'string' },
	]
	const stubs = {
		CnPageHeader: true,
		NcButton: { template: '<button :type="type || \'button\'" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>', props: ['type', 'variant', 'alignment', 'disabled'] },
		NcLoadingIcon: true,
		NcTextField: { inheritAttrs: false, template: '<input v-bind="$attrs" />' },
	}
	function page(look, props = {}, attrs = {}) {
		return mount(CnFormPage, {
			props: { fields, steps: pageSteps, submitHandler: 'x', ...props },
			attrs,
			global: { stubs, provide: look ? board.provide : {}, mocks: { $route: { params: {} }, $router: { push: jest.fn() } } },
		})
	}

	it('draws the board stepper and a hairline footer in a card', () => {
		const w = page(true)
		expect(w.find('[data-testid="cn-stepper"]').classes()).toContain('cn-stepper--board')
		expect(w.find('nav.cn-form-page__steps-nav').exists()).toBe(false)
		expect(w.find('.cn-form-page__submit').classes()).toContain('cn-form-page__footer')
	})

	it('keeps the plain steps nav in the Nextcloud look', () => {
		const w = page(false)
		expect(w.find('nav.cn-form-page__steps-nav').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stepper"]').exists()).toBe(false)
		expect(w.find('.cn-form-page__submit').classes()).not.toContain('cn-form-page__footer')
	})

	it('puts Previous left and Next right on step two, with chevrons', async () => {
		const w = page(true)
		w.vm.next()
		await w.vm.$nextTick()
		const buttons = w.findAll('.cn-form-page__submit button')
		expect(buttons.map((b) => b.text())).toEqual(['Previous', 'Next'])
		expect(buttons[0].find('.chevron-left-icon').exists()).toBe(true)
		expect(buttons[1].find('.chevron-right-icon').exists()).toBe(true)
		expect(buttons[1].classes()).toContain('cn-form-page__primary')
	})

	it('offers Cancel on the first step only with a cancelRoute or a cancel listener', async () => {
		expect(page(true).find('[data-testid="cn-form-page-cancel"]').exists()).toBe(false)
		const onCancel = jest.fn()
		const w = page(true, {}, { onCancel })
		expect(w.find('[data-testid="cn-form-page-cancel"]').exists()).toBe(true)
		await w.find('[data-testid="cn-form-page-cancel"]').trigger('click')
		expect(onCancel).toHaveBeenCalled()
		const routed = page(true, { cancelRoute: '/forms' })
		await routed.find('[data-testid="cn-form-page-cancel"]').trigger('click')
		expect(routed.vm.$router.push).toHaveBeenCalledWith('/forms')
		routed.vm.next()
		await routed.vm.$nextTick()
		expect(routed.find('[data-testid="cn-form-page-cancel"]').exists()).toBe(false)
	})

	it('keeps Back as the label and draws no Cancel in the Nextcloud look', async () => {
		const w = page(false, { cancelRoute: '/forms' })
		w.vm.next()
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-form-page-back"]').text()).toBe('Back')
		expect(w.find('[data-testid="cn-form-page-cancel"]').exists()).toBe(false)
	})
})

describe('CnSetupWizard passes the board look through (task 3)', () => {
	it('draws the step eyebrow, the 720 width and the board stepper', async () => {
		jest.resetModules()
		const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
		const setupSteps = [
			{ id: 'welcome', type: 'info', title: 'Hi' },
			{ id: 'seed', type: 'run-action', action: 'seed' },
		]
		const w = mount(CnSetupWizard, { props: { appId: 'pipelinq', steps: setupSteps, dialogTitle: 'Set up Pipelinq' }, global: board })
		expect(w.find('[data-testid="cn-dialog-eyebrow"]').text()).toBe('Set up Pipelinq, step 1 of 2')
		expect(w.find('.stub.NcDialog').element.style.getPropertyValue('--cn-dialog-width')).toBe('720px')
		expect(w.find('[data-testid="cn-stepper"]').classes()).toContain('cn-stepper--board')
	})
})
