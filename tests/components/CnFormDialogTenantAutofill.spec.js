/**
 * Tests for CnFormDialog's multi-tenant `organisation` field auto-fill.
 *
 * Spec: openspec/changes/multi-tenancy-context — REQ-MT-4 (UI).
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import { provideTenantContext } from '../../src/composables/useTenantContext.js'

const schemaWithOrg = {
	title: 'Case',
	properties: {
		title: { type: 'string' },
		organisation: { type: 'string', format: 'uuid' },
	},
	required: ['title'],
}

const schemaWithoutOrg = {
	title: 'Note',
	properties: {
		title: { type: 'string' },
	},
}

function mountDialog({ uuid, org, props = {} } = {}) {
	const Wrapper = defineComponent({
		setup() {
			provideTenantContext(uuid, org)
			return () => h(CnFormDialog, {
				...props,
				open: true,
			})
		},
	})
	return mount(Wrapper, {
		stubs: {
			NcDialog: true,
			NcButton: true,
			NcNoteCard: true,
			NcLoadingIcon: true,
			NcTextField: true,
			NcSelect: true,
			NcDateTimePickerNative: true,
			NcCheckboxRadioSwitch: true,
			CnJsonViewer: true,
		},
	})
}

describe('CnFormDialog — tenant auto-fill', () => {
	it('stamps organisation field with active tenant UUID on create', () => {
		const wrapper = mountDialog({
			uuid: 'tenant-A',
			org: { uuid: 'tenant-A', name: 'A' },
			props: { schema: schemaWithOrg, item: null },
		})
		const dialog = wrapper.findComponent(CnFormDialog).vm
		expect(dialog.formData.organisation).toBe('tenant-A')
	})

	it('does not overwrite an explicit organisation on edit', () => {
		const wrapper = mountDialog({
			uuid: 'tenant-A',
			org: { uuid: 'tenant-A', name: 'A' },
			props: { schema: schemaWithOrg, item: { id: 'x', title: 't', organisation: 'tenant-B' } },
		})
		const dialog = wrapper.findComponent(CnFormDialog).vm
		expect(dialog.formData.organisation).toBe('tenant-B')
	})

	it('skips schemas without an organisation field', () => {
		const wrapper = mountDialog({
			uuid: 'tenant-A',
			org: { uuid: 'tenant-A', name: 'A' },
			props: { schema: schemaWithoutOrg, item: null },
		})
		const dialog = wrapper.findComponent(CnFormDialog).vm
		expect(dialog.formData.organisation).toBeUndefined()
	})

	it('no-ops when no tenant context is active', () => {
		const wrapper = mountDialog({
			uuid: null,
			org: null,
			props: { schema: schemaWithOrg, item: null },
		})
		const dialog = wrapper.findComponent(CnFormDialog).vm
		// `null` (initFormData default) or undefined are both acceptable —
		// the autofill must not touch the field.
		expect(dialog.formData.organisation == null).toBe(true)
	})
})
