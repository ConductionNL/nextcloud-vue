<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="available" class="cn-saved-view-share" data-testid="cn-saved-view-share">
		<NcSelect
			:inputLabel="t('nextcloud-vue', 'Share with groups')"
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
			<li v-for="entry in modelValue" :key="entry.group" class="cn-saved-view-share__mode">
				<span class="cn-saved-view-share__group">{{ labelOf(entry.group) }}</span>
				<NcCheckboxRadioSwitch
					:modelValue="entry.mode === 'write'"
					:disabled="disabled"
					:data-testid="`cn-saved-view-share-mode-${entry.group}`"
					@update:modelValue="(on) => onMode(entry.group, on ? 'write' : 'read')">
					{{ t('nextcloud-vue', 'May edit') }}
				</NcCheckboxRadioSwitch>
			</li>
		</ul>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import { searchGroupSharees } from '../../utils/searchGroupSharees.js'

/**
 * CnSavedViewShareFields — the sharing section of a saved view: pick groups
 * from Nextcloud's sharee API and choose, per group, whether members may only
 * read the view or also edit it. Used by `CnSaveViewDialog` and the share
 * dialog of `CnIndexPage`. Renders nothing when the sharee API answers no
 * groups (sharing off, or no group the user may share with).
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
		 * The chosen audience, `[{ group, mode }]` with `mode` `read` or `write`.
		 *
		 * @type {Array<{group: string, mode: 'read'|'write'}>}
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
			/** False until the first search came back with at least one group. */
			available: false,
		}
	},

	computed: {
		selectedOptions() {
			return this.modelValue.map((e) => ({ id: e.group, label: this.labelOf(e.group) }))
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

		labelOf(group) {
			return this.known[group] || group
		},

		async onSearch(query) {
			this.loading = true
			const found = await searchGroupSharees(query || '')
			this.loading = false
			this.options = found
			found.forEach((g) => {
				this.known = { ...this.known, [g.id]: g.label }
			})
			if (found.length > 0) {
				this.available = true
			}
		},

		onGroups(list) {
			const groups = Array.isArray(list) ? list : []
			const next = groups.map((g) => {
				const existing = this.modelValue.find((e) => e.group === g.id)
				return existing || { group: g.id, mode: 'read' }
			})
			/** @event update:modelValue The audience, `[{ group, mode }]`; `[]` when no group is picked. */
			this.$emit('update:modelValue', next)
		},

		onMode(group, mode) {
			this.$emit('update:modelValue', this.modelValue.map((e) => (e.group === group ? { ...e, mode } : e)))
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
