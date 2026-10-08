<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-saved-view-form">
		<p v-if="loading" class="cn-saved-view-form__hint">
			{{ t('nextcloud-vue', 'Loading your saved views') }}
		</p>
		<CnWidgetEmptyState
			v-else-if="views.length === 0"
			class="cn-saved-view-form__empty"
			compact
			:name="t('nextcloud-vue', 'No saved views yet')"
			:description="t('nextcloud-vue', 'Save a view on a list page, then add it here.')" />
		<template v-else>
			<NcSelect
				:modelValue="selectedOption"
				:options="options"
				:inputLabel="t('nextcloud-vue', 'Saved view')"
				:clearable="false"
				@update:modelValue="onSelect" />
			<NcTextField
				:modelValue="String(limit)"
				type="number"
				:label="t('nextcloud-vue', 'Rows to show')"
				@update:modelValue="onLimit" />
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect, NcTextField } from '@nextcloud/vue'
import CnWidgetEmptyState from '../CnWidgetEmptyState/CnWidgetEmptyState.vue'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'

/**
 * CnSavedViewWidgetForm — the config sub-form for a `saved-view` widget.
 *
 * Lists the reader's own and public saved views (the list
 * `CnSavedViewsControl` shows) and stores only the chosen view id and a row
 * limit. Emits `update:content` on every change; `validate()` requires a view.
 */
export default {
	name: 'CnSavedViewWidgetForm',

	components: { NcSelect, NcTextField, CnWidgetEmptyState },

	props: {
		/**
		 * The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},

		/**
		 * Initial content values when not editing (registry defaults).
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Injected views API, for tests and hosts that stub the transport.
		 *
		 * @type {{fetchViews: Function}|null}
		 */
		api: {
			type: Object,
			default: null,
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			viewId: initial.viewId ?? '',
			limit: Number(initial.limit) > 0 ? Number(initial.limit) : 10,
			views: [],
			loading: true,
		}
	},

	computed: {
		/** @return {Array<{id: string, label: string}>} The select options. */
		options() {
			return this.views.map((v) => ({ id: String(v.id), label: v.name || String(v.id) }))
		},

		/** @return {object|null} The option matching the stored view id. */
		selectedOption() {
			return this.options.find((o) => o.id === String(this.viewId)) || null
		},
	},

	async created() {
		try {
			const api = this.api || useSavedViewsApi()
			this.views = await api.fetchViews()
		} catch {
			this.views = []
		}
		this.loading = false
	},

	methods: {
		t,

		/**
		 * Choose a view.
		 *
		 * @param {{id: string}|null} option The chosen option.
		 */
		onSelect(option) {
			this.viewId = option ? option.id : ''
			this.emitContent()
		},

		/**
		 * Change the row limit.
		 *
		 * @param {string} value The typed number.
		 */
		onLimit(value) {
			const n = parseInt(value, 10)
			this.limit = n > 0 ? n : 10
			this.emitContent()
		},

		/** Emit the assembled blob: a view id and a limit, nothing of the view. */
		emitContent() {
			this.$emit('update:content', { viewId: this.viewId, limit: this.limit })
		},

		/**
		 * Validate the form; an empty array means valid.
		 *
		 * @return {string[]} The validation errors.
		 */
		validate() {
			return this.viewId === '' ? [t('nextcloud-vue', 'Choose a saved view')] : []
		},
	},
}
</script>

<style scoped>
.cn-saved-view-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-saved-view-form__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
