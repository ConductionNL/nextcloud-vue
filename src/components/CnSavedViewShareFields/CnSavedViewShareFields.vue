<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="available" class="cn-saved-view-share" data-testid="cn-saved-view-share">
		<NcSelect
			class="cn-saved-view-share__search"
			:inputLabel="t('nextcloud-vue', 'Share with')"
			:placeholder="t('nextcloud-vue', 'Search a person or group')"
			:modelValue="null"
			:options="pickable"
			:loading="loading"
			:filterable="false"
			:disabled="disabled"
			label="label"
			data-testid="cn-saved-view-share-groups"
			@search="onSearch"
			@update:modelValue="onPick">
			<template #option="option">
				<span v-if="option" class="cn-saved-view-share__option">
					<NcAvatar
						:user="option.kind === 'user' ? String(option.id).slice(5) : undefined"
						:displayName="option.label"
						:isNoUser="option.kind !== 'user'"
						:size="32"
						:hideStatus="true"
						:disableMenu="true"
						:disableTooltip="true" />
					<span class="cn-saved-view-share__name">{{ option.label }}</span>
					<span class="cn-saved-view-share__pill">{{ kindLabel(option.kind) }}</span>
				</span>
			</template>
		</NcSelect>
		<p class="cn-saved-view-share__hint">
			{{ t('nextcloud-vue', 'People and groups from your Nextcloud, as when sharing a file.') }}
		</p>
		<template v-if="modelValue.length > 0">
			<h4 class="cn-saved-view-share__caption">
				{{ t('nextcloud-vue', 'Shared with') }}
			</h4>
			<ul class="cn-saved-view-share__modes">
				<li
					v-for="entry in modelValue"
					:key="keyOf(entry)"
					class="cn-saved-view-share__mode"
					:data-testid="`cn-saved-view-share-row-${keyOf(entry)}`">
					<NcAvatar
						:user="entry.user || undefined"
						:displayName="labelOf(keyOf(entry))"
						:isNoUser="!entry.user"
						:size="32"
						:hideStatus="true"
						:disableMenu="true"
						:disableTooltip="true" />
					<span class="cn-saved-view-share__who">
						<span class="cn-saved-view-share__name">{{ labelOf(keyOf(entry)) }}</span>
						<span class="cn-saved-view-share__kind">{{ kindLabel(entry.user ? 'user' : 'group') }}</span>
					</span>
					<NcSelect
						class="cn-saved-view-share__rights"
						:ariaLabelCombobox="t('nextcloud-vue', 'Rights of {name}', { name: labelOf(keyOf(entry)) })"
						:modelValue="modeOption(entry)"
						:options="modeOptions"
						:clearable="false"
						:searchable="false"
						:disabled="disabled"
						label="label"
						:data-testid="`cn-saved-view-share-mode-${keyOf(entry)}`"
						@update:modelValue="(option) => option && onMode(keyOf(entry), option.id)" />
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
import { NcAvatar, NcButton, NcSelect } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import { searchUserAndGroupSharees } from '../../utils/searchGroupSharees.js'

/**
 * CnSavedViewShareFields — the sharing section of a saved view: pick people
 * and groups from Nextcloud's sharee API, within the instance's own sharing
 * settings, and choose per entry whether it may only read the view or also
 * edit it. The search field adds one person or group at a time to the
 * "Shared with" list below it; each row carries an avatar, the kind, a rights
 * select and a remove button. Used by `CnSaveViewDialog` and the share dialog of `CnIndexPage`.
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

	components: { Close, NcAvatar, NcButton, NcSelect },

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
		/**
		 * The search results that are not shared with yet.
		 *
		 * @return {Array<{id: string, label: string, kind: string}>}
		 */
		pickable() {
			const taken = new Set(this.modelValue.map((e) => this.keyOf(e)))
			return this.options.filter((o) => !taken.has(o.id))
		},

		/** @return {Array<{id: string, label: string}>} The two rights an entry can get. */
		modeOptions() {
			return [
				{ id: 'read', label: t('nextcloud-vue', 'May use') },
				{ id: 'write', label: t('nextcloud-vue', 'May update') },
			]
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
			this.options = found.map((s) => ({ id: s.kind === 'user' ? `user:${s.id}` : s.id, label: s.label, kind: s.kind === 'user' ? 'user' : 'group' }))
			this.options.forEach((o) => {
				this.known = { ...this.known, [o.id]: o.label }
			})
			if (found.length > 0) {
				this.available = true
			}
		},

		/**
		 * The word for a kind of sharee.
		 *
		 * @param {string} kind `user` or `group`.
		 * @return {string}
		 */
		kindLabel(kind) {
			return kind === 'user' ? t('nextcloud-vue', 'Person') : t('nextcloud-vue', 'Group')
		},

		/**
		 * The rights option an entry holds.
		 *
		 * @param {{mode?: string}} entry The entry.
		 * @return {{id: string, label: string}}
		 */
		modeOption(entry) {
			return this.modeOptions[entry.mode === 'write' ? 1 : 0]
		},

		/**
		 * Add one picked person or group to the audience, in read mode.
		 *
		 * @param {{id: string, label: string}|null} option The picked search result.
		 * @spec openspec/changes/saved-view-share-rows/tasks.md#task-1
		 */
		onPick(option) {
			if (!option || !option.id || this.modelValue.some((e) => this.keyOf(e) === option.id)) {
				return
			}
			this.onGroups([...this.modelValue.map((e) => ({ id: this.keyOf(e) })), option])
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
.cn-saved-view-share {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-saved-view-share__search {
	width: 100%;
}

.cn-saved-view-share__option {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
	width: 100%;
}

.cn-saved-view-share__pill {
	margin-inline-start: auto;
	padding: 2px 8px;
	border-radius: 10px;
	background: var(--color-background-dark);
	font-size: 12px;
	font-weight: 600;
}

.cn-saved-view-share__modes {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-saved-view-share__mode {
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: 48px;
	padding: 4px 4px 4px 8px;
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-background-hover);
}

.cn-saved-view-share__who {
	display: flex;
	flex-direction: column;
	gap: 1px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-saved-view-share__name {
	font-size: 14px;
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-saved-view-share__kind,
.cn-saved-view-share__hint {
	margin: 0;
	font-size: var(--font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

.cn-saved-view-share__rights {
	flex: none;
	width: 160px;
	min-width: 160px;
	margin: 0;
}

.cn-saved-view-share__caption {
	margin: 10px 0 0;
	font-size: 14px;
	font-weight: 600;
}
</style>
