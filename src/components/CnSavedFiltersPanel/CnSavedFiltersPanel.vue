<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section class="cn-saved-filters" data-testid="cn-saved-filters" :aria-label="t('nextcloud-vue', 'Saved filters')">
		<div class="cn-saved-filters__head">
			<NcButton
				variant="secondary"
				:wide="true"
				data-testid="cn-saved-views-save"
				@click="onSaveRequest">
				<template #icon>
					<ContentSaveOutline :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Save filter') }}
			</NcButton>
			<p class="cn-saved-filters__note">
				{{ t('nextcloud-vue', 'Keeps the current search term, filters and sort under a name.') }}
			</p>
		</div>

		<p v-if="loading" class="cn-saved-filters__note" data-testid="cn-saved-views-loading">
			{{ t('nextcloud-vue', 'Loading…') }}
		</p>
		<p v-else-if="views.length === 0" class="cn-saved-filters__note" data-testid="cn-saved-views-empty">
			{{ t('nextcloud-vue', 'No saved filters yet') }}
		</p>

		<template v-else>
			<div
				v-if="offeredLabels.length > 0"
				class="cn-saved-filters__labels"
				role="group"
				:aria-label="t('nextcloud-vue', 'Labels')">
				<button
					v-for="label in offeredLabels"
					:key="`label-${label}`"
					type="button"
					class="cn-saved-filters__label"
					data-testid="cn-saved-views-label"
					:data-label="label"
					:aria-pressed="labelFilter === label"
					:aria-label="labelFilterLabel(label)"
					@click="onLabelFilter(label)">
					{{ label }}
				</button>
			</div>

			<p
				v-if="rows.length === 0"
				class="cn-saved-filters__note"
				data-testid="cn-saved-views-none-for-label">
				{{ t('nextcloud-vue', 'No views with this label') }}
			</p>

			<template v-for="section in sections" :key="section.key">
				<h4
					v-if="section.label"
					class="cn-saved-filters__section"
					:data-testid="`cn-saved-views-section-${section.key}`">
					{{ section.label }}
				</h4>
				<p v-if="sectionHint(section.key)" class="cn-saved-filters__note">
					{{ sectionHint(section.key) }}
				</p>
				<ul class="cn-saved-filters__list">
					<li
						v-for="row in section.rows"
						:key="`view-${idOf(row.view)}`"
						class="cn-saved-filters__row"
						:class="{ 'cn-saved-filters__row--selected': isSelected(row.view) }">
						<button
							type="button"
							class="cn-saved-filters__name"
							data-testid="cn-saved-views-item"
							:data-view-id="idOf(row.view)"
							:data-depth="row.depth"
							:data-group="row.group"
							:data-access="accessOf(row)"
							:aria-pressed="isSelected(row.view)"
							:aria-label="rowLabel(row)"
							@click="emitFor('apply', row.view)">
							<span class="cn-saved-filters__name-text">{{ rowName(row) }}</span>
							<span v-if="subline(row, section.key)" class="cn-saved-filters__subline">{{ subline(row, section.key) }}</span>
						</button>
						<NcActions
							:aria-label="manageLabel(row.view)"
							:forceMenu="true"
							data-testid="cn-saved-views-manage"
							:data-view-id="idOf(row.view)">
							<NcActionButton
								v-if="can(row, 'edit')"
								data-testid="cn-saved-views-edit"
								:data-view-id="idOf(row.view)"
								:description="t('nextcloud-vue', 'Name, search term, filters and sort')"
								:closeAfterClick="true"
								@click="emitFor('edit-request', row.view)">
								<template #icon>
									<PencilOutline :size="20" />
								</template>
								{{ t('nextcloud-vue', 'Edit') }}
							</NcActionButton>
							<NcActionButton
								v-if="can(row, 'update')"
								data-testid="cn-saved-views-update"
								:data-view-id="idOf(row.view)"
								:closeAfterClick="true"
								@click="emitFor('update-request', row.view)">
								<template #icon>
									<ContentSaveOutline :size="20" />
								</template>
								{{ t('nextcloud-vue', 'Update with current filters') }}
							</NcActionButton>
							<NcActionButton
								v-if="can(row, 'share')"
								data-testid="cn-saved-views-share"
								:data-view-id="idOf(row.view)"
								:description="t('nextcloud-vue', 'With people and groups')"
								:closeAfterClick="true"
								@click="emitFor('share-request', row.view)">
								<template #icon>
									<ShareVariantOutline :size="20" />
								</template>
								{{ t('nextcloud-vue', 'Share') }}
							</NcActionButton>
							<NcActionButton
								v-if="can(row, 'copy')"
								data-testid="cn-saved-views-copy"
								:data-view-id="idOf(row.view)"
								:closeAfterClick="true"
								@click="emitFor('copy-request', row.view)">
								<template #icon>
									<ContentCopy :size="20" />
								</template>
								{{ t('nextcloud-vue', 'Save a copy') }}
							</NcActionButton>
							<NcActionButton
								v-if="canPin"
								data-testid="cn-saved-views-menu"
								:data-view-id="idOf(row.view)"
								:description="isInMenu(row.view) ? t('nextcloud-vue', 'Leaves the menu on the left; the filter stays') : t('nextcloud-vue', 'Appears under My filters in the menu on the left')"
								:closeAfterClick="true"
								@click="emitFor('menu-toggle', row.view)">
								<template #icon>
									<PinOffOutline v-if="isInMenu(row.view)" :size="20" />
									<PinOutline v-else :size="20" />
								</template>
								{{ isInMenu(row.view) ? t('nextcloud-vue', 'Remove from menu') : t('nextcloud-vue', 'Add to menu') }}
							</NcActionButton>
							<NcActionButton
								v-if="can(row, 'delete')"
								data-testid="cn-saved-views-delete"
								:data-view-id="idOf(row.view)"
								:description="t('nextcloud-vue', 'Also for whoever it is shared with')"
								:closeAfterClick="true"
								@click="emitFor('delete-request', row.view)">
								<template #icon>
									<TrashCanOutline :size="20" />
								</template>
								{{ t('nextcloud-vue', 'Delete') }}
							</NcActionButton>
						</NcActions>
					</li>
				</ul>
			</template>
		</template>
	</section>
</template>

<script>
import { NcActionButton, NcActions, NcButton } from '@nextcloud/vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import PencilOutline from 'vue-material-design-icons/PencilOutline.vue'
import PinOffOutline from 'vue-material-design-icons/PinOffOutline.vue'
import PinOutline from 'vue-material-design-icons/PinOutline.vue'
import ShareVariantOutline from 'vue-material-design-icons/ShareVariantOutline.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { savedViewsList } from '../../mixins/savedViewsList.js'
import { VIEW_GROUPS } from '../../utils/buildViewTree.js'

/**
 * CnSavedFiltersPanel — the saved filters of an index page, in the Filters tab
 * of its sidebar: Save filter, then My filters, Shared with me and the
 * read-only Default filters, and per filter one "Manage {name}" menu with
 * Edit, Update with current filters, Share, Save a copy, Add to menu or Remove
 * from menu, and Delete. Entries show by the caller's access: the owner gets
 * Edit, Update, Share and Delete; a filter shared with write access gets
 * Update and Save a copy; one shared to use, and a default, get Save a copy.
 * Add to menu is there for every filter when the app has a menu. The server
 * stays the authority.
 *
 * Presentational: `CnIndexPage` owns fetching and every write.
 *
 * @event {object} apply — Apply the filter. Payload: the View API object.
 * @event {void} save-request — Save the current filters as a new one.
 * @event {object} edit-request — Edit an own filter.
 * @event {object} share-request — Share an own filter.
 * @event {object} update-request — Save the current filters into it (owner, write).
 * @event {object} copy-request — Save a copy of a shared or default filter.
 * @event {object} menu-toggle — Add the filter to the app menu, or remove it.
 * @event {object} delete-request — Delete an own filter (after confirmation).
 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-6
 */
export default {
	name: 'CnSavedFiltersPanel',

	components: {
		NcActionButton,
		NcActions,
		NcButton,
		ContentCopy,
		ContentSaveOutline,
		PencilOutline,
		PinOffOutline,
		PinOutline,
		ShareVariantOutline,
		TrashCanOutline,
	},

	mixins: [savedViewsList],

	props: {
		/**
		 * The ids of the filters this user put in the app menu, or `null` when
		 * the page cannot pin (no app shell to hold the menu).
		 *
		 * @type {Array<string>|null}
		 */
		menuIds: {
			type: Array,
			default: null,
		},
	},

	emits: ['apply', 'copy-request', 'delete-request', 'edit-request', 'menu-toggle', 'save-request', 'share-request', 'update-request'],

	computed: {
		/** @return {boolean} Whether Add to menu is offered. */
		canPin() {
			return Array.isArray(this.menuIds)
		},
	},

	methods: {
		/**
		 * The stable id of a view: its id, else its slug.
		 *
		 * @param {object} view The view.
		 * @return {string}
		 */
		idOf(view) {
			return String(view.id || view.slug)
		},

		/**
		 * Whether a row offers an entry, by the caller's access. A default
		 * filter offers a copy only.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @param {'edit'|'share'|'update'|'copy'|'delete'} entry The entry.
		 * @return {boolean}
		 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-2
		 */
		can(row, entry) {
			if (row.group === VIEW_GROUPS.SEEDED) {
				return entry === 'copy'
			}
			const allowed = {
				owner: ['edit', 'update', 'share', 'delete'],
				write: ['update', 'copy'],
				read: ['copy'],
			}
			return (allowed[this.accessOf(row)] || []).includes(entry)
		},

		/**
		 * Whether a filter is in the app menu.
		 *
		 * @param {object} view The view.
		 * @return {boolean}
		 */
		isInMenu(view) {
			return this.canPin && this.menuIds.includes(this.idOf(view))
		},

		/**
		 * The line under a section caption.
		 *
		 * @param {string} key The section key.
		 * @return {string}
		 */
		sectionHint(key) {
			if (key === 'shared') {
				return this.t('nextcloud-vue', 'From colleagues. You can use them and save a copy.')
			}
			if (key === 'seeded') {
				return this.t('nextcloud-vue', 'Read only. Shipped with the app; a new version updates them.')
			}
			return ''
		},

		/**
		 * The second line of a row: the filter's description, else who shared it.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @param {string} sectionKey The section the row is in.
		 * @return {string}
		 */
		subline(row, sectionKey) {
			const description = typeof row.view.description === 'string' ? row.view.description.trim() : ''
			if (description !== '') {
				return description
			}
			if (sectionKey === 'shared' && row.view.owner) {
				return this.t('nextcloud-vue', 'By {owner}', { owner: row.view.ownerDisplayName || row.view.owner })
			}
			return ''
		},

		manageLabel(view) {
			return this.t('nextcloud-vue', 'Manage "{name}"', { name: view.name })
		},

		onSaveRequest() {
			/** @event save-request Save the current filters as a new one. */
			this.$emit('save-request')
		},

		/**
		 * Emit one of the per-filter intents with its view.
		 *
		 * @param {string} event The event name, one of `emits`.
		 * @param {object} view The view.
		 */
		emitFor(event, view) {
			this.$emit(event, view)
		},
	},
}
</script>

<style scoped>
.cn-saved-filters {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-saved-filters__head {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-saved-filters__section {
	margin: 8px 0 0;
	font-size: var(--font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

.cn-saved-filters__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-saved-filters__labels {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.cn-saved-filters__label {
	min-height: var(--default-clickable-area);
	padding: 0 12px;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-pill);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-saved-filters__label[aria-pressed='true'] {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-saved-filters__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-saved-filters__row {
	display: flex;
	align-items: center;
	gap: 4px;
	border-radius: var(--border-radius-element, var(--border-radius-large));
}

.cn-saved-filters__row--selected {
	background: var(--color-primary-element-light);
}

.cn-saved-filters__name {
	flex: 1 1 auto;
	min-width: 0;
	min-height: var(--default-clickable-area);
	padding: 0 8px;
	border: 0;
	background: transparent;
	color: var(--color-main-text);
	text-align: start;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-saved-filters__name {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
}

.cn-saved-filters__name-text,
.cn-saved-filters__subline {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-saved-filters__subline {
	font-size: var(--font-size-small, 13px);
	color: var(--color-text-maxcontrast);
}

.cn-saved-filters__name:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}
</style>
