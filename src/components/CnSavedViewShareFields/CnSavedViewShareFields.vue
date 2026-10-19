<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="available" class="cn-saved-view-share" data-testid="cn-saved-view-share">
		<NcSelect
			:inputLabel="t('nextcloud-vue', 'Share with')"
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
		<p class="cn-saved-view-share__hint">
			{{ t('nextcloud-vue', 'People and groups from your Nextcloud, as when sharing a file.') }}
		</p>
		<template v-if="modelValue.length > 0">
			<h4 class="cn-saved-view-share__caption">
				{{ t('nextcloud-vue', 'Shared with') }}
			</h4>
			<ul class="cn-saved-view-share__modes">
				<li v-for="entry in modelValue" :key="keyOf(entry)" class="cn-saved-view-share__mode">
					<span class="cn-saved-view-share__who">
						<span class="cn-saved-view-share__group">{{ labelOf(keyOf(entry)) }}</span>
						<span class="cn-saved-view-share__kind">{{ entry.user ? t('nextcloud-vue', 'Person') : t('nextcloud-vue', 'Group') }}</span>
					</span>
					<span
						class="cn-saved-view-share__rights"
						role="radiogroup"
						:aria-label="t('nextcloud-vue', 'Rights of {name}', { name: labelOf(keyOf(entry)) })"
						:data-testid="`cn-saved-view-share-mode-${keyOf(entry)}`">
						<NcCheckboxRadioSwitch
							type="radio"
							:name="`cn-share-mode-${keyOf(entry)}`"
							value="read"
							:modelValue="entry.mode === 'write' ? 'write' : 'read'"
							:disabled="disabled"
							@update:modelValue="onMode(keyOf(entry), 'read')">
							{{ t('nextcloud-vue', 'May use') }}
						</NcCheckboxRadioSwitch>
						<NcCheckboxRadioSwitch
							type="radio"
							:name="`cn-share-mode-${keyOf(entry)}`"
							value="write"
							:modelValue="entry.mode === 'write' ? 'write' : 'read'"
							:disabled="disabled"
							@update:modelValue="onMode(keyOf(entry), 'write')">
							{{ t('nextcloud-vue', 'May update') }}
						</NcCheckboxRadioSwitch>
					</span>
					<NcButton
						variant="tertiary"
						:aria-label="t('nextcloud-vue', 'Stop sharing with {name}', { name: labelOf(keyOf(entry)) })"
						:disabled="disabled"
						:data-testid="`cn-saved-view-share-remove-${keyOf(entry)}`"
						@click="onRemove(keyOf(entry))">
						<template #icon>
							<Close :size="20" />
						</template>
					</NcButton>
				</li>
			</ul>
			<p class="cn-saved-view-share__hint">
				{{ t('nextcloud-vue', 'May use: sees the view under Shared with me. May update: can also replace the criteria. Deleting and sharing stay with you.') }}
			</p>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
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

	components: { Close, NcButton, NcCheckboxRadioSwitch, NcSelect },

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
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-5
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

		/**
		 * Stop sharing with one person or group.
		 *
		 * @param {string} key The entry's key.
		 */
		onRemove(key) {
			this.$emit('update:modelValue', this.modelValue.filter((e) => this.keyOf(e) !== key))
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
	flex-wrap: wrap;
	gap: 8px 12px;
}

.cn-saved-view-share__who {
	display: flex;
	flex-direction: column;
	flex: 1 1 160px;
	min-width: 0;
}

.cn-saved-view-share__kind,
.cn-saved-view-share__hint {
	margin: 0;
	font-size: var(--font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

.cn-saved-view-share__rights {
	display: flex;
	gap: 8px;
}

.cn-saved-view-share__caption {
	margin: 8px 0 0;
	font-size: var(--default-font-size);
	font-weight: bold;
}
</style>
