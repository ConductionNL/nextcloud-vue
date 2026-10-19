<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="available" class="cn-saved-view-share" data-testid="cn-saved-view-share">
		<NcSelect
			:inputLabel="t('nextcloud-vue', 'Share with people and groups')"
			:modelValue="selectedOptions"
			:options="options"
			:multiple="true"
			:loading="loading"
			:filterable="false"
			:disabled="disabled"
			label="label"
			data-testid="cn-saved-view-share-groups"
			@search="onSearch"
			@update:modelValue="onGroups" />
		<ul v-if="modelValue.length > 0" class="cn-saved-view-share__modes">
			<li v-for="entry in modelValue" :key="keyOf(entry)" class="cn-saved-view-share__mode">
				<span class="cn-saved-view-share__group">{{ labelOf(keyOf(entry)) }}</span>
				<NcCheckboxRadioSwitch
					:modelValue="entry.mode === 'write'"
					:disabled="disabled"
					:data-testid="`cn-saved-view-share-mode-${keyOf(entry)}`"
					@update:modelValue="(on) => onMode(keyOf(entry), on ? 'write' : 'read')">
					{{ t('nextcloud-vue', 'May edit') }}
				</NcCheckboxRadioSwitch>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import { searchUserAndGroupSharees } from '../../utils/searchGroupSharees.js'

/**
 * CnSavedViewShareFields — the sharing section of a saved view: pick people
 * and groups from Nextcloud's sharee API, within the instance's own sharing
 * settings, and choose per entry whether it may only read the view or also
 * edit it. Used by `CnSaveViewDialog` and the share dialog of `CnIndexPage`.
 * Renders nothing when the sharee API answers nobody (sharing off, or nobody
 * the user may share with). A group is keyed by its id, a user by `user:<uid>`.
 *
 * Example:
 * ```vue
 * <CnSavedViewShareFields v-model="sharedWith" />
 * ```
 */
export default {
	name: 'CnSavedViewShareFields',

	components: { NcCheckboxRadioSwitch, NcSelect },

	props: {
		/**
		 * The chosen audience, `[{ group, mode }]` and `[{ user, mode }]` with
		 * `mode` `read` or `write`.
		 *
		 * @type {Array<{group?: string, user?: string, mode: 'read'|'write'}>}
		 */
		modelValue: {
			type: Array,
			default: () => [],
		},

		/** Disable the fields. */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:modelValue'],

	data() {
		return {
			options: [],
			known: {},
			loading: false,
			/** False until the first search came back with at least one sharee. */
			available: false,
		}
	},

	computed: {
		selectedOptions() {
			return this.modelValue.map((e) => ({ id: this.keyOf(e), label: this.labelOf(this.keyOf(e)) }))
		},
	},

	async mounted() {
		await this.onSearch('')
		// Groups already on the view keep the section on, even if the search came back empty.
		if (this.modelValue.length > 0) {
			this.available = true
		}
	},

	methods: {
		t,

		/**
		 * The key an audience entry or option goes by: the group id, or `user:<uid>`.
		 *
		 * @param {{group?: string, user?: string}} entry The entry.
		 * @return {string}
		 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-5
		 */
		keyOf(entry) {
			return typeof entry.user === 'string' && entry.user !== '' ? `user:${entry.user}` : entry.group
		},

		labelOf(key) {
			return this.known[key] || (key.startsWith('user:') ? key.slice(5) : key)
		},

		async onSearch(query) {
			this.loading = true
			const found = await searchUserAndGroupSharees(query || '')
			this.loading = false
			this.options = found.map((s) => ({ id: s.kind === 'user' ? `user:${s.id}` : s.id, label: s.label }))
			this.options.forEach((o) => {
				this.known = { ...this.known, [o.id]: o.label }
			})
			if (found.length > 0) {
				this.available = true
			}
		},

		onGroups(list) {
			const groups = Array.isArray(list) ? list : []
			const next = groups.map((g) => {
				const existing = this.modelValue.find((e) => this.keyOf(e) === g.id)
				if (existing) {
					return existing
				}
				return g.id.startsWith('user:') ? { user: g.id.slice(5), mode: 'read' } : { group: g.id, mode: 'read' }
			})
			/** @event update:modelValue The audience, `[{ group, mode }]` and `[{ user, mode }]`; `[]` when nobody is picked. */
			this.$emit('update:modelValue', next)
		},

		onMode(key, mode) {
			this.$emit('update:modelValue', this.modelValue.map((e) => (this.keyOf(e) === key ? { ...e, mode } : e)))
		},
	},
}
</script>

<style scoped>
.cn-saved-view-share__modes {
	list-style: none;
	margin: 8px 0 0;
	padding: 0;
}

.cn-saved-view-share__mode {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}
</style>
