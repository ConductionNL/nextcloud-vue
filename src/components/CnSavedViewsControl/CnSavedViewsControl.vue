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

		<!-- One row per view: the name applies it; an inline trailing icon
		     button deletes it (own views only). NcActions only recognises
		     NcAction* vnodes as menu items (anything else is silently
		     dropped), so a row with two interactive controls has to be an
		     NcActionButtonGroup — the fleet's supported way to put more than
		     one action in one row — not hand-rolled markup. -->
		<template v-else>
			<NcActionButtonGroup v-for="view in views" :key="`view-${view.id}`" class="cn-saved-view-row">
				<NcActionButton
					data-testid="cn-saved-views-item"
					:data-view-id="view.id"
					:aria-label="view.name"
					@click="onApply(view)">
					<template #icon>
						<EyeOutline :size="20" />
					</template>
					{{ view.name }}
				</NcActionButton>
				<NcActionButton
					v-if="isOwn(view)"
					data-testid="cn-saved-views-delete"
					:data-view-id="view.id"
					:aria-label="deleteLabel(view)"
					@click="onDeleteRequest(view)">
					<template #icon>
						<TrashCanOutline :size="20" />
					</template>
				</NcActionButton>
			</NcActionButtonGroup>
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
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import EyeOutline from 'vue-material-design-icons/EyeOutline.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { isOwnView } from '../../utils/savedViewHelpers.js'

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
 *   (`view.owner === currentUserId`) — OpenRegister refuses foreign
 *   deletes server-side anyway (owner-scoped 404).
 *
 * @event {object} apply — Apply the clicked view. Payload: the View API object.
 * @event {void} save-request — Open the save-current-view dialog.
 * @event {object} delete-request — Confirm-delete the clicked view. Payload: the View API object.
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
		ContentSaveOutline,
		EyeOutline,
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
	},

	emits: ['apply', 'delete-request', 'save-request'],

	computed: {
		/** @return {string} The dropdown trigger label. */
		menuLabel() {
			return t('nextcloud-vue', 'Views')
		},
	},

	methods: {
		t,

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

.cn-saved-view-row :deep(.nc-button-group-content > li) {
	flex: 1 1 auto;
}

.cn-saved-view-row :deep(.nc-button-group-content > li:last-child) {
	flex: 0 0 auto;
}

/* NcActionButtonGroup also centers .action-button content (fine for an
   icon-only toolbar button, wrong for a row with a name) — restore the
   normal left-aligned NcActionButton look for the name button. */
.cn-saved-view-row :deep(.nc-button-group-content > li:first-child .action-button) {
	justify-content: flex-start;
}
</style>
