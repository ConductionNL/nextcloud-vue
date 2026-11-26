<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<NcSelect
		v-if="offered"
		class="cn-period-field-select"
		:modelValue="value || null"
		:options="options"
		:inputLabel="t('nextcloud-vue', 'Date field for the period')"
		:placeholder="t('nextcloud-vue', 'None: the widget does not follow the period')"
		:clearable="true"
		:loading="loading"
		@update:modelValue="$emit('update', $event || '')" />
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'
import { fetchDateFields } from '../../utils/fetchDateFields.js'

/**
 * CnPeriodFieldSelect — the optional "Date field for the period" of a widget
 * with a register source. Shown only where the host dashboard offers a
 * period: the host provides `cnOffersPeriodField` (a boolean or a ref);
 * elsewhere it renders nothing. The options are the source's date fields
 * (sampled by `fetchDateFields`), with a stored choice kept even when the
 * sample no longer shows it. Emits the chosen field via `update` ('' for
 * none); the form stores it as the source's `periodField`.
 */
export default {
	name: 'CnPeriodFieldSelect',

	components: { NcSelect },

	inject: {
		/** Whether the host dashboard offers a period; a boolean or a ref. */
		cnOffersPeriodField: { default: false },
	},

	props: {
		/**
		 * The source's register slug.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * The source's schema slug.
		 *
		 * @type {string}
		 */
		schema: {
			type: String,
			default: '',
		},

		/**
		 * The chosen date field, '' for none.
		 *
		 * @type {string}
		 */
		value: {
			type: String,
			default: '',
		},
	},

	emits: [
		/**
		 * Emitted with the chosen date field, '' for none.
		 *
		 * @event update
		 * @type {string}
		 */
		'update',
	],

	data() {
		return { fields: [], loading: false }
	},

	computed: {
		/**
		 * Whether the host offers a period, so the select shows.
		 *
		 * @return {boolean}
		 */
		offered() {
			const offer = this.cnOffersPeriodField
			return (offer && typeof offer === 'object' && 'value' in offer ? offer.value : offer) === true
		},

		/**
		 * The date fields, with the chosen one kept when the sample no longer shows it.
		 *
		 * @return {string[]}
		 */
		options() {
			if (this.value && !this.fields.includes(this.value)) {
				return [this.value, ...this.fields]
			}
			return this.fields
		},
	},

	watch: {
		register: 'loadFields',
		schema: 'loadFields',
	},

	mounted() {
		this.loadFields()
	},

	methods: {
		t,

		/**
		 * Read the source's date fields, only where the select shows.
		 *
		 * @return {Promise<void>}
		 */
		async loadFields() {
			if (!this.offered) {
				return
			}
			this.loading = true
			try {
				this.fields = await fetchDateFields(this.register, this.schema)
			} finally {
				this.loading = false
			}
		},
	},
}
</script>
