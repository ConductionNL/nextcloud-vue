<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<!--
		Board look: the saved views are a row of chips on the ground, each with
		its count, the selected one filled. The menu stays for managing views
		(apply, rename, share, delete) and is reached from the "Save view"
		button. Without the look the control is the menu alone, as before.
	-->
	<div
		v-if="isBoardLook && chipRows.length > 0"
		class="cn-saved-views__chips"
		role="group"
		:aria-label="t('nextcloud-vue', 'Saved views')"
		data-testid="cn-saved-views-chips">
		<button
			v-for="row in chipRows"
			:key="`chip-${row.view.id || row.view.slug}`"
			type="button"
			class="cn-saved-views__chip"
			:class="{ 'cn-saved-views__chip--selected': isChipSelected(row.view) }"
			:aria-pressed="isChipSelected(row.view)"
			data-testid="cn-saved-views-chip"
			:data-view-id="row.view.id || row.view.slug"
			@click="onApply(row.view)">
			<span class="cn-saved-views__chip-name">{{ row.view.name }}</span>
			<span
				v-if="countOf(row.view) !== null"
				class="cn-saved-views__chip-count"
				data-testid="cn-saved-views-chip-count">{{ countOf(row.view) }}</span>
		</button>
	</div>
	<NcActions
		v-bind="$attrs"
		:class="{ 'cn-saved-views__save': isBoardLook }"
		:forceMenu="true"
		:forceName="true"
		:menuName="isBoardLook ? t('nextcloud-vue', 'Save view') : menuLabel"
		data-testid="cn-saved-views-control"
		:aria-label="isBoardLook ? t('nextcloud-vue', 'Save view') : menuLabel">
		<template #icon>
			<ContentSaveOutline v-if="isBoardLook" :size="18" />
			<BookmarkOutline v-else :size="20" />
		</template>

		<NcActionCaption :name="t('nextcloud-vue', 'Saved views')" />

		<!-- Loading state -->
		<NcActionCaption
			v-if="loading"
			data-testid="cn-saved-views-loading"
			:name="t('nextcloud-vue', 'Loading…')" />

		<!-- Empty state -->
		<NcActionCaption
			v-else-if="views.length === 0"
			data-testid="cn-saved-views-empty"
			:name="t('nextcloud-vue', 'No saved views yet')" />

		<!-- The labels already in use, offered before anybody types a new one. -->
		<template v-if="!loading && offeredLabels.length > 0">
			<NcActionButton
				v-for="label in offeredLabels"
				:key="`label-${label}`"
				data-testid="cn-saved-views-label"
				:data-label="label"
				:modelValue="labelFilter === label"
				type="checkbox"
				:aria-label="labelFilterLabel(label)"
				@click="onLabelFilter(label)">
				<template #icon>
					<TagOutline :size="20" />
				</template>
				{{ label }}
			</NcActionButton>
			<NcActionSeparator />
		</template>

		<!--
			A label that matches nothing says so. Chained to the ROWS rather
			than to the label list: written as an else-if of the labels block
			it only ever rendered on a page with no labels at all, which is
			the one case it cannot be about.
		-->
		<NcActionCaption
			v-if="!loading && views.length > 0 && rows.length === 0"
			data-testid="cn-saved-views-none-for-label"
			:name="t('nextcloud-vue', 'No views with this label')" />

		<!-- One row per view, in tree order: the name applies it, a trailing
		     icon button deletes it. NcActions only recognises NcAction* vnodes
		     as menu items and silently drops anything else, so a row with more
		     than one control has to be an NcActionButtonGroup. -->
		<template v-if="!loading">
			<template v-for="section in sections" :key="section.key">
				<NcActionCaption
					v-if="section.label"
					:data-testid="`cn-saved-views-section-${section.key}`"
					:name="section.label" />
				<NcActionButtonGroup
					v-for="row in section.rows"
					:key="`view-${row.view.id || row.view.slug}`"
					class="cn-saved-view-row">
					<NcActionButton
						data-testid="cn-saved-views-item"
						:data-view-id="row.view.id || row.view.slug"
						:data-depth="row.depth"
						:data-group="row.group"
						:data-access="accessOf(row)"
						:aria-label="rowLabel(row)"
						@click="onApply(row.view)">
						<template #icon>
							<EyeOutline :size="20" />
						</template>
						{{ rowName(row, section.key === 'shared') }}
					</NcActionButton>
					<NcActionButton
						v-if="accessOf(row) === 'owner' && row.group !== SEEDED_GROUP"
						:key="`share-${row.view.id || row.view.slug}`"
						data-testid="cn-saved-views-share"
						:data-view-id="row.view.id || row.view.slug"
						:aria-label="shareLabel(row.view)"
						@click="onShareRequest(row.view)">
						<template #icon>
							<ShareVariantOutline :size="20" />
						</template>
					</NcActionButton>
					<NcActionButton
						v-if="(accessOf(row) === 'owner' || accessOf(row) === 'write') && row.group !== SEEDED_GROUP"
						:key="`presentation-${row.view.id || row.view.slug}`"
						data-testid="cn-saved-views-presentation"
						:data-view-id="row.view.id || row.view.slug"
						:aria-label="presentationLabel(row.view)"
						@click="onPresentationRequest(row.view)">
						<template #icon>
							<ViewDashboardOutline :size="20" />
						</template>
					</NcActionButton>
					<NcActionButton
						v-if="accessOf(row) === 'write'"
						:key="`update-${row.view.id || row.view.slug}`"
						data-testid="cn-saved-views-update"
						:data-view-id="row.view.id || row.view.slug"
						:aria-label="updateLabel(row.view)"
						@click="onUpdateRequest(row.view)">
						<template #icon>
							<ContentSaveOutline :size="20" />
						</template>
					</NcActionButton>
					<NcActionButton
						v-if="accessOf(row) === 'read' && row.group !== SEEDED_GROUP"
						:key="`copy-${row.view.id || row.view.slug}`"
						data-testid="cn-saved-views-copy"
						:data-view-id="row.view.id || row.view.slug"
						:aria-label="copyLabel(row.view)"
						@click="onCopyRequest(row.view)">
						<template #icon>
							<ContentCopy :size="20" />
						</template>
					</NcActionButton>
					<NcActionButton
						v-if="accessOf(row) === 'owner' && row.group !== SEEDED_GROUP"
						:key="`delete-${row.view.id || row.view.slug}`"
						data-testid="cn-saved-views-delete"
						:data-view-id="row.view.id || row.view.slug"
						:aria-label="deleteLabel(row.view)"
						@click="onDeleteRequest(row.view)">
						<template #icon>
							<TrashCanOutline :size="20" />
						</template>
					</NcActionButton>
				</NcActionButtonGroup>
			</template>
		</template>

		<NcActionSeparator />

		<NcActionButton
			data-testid="cn-saved-views-save"
			:aria-label="t('nextcloud-vue', 'Save current view…')"
			@click="onSaveRequest">
			<template #icon>
				<ContentSaveOutline :size="20" />
			</template>
			{{ t('nextcloud-vue', 'Save current view…') }}
		</NcActionButton>
	</NcActions>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionButtonGroup, NcActionCaption, NcActions, NcActionSeparator } from '@nextcloud/vue'
import BookmarkOutline from 'vue-material-design-icons/BookmarkOutline.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import EyeOutline from 'vue-material-design-icons/EyeOutline.vue'
import ShareVariantOutline from 'vue-material-design-icons/ShareVariantOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import ViewDashboardOutline from 'vue-material-design-icons/ViewDashboardOutline.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { buildViewTree, labelsInUse, VIEW_GROUPS } from '../../utils/buildViewTree.js'
import { isOwnView, viewAccess } from '../../utils/savedViewHelpers.js'

/**
 * CnSavedViewsControl — toolbar dropdown listing OpenRegister saved-search
 * views for the current index page (saved-views-ui).
 *
 * Purely presentational: the parent (CnIndexPage) owns fetching via
 * `useSavedViewsApi()` and all mutations; this control only lists the
 * given `views` and emits intents:
 *
 * - `@apply(view)` — a view entry was clicked; parent writes the view's
 *   stored filters/search/sort into the route query.
 * - `@save-request()` — "Save current view…" clicked; parent opens
 *   CnSaveViewDialog.
 * - `@delete-request(view)` — a view's trailing delete icon clicked; parent
 *   opens a confirm dialog. Only rendered for views the current user owns
 *   (`@self.access: owner`, else `view.owner === currentUserId`) — OpenRegister
 *   refuses foreign deletes server-side anyway (owner-scoped 404).
 * - `@share-request(view)` — Share on an own view; parent opens the share dialog.
 * - `@update-request(view)` — Save on a view shared with write access; parent
 *   saves the current state to it (never sending `sharedWith` or `owner`).
 * - `@presentation-request(view)` — Presentation on a view the user may edit
 *   (`owner` or `write`); parent opens the presentation dialog (table, board, calendar).
 * - `@copy-request(view)` — "Save as my view" on a view shared read-only.
 *
 * Views shared with the user (`@self.access` `write` or `read`) list under
 * "Shared with me", next to "My views", once any exist; with none the list
 * renders as before.
 *
 * @event {object} apply — Apply the clicked view. Payload: the View API object.
 * @event {void} save-request — Open the save-current-view dialog.
 * @event {object} delete-request — Confirm-delete the clicked view. Payload: the View API object.
 * @event {object} share-request — Share the clicked own view. Payload: the View API object.
 * @event {object} update-request — Save the current state to the clicked writable shared view. Payload: the View API object.
 * @event {object} presentation-request — Change how the clicked view shows. Payload: the View API object.
 * @event {object} copy-request — Copy the clicked read-only shared view into a personal one. Payload: the View API object.
 */
export default {
	name: 'CnSavedViewsControl',

	components: {
		NcActions,
		NcActionButton,
		NcActionButtonGroup,
		NcActionCaption,
		NcActionSeparator,
		BookmarkOutline,
		ContentCopy,
		ContentSaveOutline,
		EyeOutline,
		ShareVariantOutline,
		TagOutline,
		TrashCanOutline,
		ViewDashboardOutline,
	},

	inject: {
		/** The look CnAppRoot provides; `board` draws the views as chips. */
		cnLook: { default: 'nextcloud' },
	},

	// The chips and the menu are two roots under the board look.
	inheritAttrs: false,

	props: {
		/** Views to list (View API objects from `GET /apps/openregister/api/views`). */
		views: {
			type: Array,
			default: () => [],
		},

		/** True while the parent is fetching the view list. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** The signed-in NC user id — gates the per-view delete affordance. */
		currentUserId: {
			type: String,
			default: '',
		},

		/**
		 * How deep the tree indents before it flattens. Mirrors
		 * `savedViewTree.maxDepth` in the manifest. Flattening is about
		 * indentation only: a view past the bound still renders.
		 */
		maxDepth: {
			type: Number,
			default: 3,
		},

		/**
		 * How many records each view matches, keyed by view id (or slug). A
		 * view with a number here shows it after its name; a view can also
		 * carry its own `count`. `null` (the default) shows no counts.
		 *
		 * @type {{[viewId: string]: number}|null}
		 */
		counts: {
			type: Object,
			default: null,
		},

		/**
		 * The id (or slug) of the applied view; its chip renders selected under
		 * the board look.
		 */
		selectedViewId: {
			type: String,
			default: '',
		},
	},

	emits: ['apply', 'copy-request', 'delete-request', 'presentation-request', 'save-request', 'share-request', 'update-request'],

	data() {
		return {
			/** The label currently filtering the list, or '' for all of them. */
			labelFilter: '',
		}
	},

	computed: {
		/**
		 * Whether the saved views draw as chips (the board look).
		 *
		 * @return {boolean}
		 */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * The views that get a chip: the top level of the tree, in tree order.
		 *
		 * @return {Array<object>}
		 */
		chipRows() {
			return this.rows.filter((row) => row.depth === 0)
		},

		/** @return {string} The dropdown trigger label. */
		menuLabel() {
			return t('nextcloud-vue', 'Views')
		},

		/** @return {string} The seeded group name, for the template. */
		SEEDED_GROUP() {
			return VIEW_GROUPS.SEEDED
		},

		/**
		 * The views in tree order, seeded first, filtered by the active label.
		 *
		 * @return {Array<object>} Rows of `{ view, depth, group, orphaned }`.
		 */
		rows() {
			return buildViewTree({
				views: this.views,
				labelFilter: this.labelFilter,
				maxDepth: this.maxDepth,
			})
		},

		/**
		 * The rows in their sections. With no view shared with this user there
		 * is one section without a caption, as the list always was. With
		 * shared views: seeded views (no caption), "My views", "Shared with me".
		 *
		 * @return {Array<{key: string, label: string, rows: Array<object>}>} The sections.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-1
		 */
		sections() {
			const shared = this.rows.filter((r) => r.group !== VIEW_GROUPS.SEEDED && this.accessOf(r) !== 'owner')
			if (shared.length === 0) {
				return [{ key: 'all', label: '', rows: this.rows }]
			}
			const seeded = this.rows.filter((r) => r.group === VIEW_GROUPS.SEEDED)
			const mine = this.rows.filter((r) => r.group !== VIEW_GROUPS.SEEDED && this.accessOf(r) === 'owner')
			return [
				{ key: 'seeded', label: '', rows: seeded },
				{ key: 'mine', label: t('nextcloud-vue', 'My views'), rows: mine },
				{ key: 'shared', label: t('nextcloud-vue', 'Shared with me'), rows: shared },
			].filter((section) => section.rows.length > 0)
		},

		/**
		 * The labels already in use.
		 *
		 * Read from the UNFILTERED list on purpose: reading it from `rows`
		 * would remove every other label from the menu the moment one was
		 * chosen, and a filter you cannot change without clearing it first is
		 * a filter people stop using.
		 *
		 * @return {Array<string>} The labels.
		 */
		offeredLabels() {
			return labelsInUse(this.views)
		},
	},

	methods: {
		t,

		/**
		 * Whether a view's chip is the selected one.
		 *
		 * @param {object} view The view.
		 * @return {boolean}
		 */
		isChipSelected(view) {
			return this.selectedViewId !== '' && (this.selectedViewId === String(view.id) || this.selectedViewId === String(view.slug))
		},

		/**
		 * The name a row shows, indented to its depth.
		 *
		 * Indented with figure spaces rather than CSS padding because the row
		 * is an `NcActionButton` whose label is read out as text: a screen
		 * reader gets the same shape a sighted reader does, and no stylesheet
		 * has to know about the tree.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @param {boolean} [withGroups] Append the groups the view is shared with.
		 * @return {string} The name.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		rowName(row, withGroups = false) {
			const groups = withGroups ? this.groupsOf(row.view) : ''
			return `${'\u2007'.repeat(row.depth * 2)}${this.nameWithCount(row.view)}${groups !== '' ? ` · ${groups}` : ''}`
		},

		/**
		 * What the current user may do with a row's view.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @return {'owner'|'write'|'read'} The access.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-1
		 */
		accessOf(row) {
			return viewAccess(row.view, this.currentUserId)
		},

		/**
		 * The groups a view is shared with, as text for the row.
		 *
		 * @param {object} view The View API object.
		 * @return {string} The group ids, comma-separated; empty when none.
		 */
		groupsOf(view) {
			return (Array.isArray(view.sharedWith) ? view.sharedWith : [])
				.map((e) => e && e.group)
				.filter((g) => typeof g === 'string' && g !== '')
				.join(', ')
		},

		shareLabel(view) {
			return t('nextcloud-vue', 'Share "{name}"', { name: view.name })
		},

		updateLabel(view) {
			return t('nextcloud-vue', 'Save the current view to "{name}"', { name: view.name })
		},

		copyLabel(view) {
			return t('nextcloud-vue', 'Save "{name}" as my view', { name: view.name })
		},

		presentationLabel(view) {
			return t('nextcloud-vue', 'Change how "{name}" shows', { name: view.name })
		},

		onPresentationRequest(view) {
			/**
			 * @event presentation-request Presentation on an editable view; open the presentation dialog.
			 * @type {object}
			 */
			this.$emit('presentation-request', view)
		},

		onShareRequest(view) {
			/**
			 * @event share-request Share on an own view; open the share dialog.
			 * @type {object}
			 */
			this.$emit('share-request', view)
		},

		onUpdateRequest(view) {
			/**
			 * @event update-request Save on a writable shared view; save the current state to it.
			 * @type {object}
			 */
			this.$emit('update-request', view)
		},

		onCopyRequest(view) {
			/**
			 * @event copy-request "Save as my view" on a read-only shared view; store a personal copy.
			 * @type {object}
			 */
			this.$emit('copy-request', view)
		},

		/**
		 * The number of records a view matches, or null when none is known:
		 * `counts[id]` (or `counts[slug]`) first, else the view's own `count`.
		 *
		 * @param {object} view The saved view.
		 * @return {number|null}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		countOf(view) {
			const counts = this.counts || {}
			let value = counts[view.id]
			if (value === undefined || value === null) {
				value = counts[view.slug]
			}
			if (value === undefined || value === null) {
				value = view.count
			}
			return (typeof value === 'number' && Number.isFinite(value)) ? value : null
		},

		/**
		 * A view's name, followed by its count when one is known.
		 *
		 * @param {object} view The saved view.
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		nameWithCount(view) {
			const count = this.countOf(view)
			return count === null ? view.name : `${view.name} (${count})`
		},

		/**
		 * What a row is called to somebody who cannot see the indentation.
		 *
		 * Says the level in words, and says when a view's parent is one this
		 * reader cannot see. A child that silently sits at the root looks
		 * exactly like a view that never had a parent.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @return {string} The accessible label.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-counts-on-filters-and-views
		 */
		rowLabel(row) {
			const viewName = this.nameWithCount(row.view)
			const name = row.depth === 0
				? viewName
				: t('nextcloud-vue', '{name}, level {level}', { name: viewName, level: row.depth + 1 })

			if (row.orphaned !== true) {
				return name
			}

			return t('nextcloud-vue', '{name}. Parts of this view come from one you cannot see.', { name })
		},

		/**
		 * The accessible label of a label filter entry.
		 *
		 * @param {string} label The label.
		 * @return {string} The label.
		 */
		labelFilterLabel(label) {
			return this.labelFilter === label
				? t('nextcloud-vue', 'Stop filtering on "{label}"', { label })
				: t('nextcloud-vue', 'Show only views labelled "{label}"', { label })
		},

		/**
		 * Turn a label filter on, or off when it is already on.
		 *
		 * Clicking the active label clears it, so the way out is the way in
		 * rather than a second control somebody has to find.
		 *
		 * @param {string} label The label.
		 */
		onLabelFilter(label) {
			this.labelFilter = this.labelFilter === label ? '' : label
		},

		/**
		 * Whether the delete entry renders for a view.
		 *
		 * @param {object} view The View API object.
		 * @return {boolean} True when the current user owns the view.
		 */
		isOwn(view) {
			return isOwnView(view, this.currentUserId)
		},

		/**
		 * Accessible label for a view's delete entry.
		 *
		 * @param {object} view The View API object.
		 * @return {string} The label.
		 */
		deleteLabel(view) {
			return t('nextcloud-vue', 'Delete "{name}"', { name: view.name })
		},

		/**
		 * View-entry click: hand the view to the parent to apply.
		 *
		 * @param {object} view The clicked View API object.
		 */
		onApply(view) {
			/**
			 * @event apply A view entry was clicked; apply its stored state.
			 * @type {object}
			 */
			this.$emit('apply', view)
		},

		/**
		 * "Save current view…" click: ask the parent to open the save dialog.
		 */
		onSaveRequest() {
			/**
			 * @event save-request "Save current view…" clicked; open the save dialog.
			 */
			this.$emit('save-request')
		},

		/**
		 * Delete-entry click: hand the view to the parent to confirm-delete.
		 *
		 * @param {object} view The View API object to delete.
		 */
		onDeleteRequest(view) {
			/**
			 * @event delete-request A view's delete entry was clicked; confirm and delete.
			 * @type {object}
			 */
			this.$emit('delete-request', view)
		},
	},
}
</script>

<style scoped>
/* NcActionButtonGroup gives every child `flex: 1 1` (equal width) by
   default; override so the name button grows and the delete icon stays
   compact. :deep() is required — these li's belong to NcActionButtonGroup's
   own scope, not this component's. */
.cn-saved-view-row :deep(.nc-button-group-content) {
	gap: 0;
}

/* Anchored on the FIRST child, not the last: a row carries one or two buttons
   depending on ownership, so "the last one" is the name button on a row that
   has only that. */
.cn-saved-view-row :deep(.nc-button-group-content > li) {
	flex: 0 0 auto;
}

.cn-saved-view-row :deep(.nc-button-group-content > li:first-child) {
	flex: 1 1 auto;
}

/* NcActionButtonGroup also centers .action-button content (fine for an
   icon-only toolbar button, wrong for a row with a name) — restore the
   normal left-aligned NcActionButton look for the name button. */
.cn-saved-view-row :deep(.nc-button-group-content > li:first-child .action-button) {
	justify-content: flex-start;
}
</style>
