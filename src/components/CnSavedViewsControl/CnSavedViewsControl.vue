<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcActions
		:forceMenu="true"
		:forceName="true"
		:menuName="menuLabel"
		data-testid="cn-saved-views-control"
		:aria-label="menuLabel">
		<template #icon>
			<BookmarkOutline :size="20" />
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

		<!-- One entry per view, in tree order: apply on click; own views get a delete entry. -->
		<template v-if="!loading">
			<template v-for="row in rows" :key="`view-${row.view.id || row.view.slug}`">
				<NcActionButton
					data-testid="cn-saved-views-item"
					:data-view-id="row.view.id || row.view.slug"
					:data-depth="row.depth"
					:data-group="row.group"
					:aria-label="rowLabel(row)"
					@click="onApply(row.view)">
					<template #icon>
						<EyeOutline :size="20" />
					</template>
					{{ rowName(row) }}
				</NcActionButton>
				<NcActionButton
					v-if="allowPinning"
					:key="`pin-${row.view.id || row.view.slug}`"
					data-testid="cn-saved-views-pin"
					:data-view-id="row.view.id || row.view.slug"
					:aria-label="pinLabel(row.view)"
					@click="onPinRequest(row.view)">
					<template #icon>
						<Pin v-if="isPinned(row.view)" :size="20" />
						<PinOutline v-else :size="20" />
					</template>
					{{ pinLabel(row.view) }}
				</NcActionButton>
				<NcActionButton
					v-if="isOwn(row.view) && row.group !== SEEDED_GROUP"
					:key="`delete-${row.view.id || row.view.slug}`"
					data-testid="cn-saved-views-delete"
					:data-view-id="row.view.id || row.view.slug"
					:aria-label="deleteLabel(row.view)"
					@click="onDeleteRequest(row.view)">
					<template #icon>
						<TrashCanOutline :size="20" />
					</template>
					{{ deleteLabel(row.view) }}
				</NcActionButton>
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
import { NcActionButton, NcActionCaption, NcActions, NcActionSeparator } from '@nextcloud/vue'
import BookmarkOutline from 'vue-material-design-icons/BookmarkOutline.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import EyeOutline from 'vue-material-design-icons/EyeOutline.vue'
import Pin from 'vue-material-design-icons/Pin.vue'
import PinOutline from 'vue-material-design-icons/PinOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { buildViewTree, labelsInUse, VIEW_GROUPS } from '../../utils/buildViewTree.js'
import { isOwnView } from '../../utils/savedViewHelpers.js'
import { isPinnedView } from '../../utils/savedViewPlaces.js'

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
 * - `@delete-request(view)` — a view's delete entry clicked; parent opens
 *   a confirm dialog. Only rendered for views the current user owns
 *   (`view.owner === currentUserId`) — OpenRegister refuses foreign
 *   deletes server-side anyway (owner-scoped 404).
 *
 * @event {object} apply — Apply the clicked view. Payload: the View API object.
 * @event {void} save-request — Open the save-current-view dialog.
 * @event {object} delete-request — Confirm-delete the clicked view. Payload: the View API object.
 * @event {object} pin-request — Pin or unpin the clicked view. Payload: the View API object. Only rendered when `allowPinning`.
 */
export default {
	name: 'CnSavedViewsControl',

	components: {
		NcActions,
		NcActionButton,
		NcActionCaption,
		NcActionSeparator,
		BookmarkOutline,
		ContentSaveOutline,
		EyeOutline,
		Pin,
		PinOutline,
		TagOutline,
		TrashCanOutline,
	},

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
		 * Whether a view can be pinned into the navigation from here
		 * (saved-view-as-a-place). True only on a page whose views are
		 * places: pinning a view that has no address of its own would put an
		 * entry in the navigation with nowhere to go.
		 */
		allowPinning: {
			type: Boolean,
			default: false,
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
	},

	emits: ['apply', 'delete-request', 'pin-request', 'save-request'],

	data() {
		return {
			/** The label currently filtering the list, or '' for all of them. */
			labelFilter: '',
		}
	},

	computed: {
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
		 * The name a row shows, indented to its depth.
		 *
		 * Indented with figure spaces rather than CSS padding because the row
		 * is an `NcActionButton` whose label is read out as text: a screen
		 * reader gets the same shape a sighted reader does, and no stylesheet
		 * has to know about the tree.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @return {string} The name.
		 */
		rowName(row) {
			return `${'\u2007'.repeat(row.depth * 2)}${row.view.name}`
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
		 */
		rowLabel(row) {
			const name = row.depth === 0
				? row.view.name
				: t('nextcloud-vue', '{name}, level {level}', { name: row.view.name, level: row.depth + 1 })

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
		 * Whether the current user has pinned this view.
		 *
		 * @param {object} view The View API object.
		 * @return {boolean} True when it is in this user's navigation.
		 */
		isPinned(view) {
			return isPinnedView(view, this.currentUserId)
		},

		/**
		 * Label for a view's pin entry, which says what the click will do
		 * rather than what the state is: a menu entry is an action.
		 *
		 * @param {object} view The View API object.
		 * @return {string} The label.
		 */
		pinLabel(view) {
			return this.isPinned(view)
				? t('nextcloud-vue', 'Unpin "{name}" from the navigation', { name: view.name })
				: t('nextcloud-vue', 'Pin "{name}" to the navigation', { name: view.name })
		},

		/**
		 * Pin-entry click: hand the view to the parent to pin or unpin.
		 *
		 * @param {object} view The View API object.
		 */
		onPinRequest(view) {
			/**
			 * @event pin-request A view's pin entry was clicked; toggle the pin.
			 * @type {object}
			 */
			this.$emit('pin-request', view)
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
