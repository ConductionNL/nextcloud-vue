/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Draft recovery on CnFormDialog: what it offers, and what it refuses to do.
 *
 * 🔴 THE ASSERTION THAT CARRIES THIS CHANGE is that a stored draft is OFFERED
 * and not applied. A dialog that refilled the form on open would pass any test
 * that only checked "the typed values came back", and it is the worse product:
 * a form that fills itself is indistinguishable from one the server prefilled,
 * so somebody submits last week's answers without ever knowing they were there.
 *
 * 🔴 AND THAT "SAVE DRAFT" IS INERT WITHOUT A PLACE TO RECORD IT. Writing a
 * property the schema does not declare has OpenRegister drop it silently — a
 * 200, an object back, and the marker gone — so the record reads as published
 * while the user was told it was a draft. Offering the button on such a schema
 * is the defect; not offering it is the feature.
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'
import { draftKey, writeDraft } from '@/composables/useFormDraft.js'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: {
		// `v-bind="$attrs"` alone: it carries `onClick`, so adding an explicit
		// handler beside it fires the click twice and every emit is doubled.
		template: '<button v-bind="$attrs"><slot /></button>',
	},
	NcNoteCard: { template: '<div v-bind="$attrs"><slot /></div>' },
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

/** A schema with nowhere to record a draft. */
const plainSchema = {
	title: 'Item',
	slug: 'item',
	properties: {
		title: { type: 'string', title: 'Title' },
	},
	required: ['title'],
}

/** The same schema, declaring a draft marker. */
const draftableSchema = {
	...plainSchema,
	properties: {
		...plainSchema.properties,
		isDraft: { type: 'boolean', title: 'Draft' },
	},
}

/**
 * Mount the dialog.
 *
 * @param {object} [props] Props to merge over the defaults.
 * @return {object} The wrapper.
 */
function open(props = {}) {
	return mount(CnFormDialog, {
		props: {
			schema: plainSchema,
			draftAppId: 'dossiq',
			draftUserId: 'anne',
			...props,
		},
		global: { stubs },
	})
}

/** The key the dialog uses for the plain schema, as `anne`. */
const keyForAnne = draftKey({
	appId: 'dossiq',
	schema: 'item',
	objectId: 'new',
	userId: 'anne',
})

describe('the offered draft', () => {
	beforeEach(() => window.localStorage.clear())

	it('offers a stored draft rather than applying it', async () => {
		writeDraft(keyForAnne, { title: 'half getypt' })

		const wrapper = open()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(true)
		// 🔴 THE ONE THIS FILE EXISTS FOR. The value is held, not written in.
		expect(wrapper.vm.formData.title).not.toBe('half getypt')
	})

	it('puts the values in only when Restore is pressed', async () => {
		writeDraft(keyForAnne, { title: 'half getypt' })

		const wrapper = open()
		await flushPromises()
		await wrapper.find('[data-testid="cn-form-dialog-draft-restore"]').trigger('click')

		expect(wrapper.vm.formData.title).toBe('half getypt')
		// The offer is answered, so it stops being shown.
		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
	})

	it('forgets the draft when Discard is pressed', async () => {
		writeDraft(keyForAnne, { title: 'half getypt' })

		const wrapper = open()
		await flushPromises()
		await wrapper.find('[data-testid="cn-form-dialog-draft-discard"]').trigger('click')

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
		expect(window.localStorage.getItem(keyForAnne)).toBeNull()
	})

	it('offers nothing when there is nothing stored', async () => {
		// The control. Without it, "the bar is gone" above could mean the bar
		// never renders at all.
		const wrapper = open()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
	})

	it('offers nothing when the draft belongs to another user', async () => {
		writeDraft(keyForAnne, { title: 'van anne' })

		const wrapper = open({ draftUserId: 'bram' })
		await flushPromises()

		// A shared profile at a service desk is the ordinary case, and Bram
		// must not be handed what Anne typed.
		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
	})

	it('offers nothing when recovery is switched off', async () => {
		writeDraft(keyForAnne, { title: 'half getypt' })

		const wrapper = open({ recoverDraft: false })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-draft-offer"]').exists()).toBe(false)
	})
})

describe('Save draft', () => {
	beforeEach(() => window.localStorage.clear())

	it('is not offered on a schema with nowhere to record it', async () => {
		const wrapper = open({ allowDraft: true })
		await flushPromises()

		// 🔴 Both halves are needed. The host asked for the button; the schema
		// does not declare `isDraft`, so pressing it would write a property
		// OpenRegister drops in silence and the record would read as published.
		expect(wrapper.find('[data-testid="cn-form-dialog-save-draft"]').exists()).toBe(false)
	})

	it('is not offered when the host did not ask for it', async () => {
		const wrapper = open({ schema: draftableSchema })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-save-draft"]').exists()).toBe(false)
	})

	it('is offered when the host asks and the schema can record it', async () => {
		// The control for the two refusals above.
		const wrapper = open({ schema: draftableSchema, allowDraft: true })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-form-dialog-save-draft"]').exists()).toBe(true)
	})

	it('emits the payload with the marker set, without validating', async () => {
		const wrapper = open({ schema: draftableSchema, allowDraft: true })
		await flushPromises()

		// `title` is required and empty. A draft of a half-filled form is the
		// whole point, so this must go through anyway.
		await wrapper.find('[data-testid="cn-form-dialog-save-draft"]').trigger('click')

		const emitted = wrapper.emitted('draft-saved')
		expect(emitted).toHaveLength(1)
		expect(emitted[0][0].isDraft).toBe(true)
		// And it did NOT take the confirm path, which would have been blocked.
		expect(wrapper.emitted('confirm')).toBeUndefined()
	})

	it('honours a schema that names its marker something else', async () => {
		const wrapper = open({
			schema: {
				...plainSchema,
				properties: { ...plainSchema.properties, concept: { type: 'boolean' } },
			},
			allowDraft: true,
			draftField: 'concept',
		})
		await flushPromises()
		await wrapper.find('[data-testid="cn-form-dialog-save-draft"]').trigger('click')

		expect(wrapper.emitted('draft-saved')[0][0].concept).toBe(true)
	})
})

describe('the saved indicator', () => {
	beforeEach(() => window.localStorage.clear())

	it('announces politely and says nothing before anything is typed', async () => {
		const wrapper = open()
		await flushPromises()

		const indicator = wrapper.find('[data-testid="cn-form-dialog-draft-state"]')
		expect(indicator.exists()).toBe(true)
		// One region, announced politely: a keystroke is not an emergency.
		expect(indicator.attributes('aria-live')).toBe('polite')
		expect(indicator.text()).toBe('')
	})

	it('says it in words, so a colour is never the only signal', async () => {
		const wrapper = open()
		await flushPromises()

		wrapper.vm.draftState = 'saved'
		await wrapper.vm.$nextTick()

		// WCAG 2.2 SC 1.4.1: a reader who cannot see the colour still hears it.
		expect(wrapper.find('[data-testid="cn-form-dialog-draft-state"]').text()).not.toBe('')
	})
})

describe('a successful save', () => {
	beforeEach(() => window.localStorage.clear())

	it('clears the draft, and a failed one keeps it', async () => {
		writeDraft(keyForAnne, { title: 'half getypt' })
		const wrapper = open()
		await flushPromises()

		wrapper.vm.setResult({ success: false, error: 'server said no' })
		await flushPromises()

		// 🔴 A FAILED SAVE IS EXACTLY WHEN SOMEBODY NEEDS THEIR TYPING BACK.
		expect(window.localStorage.getItem(keyForAnne)).not.toBeNull()

		wrapper.vm.setResult({ success: true })
		await flushPromises()

		// And once it is on the server, the local copy protects nothing.
		expect(window.localStorage.getItem(keyForAnne)).toBeNull()
	})
})
