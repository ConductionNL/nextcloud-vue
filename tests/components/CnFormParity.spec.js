/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board form field (screens-form-parity): label above the control,
 * "(optional)" instead of an asterisk, hint under and error above, the error
 * summary, half-width fields and the public sentence. The Nextcloud look is
 * asserted unchanged next to each.
 *
 * @spec openspec/changes/screens-form-parity/tasks.md
 */
import { mount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import CnFormErrorSummary from '../../src/components/CnFormErrorSummary/CnFormErrorSummary.vue'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import CnRichSubmitDialog from '../../src/components/CnRichSubmitDialog/CnRichSubmitDialog.vue'

const board = { provide: { cnLook: 'board' } }

const pageStubs = {
	CnPageHeader: true,
	NcButton: { template: '<button :type="type || \'button\'" @click="$emit(\'click\')"><slot /></button>', props: ['type', 'variant', 'disabled'] },
	NcLoadingIcon: true,
	Send: true,
	NcTextField: {
		inheritAttrs: false,
		template: '<input class="nc-textfield-stub" v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['label', 'type', 'modelValue', 'error', 'helperText'],
	},
}

function mountPage(props, look = false) {
	return mount(CnFormPage, {
		props,
		global: {
			stubs: pageStubs,
			provide: look ? board.provide : {},
			mocks: { $route: { params: {} } },
		},
	})
}

const fields = [
	{ key: 'title', label: 'Title', type: 'string', validation: { required: true } },
	{ key: 'note', label: 'Note', type: 'string', help: 'Short help.' },
	{ key: 'email', label: 'Email', type: 'string', validation: { required: true, pattern: '^\\S+@\\S+$' } },
]

describe('CnFormPage in the board look (tasks 1, 2, 3)', () => {
	it('puts the label above the control and points it at the control', () => {
		const w = mountPage({ fields, submitHandler: 'x' }, true)
		const label = w.find('[data-field-key="title"] .cn-form-field__label')
		expect(label.exists()).toBe(true)
		const input = w.find('[data-field-key="title"] input')
		expect(label.attributes('for')).toBe(input.attributes('id'))
		expect(input.attributes('labeloutside')).toBeDefined()
	})

	it('marks optional fields and leaves required ones bare', () => {
		const w = mountPage({ fields, submitHandler: 'x' }, true)
		const text = (key) => w.find(`[data-field-key="${key}"] .cn-form-field__label`).text()
		expect(text('title')).toBe('Title')
		expect(text('note')).toBe('Note (optional)')
		expect(w.html()).not.toContain('*')
		expect(w.find('[data-field-key="title"] input').attributes('aria-required')).toBe('true')
		expect(w.find('[data-field-key="note"] input').attributes('aria-required')).toBeUndefined()
	})

	it('draws no head without the board look', () => {
		const w = mountPage({ fields, submitHandler: 'x' })
		expect(w.find('.cn-form-field__label').exists()).toBe(false)
		expect(w.find('.cn-form-page__optional-notice').exists()).toBe(false)
	})

	it('ties the hint to the control in both looks', () => {
		for (const look of [false, true]) {
			const w = mountPage({ fields, submitHandler: 'x' }, look)
			const input = w.find('[data-field-key="note"] input')
			const hint = w.find('[data-field-key="note"] .cn-form-page__field-help')
			expect(input.attributes('aria-describedby')).toBe(hint.attributes('id'))
		}
	})
})

describe('the error summary (task 4)', () => {
	async function fail(look) {
		const w = mountPage({ fields, submitHandler: 'x' }, look)
		await w.find('form').trigger('submit')
		await w.vm.$nextTick()
		return w
	}

	it('lists every error as a link in the board look and moves focus to it', async () => {
		const w = await fail(true)
		const summary = w.find('[data-testid="cn-form-error-summary"]')
		expect(summary.exists()).toBe(true)
		expect(summary.attributes('role')).toBe('alert')
		expect(summary.attributes('tabindex')).toBe('-1')
		expect(w.find('[data-testid="cn-form-error-summary-title"]').text()).toBe('There are 2 errors')
		expect(summary.findAll('a')).toHaveLength(2)
	})

	it('puts the error between the label and the control and flags the input', async () => {
		const w = await fail(true)
		const group = w.find('[data-field-key="title"]')
		const order = [...group.element.children].map((c) => c.className)
		expect(order[0]).toContain('cn-form-field__head')
		expect(group.find('.cn-form-field__head .cn-form-field__error').exists()).toBe(true)
		const input = group.find('input')
		expect(input.attributes('aria-invalid')).toBe('true')
		expect(input.attributes('aria-describedby')).toContain('cn-form-page__field-error-title')
		expect(group.classes()).toContain('cn-form-field--invalid')
	})

	it('goes away once the form validates', async () => {
		const w = await fail(true)
		await w.find('[data-field-key="title"] input').setValue('A title')
		await w.find('[data-field-key="email"] input').setValue('a@b.nl')
		expect(w.find('[data-testid="cn-form-error-summary"]').exists()).toBe(false)
	})

	it('keeps the single error line without the board look', async () => {
		const w = await fail(false)
		expect(w.find('[data-testid="cn-form-error-summary"]').exists()).toBe(false)
		expect(w.find('[data-field-key="title"] input').attributes('aria-invalid')).toBe('true')
	})

	it('says "There is 1 error" for one and focuses its control from the link', async () => {
		const w = mount(CnFormErrorSummary, { props: { errors: [{ key: 'a', message: 'Required', controlId: 'id-a' }] } })
		expect(w.find('h2').text()).toBe('There is 1 error')
		await w.find('a').trigger('click')
		expect(w.emitted('focus-field')).toEqual([['a']])
	})

	it('takes focus when asked', () => {
		const w = mount(CnFormErrorSummary, { props: { errors: [{ key: 'a', message: 'Required', controlId: 'id-a' }] }, attachTo: document.body })
		w.vm.focus()
		expect(document.activeElement).toBe(w.element)
		w.unmount()
	})
})

describe('half-width fields (task 5)', () => {
	it('marks a half field in the board look and ignores width otherwise', () => {
		const half = [{ key: 'a', label: 'A', type: 'string', width: 'half' }, { key: 'b', label: 'B', type: 'string', width: 'half' }, { key: 'c', label: 'C', type: 'string' }]
		const b = mountPage({ fields: half, submitHandler: 'x' }, true)
		expect(b.find('[data-field-key="a"]').classes()).toContain('cn-form-field--half')
		expect(b.find('[data-field-key="c"]').classes()).not.toContain('cn-form-field--half')
		const n = mountPage({ fields: half, submitHandler: 'x' })
		expect(n.find('[data-field-key="a"]').classes()).not.toContain('cn-form-field--half')
	})

	it('marks a half field in CnFormDialog the same way', () => {
		const schema = { properties: { a: { type: 'string', title: 'A' }, b: { type: 'string', title: 'B' } } }
		const w = mount(CnFormDialog, { props: { schema, item: null, fieldOverrides: { a: { width: 'half' } } }, global: { provide: board.provide } })
		expect(w.find('[data-cn-field="a"]').classes()).toContain('cn-form-field--half')
		expect(w.find('[data-cn-field="b"]').classes()).not.toContain('cn-form-field--half')
	})
})

describe('a public form says what optional means (task 6)', () => {
	it('shows the sentence once with a required field', () => {
		const w = mountPage({ fields, submitHandler: 'x', mode: 'public' }, true)
		const notices = w.findAll('[data-testid="cn-form-page-optional-notice"]')
		expect(notices).toHaveLength(1)
		expect(notices[0].text()).toBe('A field without (optional) must be filled in.')
	})

	it('is absent without a required field, when hidden, and outside the public mode', () => {
		const optionalOnly = [{ key: 'a', label: 'A', type: 'string' }]
		expect(mountPage({ fields: optionalOnly, submitHandler: 'x' }, true).find('.cn-form-page__optional-notice').exists()).toBe(false)
		expect(mountPage({ fields, submitHandler: 'x', showOptionalNotice: false }, true).find('.cn-form-page__optional-notice').exists()).toBe(false)
		expect(mountPage({ fields, submitHandler: 'x', mode: 'create' }, true).find('.cn-form-page__optional-notice').exists()).toBe(false)
	})

	it('is translatable', () => {
		const w = mountPage({ fields, submitHandler: 'x', optionalNoticeLabel: 'Een veld zonder (niet verplicht) moet u invullen.' }, true)
		expect(w.find('.cn-form-page__optional-notice').text()).toContain('niet verplicht')
	})
})

describe('CnFormDialog fields (tasks 1, 2, 3)', () => {
	const schema = {
		title: 'Decision',
		properties: {
			subject: { type: 'string', title: 'Subject', description: 'Plain words.' },
			date: { type: 'string', format: 'date', title: 'Decision date' },
		},
		required: ['subject'],
	}
	const open = (look, extra = {}) => mount(CnFormDialog, { props: { schema, item: null, ...extra }, global: look ? { provide: board.provide } : {} })

	it('board look: label above, "(optional)" on optional fields, no asterisk', () => {
		const w = open(true)
		const labels = w.findAll('.cn-form-field__label').map((l) => l.text())
		expect(labels.sort()).toEqual(['Decision date (optional)', 'Subject'])
		expect(w.text()).not.toContain('*')
	})

	it('board look: the control is named by the label and marked required', () => {
		const w = open(true)
		const label = w.find('[data-cn-field="subject"] .cn-form-field__label')
		expect(label.attributes('for')).toBe('cn-form-subject')
		const control = w.find('[data-cn-field="subject"] .stub.NcTextField')
		expect(control.attributes('id')).toBe('cn-form-subject')
		expect(control.attributes('aria-required')).toBe('true')
	})

	it('Nextcloud look: the required label keeps its asterisk and no board label is drawn', () => {
		const w = open(false)
		expect(w.find('.cn-form-field__label').exists()).toBe(false)
		expect(w.html()).toContain('Subject *')
	})

	it('the optional word is translatable', () => {
		const w = open(true, { optionalLabel: 'niet verplicht' })
		expect(w.find('[data-cn-field="date"] .cn-form-field__label').text()).toBe('Decision date (niet verplicht)')
	})

	it('ties an error to its input: error before hint, aria-invalid, in both looks', async () => {
		for (const look of [false, true]) {
			const w = open(look)
			w.vm.errors = { subject: 'Subject is required' }
			await w.vm.$nextTick()
			const input = w.find('[data-cn-field="subject"] .stub.NcTextField')
			expect(input.attributes('aria-invalid')).toBe('true')
			const ids = input.attributes('aria-describedby').split(' ')
			if (look) {
				expect(ids).toEqual(['cn-form-subject-error', 'cn-form-subject-help'])
				expect(w.find('#cn-form-subject-error').exists()).toBe(true)
				expect(w.find('#cn-form-subject-help').text()).toBe('Plain words.')
			} else {
				expect(ids).toEqual(['cn-form-subject-help'])
				expect(w.find('#cn-form-subject-help').text()).toContain('Subject is required')
			}
		}
	})
})

describe('CnRichSubmitDialog (task 2)', () => {
	it('drops the asterisk in the board look and marks the optional field', () => {
		const props = { reasons: [], showNotes: true, notesRequired: true, showFiles: true, filesRequired: false }
		const b = mount(CnRichSubmitDialog, { props, global: { provide: board.provide } })
		expect(b.html()).not.toContain('*')
		expect(b.html()).toContain('(optional)')
		const n = mount(CnRichSubmitDialog, { props })
		expect(n.find('.cn-rich-submit__required').exists()).toBe(true)
	})
})
