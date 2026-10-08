/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Shared mount helper for the CnFormPage live-value specs.
 */
import { mount } from '@vue/test-utils'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'

export const stubs = {
	CnPageHeader: true,
	NcButton: {
		template: '<button class="nc-button-stub" :type="type" :disabled="disabled" :title="title" @click="$emit(\'click\')"><slot /></button>',
		props: ['type', 'variant', 'disabled', 'title'],
		emits: ['click'],
	},
	NcLoadingIcon: true,
	NcNoteCard: { template: '<div class="nc-note-stub"><slot /></div>' },
	Send: true,
	NcTextField: {
		template: '<input class="nc-textfield-stub" :value="modelValue" :readonly="readonly" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['label', 'modelValue', 'readonly', 'error', 'helperText'],
	},
	NcSelect: { template: '<select class="nc-select-stub" />', props: ['inputLabel', 'options', 'modelValue', 'disabled'] },
}

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

export function mountForm(props = {}) {
	return mount(CnFormPage, {
		props: { submitHandler: 'noop', customComponents: { noop: () => {} }, ...props },
		global: { stubs, mocks: { $route: { params: {} } } },
	})
}
