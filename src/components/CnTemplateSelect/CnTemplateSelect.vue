<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="options.length > 0" class="cn-template-select">
		<NcSelect
			:modelValue="chosen"
			:options="options"
			:inputLabel="inputLabel"
			:placeholder="placeholder || t('nextcloud-vue', 'Pick a template')"
			:loading="loading"
			label="name"
			trackBy="id"
			:data-testid="$attrs['data-testid'] || 'cn-template-select'"
			@update:modelValue="choose" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcSelect } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'

/**
 * An OpenRegister record template as an option: `{ id, name, values }`.
 *
 * @param {object} row A row of `/api/record-templates`.
 * @return {object|null} The option, or null without an id and a name.
 */
export function recordTemplateOption(row) {
	if (!row || !row.uuid || !row.name) {
		return null
	}
	return {
		id: String(row.uuid),
		name: String(row.name),
		values: row.values && typeof row.values === 'object' && !Array.isArray(row.values) ? row.values : {},
	}
}

/**
 * CnTemplateSelect — a select of named templates that hands the chosen one
 * to the form that mounts it (`apply`).
 *
 * Two sources:
 * - `schema` (default): OpenRegister record templates of that schema the
 *   signed-in user may use, `GET /apps/openregister/api/record-templates?schema=`.
 *   OpenRegister compares the schema as text, so pass it exactly as the
 *   register configuration holds it.
 * - `url` + `params`: any endpoint answering a list (`results`, `items`, or
 *   a bare array), such as an app's content templates of one kind. An
 *   app-absolute `/apps/...` url gets the instance prefix.
 *
 * `mapOption(row)` turns one row into `{ id, name, ...anything }` (null skips
 * the row); the default reads a record template. `apply` emits the chosen
 * option, or null when cleared.
 *
 * IT HIDES ITSELF while there is nothing to offer: an empty list, and a list
 * that could not be read. A failed read also says so in a toast ("Could not
 * read the templates"), so "there are none" and "they could not be read" stay
 * two answers. A stale list from an earlier scope is never shown.
 *
 * ```vue
 * <CnTemplateSelect
 *   schema="searchPlan"
 *   :input-label="t('myapp', 'Start from a template')"
 *   @apply="fill" />
 * ```
 *
 * @spec openspec/changes/dq-abstract-forms/specs/template-select/spec.md
 */
export default {
	name: 'CnTemplateSelect',

	components: { NcSelect },

	// A host's `data-testid` names the select itself, which is what a test
	// clicks; the wrapper only hides the select while there is nothing on offer.
	inheritAttrs: false,

	props: {
		/** The schema whose OpenRegister record templates are offered. */
		schema: { type: String, default: '' },

		/** An endpoint to read templates from instead of the record templates. */
		url: { type: String, default: '' },

		/** Query parameters for `url`. */
		params: { type: Object, default: () => ({}) },

		/** Turns one row into `{ id, name, ... }`, or null to skip it. */
		mapOption: { type: Function, default: null },

		/** The select's accessible label. */
		inputLabel: { type: String, required: true },

		/** Placeholder; defaults to "Pick a template". */
		placeholder: { type: String, default: '' },
	},

	emits: ['apply'],

	data() {
		return {
			options: [],
			chosen: null,
			loading: false,
		}
	},

	computed: {
		/** @return {string} What the list depends on; a change re-reads it. */
		sourceKey() {
			return JSON.stringify([this.schema, this.url, this.params])
		},
	},

	watch: {
		sourceKey: {
			immediate: true,
			handler() {
				this.load()
			},
		},
	},

	methods: {
		t,

		/**
		 * Read the templates on offer.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.options = []
			this.chosen = null
			if (!this.url && !this.schema) {
				return
			}
			const params = this.url ? this.params : { schema: this.schema }
			this.loading = true
			try {
				const { data } = await axios.get(this.url ? prefixUrl(this.url) : generateUrl('/apps/openregister/api/record-templates'), { params })
				const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
				const map = this.mapOption || recordTemplateOption
				this.options = rows.map((row) => map(row)).filter((option) => option && option.id !== undefined && option.id !== null && option.id !== '')
			} catch {
				this.options = []
				showError(t('nextcloud-vue', 'Could not read the templates'))
			} finally {
				this.loading = false
			}
		},

		/**
		 * Hand the chosen template to the form.
		 *
		 * @param {object|null} option The chosen option, null when cleared.
		 */
		choose(option) {
			this.chosen = option || null
			/** @event apply The chosen template option, or null when cleared. */
			this.$emit('apply', option || null)
		},
	},
}
</script>
