<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="dialogTitle"
		width="form"
		:noClose="busy"
		data-testid="cn-object-link-dialog"
		@closing="close">
		<div class="cn-object-link-dialog">
			<CnSearchSelect
				:modelValue="picked ? picked.id : null"
				:inputLabel="targetLabel"
				:labelOutside="false"
				:options="options"
				:loading="searching"
				:filterable="false"
				data-testid="cn-object-link-dialog-target"
				@search="onSearch"
				@update:modelValue="onPick" />
			<NcSelect
				v-model="type"
				:inputLabel="typeLabel"
				:options="typeOptions"
				:reduce="(option) => option.value"
				:clearable="false"
				label="label"
				data-testid="cn-object-link-dialog-type" />
			<template v-for="field in fields" :key="field.key">
				<NcTextArea
					v-if="field.type === 'textarea'"
					v-model="values[field.key]"
					:label="field.label"
					:rows="2"
					resize="vertical"
					:data-testid="`cn-object-link-dialog-field-${field.key}`" />
				<NcTextField
					v-else
					v-model="values[field.key]"
					:label="field.label"
					:type="field.type === 'date' ? 'date' : 'text'"
					:data-testid="`cn-object-link-dialog-field-${field.key}`" />
			</template>
			<p v-if="refusal"
				class="cn-object-link-dialog__error"
				role="alert"
				data-testid="cn-object-link-dialog-refusal">
				{{ refusal }}
			</p>
		</div>

		<template #actions>
			<NcButton :disabled="busy" data-testid="cn-object-link-dialog-cancel" @click="close">
				{{ tr('Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="busy || !picked || !type"
				data-testid="cn-object-link-dialog-save"
				@click="confirm">
				{{ tr('Save') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { NcButton, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { CnDialog } from '../CnDialog/index.js'
import { CnSearchSelect } from '../CnSearchSelect/index.js'
import { objectsUrl } from './objectLinks.js'

/**
 * CnObjectLinkDialog: the add dialog of the `object-links` widget: search the
 * records a link may point at (every target schema, this record left out),
 * pick the link type, fill the extra fields, and save through the widget's
 * `save`, which answers `{ ok, message? }`. A refusal stays in the dialog in
 * the server's words.
 *
 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-records-links-to-other-records-are-listed-added-and-removed
 */
export default {
	name: 'CnObjectLinkDialog',

	components: { CnDialog, CnSearchSelect, NcButton, NcSelect, NcTextArea, NcTextField },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The `object-links` widget content. */
		content: {
			type: Object,
			required: true,
		},

		/** The id of the record the link starts from; left out of the search. */
		objectId: {
			type: String,
			default: '',
		},

		/** Writes the link: `({ target, type, values }) => Promise<{ ok, message? }>`. */
		save: {
			type: Function,
			required: true,
		},
	},

	emits: ['close'],

	data() {
		return {
			options: [],
			picked: null,
			type: null,
			values: {},
			searching: false,
			busy: false,
			refusal: '',
			searchTimer: null,
		}
	},

	computed: {
		dialogTitle() {
			return this.tr(this.content.add?.dialogTitle || this.content.add?.ariaLabel || this.content.add?.label || 'Add')
		},

		targetLabel() {
			return this.tr(this.content.targetLabel || 'Linked record')
		},

		typeLabel() {
			return this.tr(this.content.typeLabel || 'Type')
		},

		targets() {
			return Array.isArray(this.content.targets) ? this.content.targets.filter((target) => target && target.register && target.schema) : []
		},

		/** The type choices, each with its group in brackets. */
		typeOptions() {
			return (Array.isArray(this.content.types) ? this.content.types : [])
				.filter((type) => type && type.value !== undefined)
				.map((type) => ({
					value: type.value,
					label: type.group ? `${this.tr(type.label || String(type.value))} (${this.tr(type.group)})` : this.tr(type.label || String(type.value)),
				}))
		},

		fields() {
			return (Array.isArray(this.content.fields) ? this.content.fields : [])
				.filter((field) => field && field.key)
				.map((field) => ({ ...field, label: this.tr(field.label || field.key) }))
		},
	},

	beforeUnmount() {
		clearTimeout(this.searchTimer)
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		onSearch(query) {
			clearTimeout(this.searchTimer)
			if (typeof query !== 'string' || query.trim().length < 2) {
				return
			}
			this.searchTimer = setTimeout(() => this.search(query.trim()), 300)
		},

		/**
		 * Search every target schema for the query.
		 *
		 * @param {string} query What was typed.
		 * @return {Promise<void>}
		 */
		async search(query) {
			this.searching = true
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const lists = await Promise.all(this.targets.map(async (target) => {
					try {
						const { data } = await axios.get(prefixUrl(objectsUrl(target.register, target.schema)), { params: { _search: query, _limit: 10 } })
						const results = Array.isArray(data?.results) ? data.results : []
						return results.map((item) => ({
							id: String(item.id ?? item.uuid),
							label: String(readPath(item, target.titleField || 'name') || item.id),
							secondary: this.tr(target.label || ''),
							type: target.type,
						}))
					} catch {
						return []
					}
				}))
				this.options = lists.flat().filter((option) => option.id !== this.objectId)
			} finally {
				this.searching = false
			}
		},

		onPick(id) {
			this.picked = this.options.find((option) => option.id === id) || null
		},

		async confirm() {
			if (!this.picked || !this.type) {
				return
			}
			this.busy = true
			this.refusal = ''
			try {
				const values = Object.fromEntries(Object.entries(this.values).filter(([, value]) => value !== '' && value !== null && value !== undefined))
				const result = await this.save({ target: { id: this.picked.id, type: this.picked.type }, type: this.type, values })
				if (result && result.ok) {
					this.$emit('close')
				} else {
					this.refusal = (result && result.message) || this.tr('This link could not be saved.')
				}
			} finally {
				this.busy = false
			}
		},

		close() {
			if (!this.busy) {
				this.$emit('close')
			}
		},
	},
}
</script>

<style scoped>
.cn-object-link-dialog {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-object-link-dialog__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
