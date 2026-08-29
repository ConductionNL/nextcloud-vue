/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * A record that arrives AFTER the form has opened must not discard what the
 * user has already typed.
 *
 * The failure this guards is silent and it reached production in two apps at
 * once. Since nextcloud-vue#03ab7c25 a record with a detail page is edited
 * THERE, and CnDetailPage binds the dialog's `item` to `currentObject` — a
 * read of the object store that is `null` until the page's own fetch lands.
 * So the edit dialog mounts over a record that has not arrived yet:
 * CnFormDialog reads a null `item` as CREATE mode and renders every field
 * empty. When the record shows up a moment later the `item` watcher re-seeds
 * `formData` wholesale, overwriting whatever was typed in between. The user
 * then presses Save and the PRISTINE record is PUT back — HTTP 200, no error
 * anywhere, and the edit is gone.
 *
 * Both symptoms were confirmed in the Playwright traces of the failing runs:
 *
 *   decidiq  crud-persistence.spec.ts   PUT body carried "…-meeting-editbug"
 *                                       where the user had typed "…-edited"
 *   dossiq   cases-crud.spec.ts         PUT body carried "… Editable case"
 *                                       where the user had typed "… Edited case"
 *
 * In both DOM snapshots the title input read EMPTY at dialog-open, held the
 * typed value, and was back to the record's original value by the time Save
 * was clicked.
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button @click="$attrs.onClick && $attrs.onClick()"><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Meeting',
	properties: {
		title: { type: 'string', title: 'Title' },
		meetingType: { type: 'string', title: 'Type' },
		location: { type: 'string', title: 'Location' },
	},
	required: ['title'],
}

const record = {
	id: 'ff065c3f',
	title: 'Board meeting',
	meetingType: 'regular',
	location: 'Council Chamber A',
}

describe('CnFormDialog — the record arrives after the form is open', () => {
	it('POSITIVE CONTROL: a record present at mount seeds every field', () => {
		// Without this, the assertions below would pass just as happily if
		// `item` were never read at all.
		const wrapper = mount(CnFormDialog, { propsData: { schema, item: record }, stubs })
		expect(wrapper.vm.formData.title).toBe('Board meeting')
		expect(wrapper.vm.formData.location).toBe('Council Chamber A')
	})

	it('keeps what the user typed when the record lands mid-edit', async () => {
		const wrapper = mount(CnFormDialog, { propsData: { schema, item: null }, stubs })
		// The window the user types into: the form is open and blank.
		expect(wrapper.vm.formData.title).toBeNull()

		wrapper.vm.updateField('title', 'Board meeting-edited')
		await wrapper.vm.$nextTick()

		// The page's fetch lands and `currentObject` flips from null to the record.
		await wrapper.setProps({ item: record })

		// The decisive assertion: the edit survives.
		expect(wrapper.vm.formData.title).toBe('Board meeting-edited')
	})

	it('takes the record\'s value for every field the user did NOT touch', async () => {
		// The other half of the contract. Preserving the typed field is not
		// enough on its own: the payload is a whole-object PUT, so a field
		// left at its blank create-mode default would WIPE that value on the
		// record. Untouched fields must come from the record that arrived.
		const wrapper = mount(CnFormDialog, { propsData: { schema, item: null }, stubs })
		wrapper.vm.updateField('title', 'Board meeting-edited')
		await wrapper.setProps({ item: record })

		expect(wrapper.vm.formData.meetingType).toBe('regular')
		expect(wrapper.vm.formData.location).toBe('Council Chamber A')
		expect(wrapper.vm.buildSubmitPayload().title).toBe('Board meeting-edited')
		expect(wrapper.vm.buildSubmitPayload().location).toBe('Council Chamber A')
	})

	it('does NOT carry one record\'s typed value onto a different record', async () => {
		// The guard has to be scoped to the record it was typed into. Swapping
		// the dialog to another record must start from that record, or the
		// form would leak an edit across two rows.
		const wrapper = mount(CnFormDialog, { propsData: { schema, item: record }, stubs })
		wrapper.vm.updateField('title', 'Board meeting-edited')
		await wrapper.vm.$nextTick()

		await wrapper.setProps({ item: { id: 'other-id', title: 'Committee meeting', meetingType: 'committee' } })

		expect(wrapper.vm.formData.title).toBe('Committee meeting')
	})
})
