<template>
	<div class="cn-actions-bar" data-testid="cn-actions-bar">
		<div class="cn-actions-bar__info">
			<span v-if="pagination && pagination.total > 0" class="cn-actions-bar__count">
				{{ countText }}
			</span>
		</div>
		<div class="cn-actions-bar__actions">
			<!-- View mode toggle (Cards / Table) -->
			<div v-if="showViewToggle" class="cn-actions-bar__view-toggle">
				<NcCheckboxRadioSwitch
					:model-value="viewMode"
					:button-variant="true"
					value="cards"
					name="cn_view_mode"
					type="radio"
					button-variant-grouped="horizontal"
					@update:checked="emitViewModeChange('cards')">
					{{ t('nextcloud-vue', 'Cards') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch
					:model-value="viewMode"
					:button-variant="true"
					value="table"
					name="cn_view_mode"
					type="radio"
					button-variant-grouped="horizontal"
					@update:checked="emitViewModeChange('table')">
					{{ t('nextcloud-vue', 'Table') }}
				</NcCheckboxRadioSwitch>
			</div>

			<!-- Add button (primary) -->
			<NcButton v-if="showAdd"
				variant="primary"
				:disabled="addDisabled"
				data-testid="cn-cta-primary"
				@click="emitAdd">
				<template #icon>
					<CnIcon v-if="addIcon" :name="addIcon" :size="20" />
					<Plus v-else :size="20" />
				</template>
				{{ addLabel }}
			</NcButton>

			<!-- @slot actions Inline buttons rendered next to the primary Add button. -->
			<slot name="actions" />

			<!-- Actions menu (Refresh, Import, Export, mass actions) -->
			<NcActions
				:force-name="true"
				:inline="inlineActionCount"
				menu-name="Actions"
				data-testid="cn-actions">
				<NcActionButton :disabled="refreshing || refreshDisabled" @click="emitRefresh">
					<template #icon>
						<NcLoadingIcon v-if="refreshing" :size="20" />
						<Refresh v-else :size="20" />
					</template>
					{{ refreshing ? t('nextcloud-vue', 'Refreshing…') : t('nextcloud-vue', 'Refresh') }}
				</NcActionButton>

				<!-- Manifest-declared page-level header actions (overflow).
				     Each entry is `{ id, label, icon, ... }` — handlers are
				     resolved on the page (CnIndexPage); the bar only emits. -->
				<NcActionButton
					v-for="action in headerActions"
					:key="'cn-header-action-' + action.id"
					:disabled="!!action.disabled"
					@click="emitHeaderAction(action)">
					<template v-if="action.icon" #icon>
						<CnIcon
							v-if="isMdiIconName(action.icon)"
							:name="action.icon"
							:size="20" />
						<span v-else :class="action.icon" class="cn-actions-bar__header-action-icon" />
					</template>
					{{ action.label }}
				</NcActionButton>

				<!-- @slot action-items Custom primary action items rendered inside the overflow dropdown, after Refresh + `headerActions[]`, before the mass-actions group. -->
				<slot name="action-items" />

				<!-- Built-in Documentation link (opt-in via documentationUrl).
				     Opens the host-provided docs URL in a new tab. Mirrors
				     the widget Actions menu's Documentation entry. -->
				<NcActionLink
					v-if="documentationUrl"
					:href="documentationUrl"
					target="_blank"
					rel="noopener noreferrer"
					data-testid="cn-actions-bar-documentation">
					<template #icon>
						<BookOpenVariant :size="20" />
					</template>
					{{ documentationLabel }}
				</NcActionLink>

				<!-- Built-in Request-a-feature entry (opt-in via showRequestFeature).
				     Emits @request-feature; the host (CnIndexPage) opens the
				     CnSuggestFeatureModal. Mirrors the widget Actions menu. -->
				<NcActionButton
					v-if="showRequestFeature"
					data-testid="cn-actions-bar-request-feature"
					@click="$emit('request-feature')">
					<template #icon>
						<LightbulbOutline :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Request a feature') }}
				</NcActionButton>

				<!-- Separator between primary and mass actions -->
				<NcActionSeparator v-if="hasMassActions" />

				<!-- Mass actions (overflow) -->
				<NcActionButton
					v-if="showMassImport"
					@click="emitShowImport">
					<template #icon>
						<Import :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Import') }}
				</NcActionButton>
				<NcActionButton
					v-if="showMassExport"
					@click="emitShowExport">
					<template #icon>
						<Export :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Export') }}
				</NcActionButton>
				<NcActionButton
					v-if="showMassCopy"
					:disabled="selectedIds.length < 1"
					:title="selectedIds.length < 1 ? t('nextcloud-vue', 'Select 1 or more items to copy') : ''"
					@click="emitShowCopy">
					<template #icon>
						<ContentCopy :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Copy selected') }}
				</NcActionButton>
				<NcActionButton
					v-if="showMassDelete"
					:disabled="selectedIds.length < 1"
					:title="selectedIds.length < 1 ? t('nextcloud-vue', 'Select 1 or more items to delete') : ''"
					@click="emitShowDelete">
					<template #icon>
						<TrashCanOutline :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Delete selected') }}
				</NcActionButton>

				<!-- @slot mass-actions Custom mass-action buttons rendered alongside the built-in mass actions. Slot scope: `{ count, selectedIds }`. -->
				<slot name="mass-actions" :count="selectedIds.length" :selected-ids="selectedIds" />
			</NcActions>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton, NcActionLink, NcActionSeparator, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'
import Plus from 'vue-material-design-icons/Plus.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import LightbulbOutline from 'vue-material-design-icons/LightbulbOutline.vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnActionsBar — Reusable actions toolbar with count, mass actions, and primary actions.
 *
 * ```vue
 * <CnActionsBar
 *   :pagination="pagination"
 *   :object-count="items.length"
 *   add-label="Add Client"
 *   add-icon="AccountGroup"
 *   @add="createNew"
 *   @refresh="reload" />
 * ```
 *
 * @event add Primary Add button clicked.
 * @event refresh Refresh action clicked from the overflow dropdown.
 * @event request-feature Built-in "Request a feature" overflow item clicked (only when `showRequestFeature`). No payload.
 * @event view-mode-change View toggle changed. Payload: `'table'` or `'cards'`.
 * @event header-action A `headerActions[]` entry was clicked. Payload: `{ action, id }` where `id` is the action's id and `action` aliases it (matches the row-level `@action` convention).
 * @event show-import Built-in mass Import action clicked.
 * @event show-export Built-in mass Export action clicked.
 * @event show-copy Built-in mass Copy action clicked.
 * @event show-delete Built-in mass Delete action clicked.
 *
 * @slot actions — Inline buttons rendered next to the primary Add button.
 * @slot action-items — Custom primary action items rendered inside the overflow dropdown, after Refresh + `headerActions[]`, before the mass-actions group.
 * @slot mass-actions — Custom mass-action buttons rendered alongside the built-in mass actions. Scope: `{ count, selectedIds }`.
 */
export default {
	name: 'CnActionsBar',

	components: {
		NcActions,
		NcActionButton,
		NcActionLink,
		NcActionSeparator,
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		CnIcon,
		Plus,
		Refresh,
		LightbulbOutline,
		BookOpenVariant,
		ContentCopy,
		TrashCanOutline,
		Import,
		Export,
	},

	props: {
		/** Pagination state: { total, page, pages, limit } */
		pagination: {
			type: Object,
			default: null,
		},

		/** Number of currently visible objects (for "Showing X of Y") */
		objectCount: {
			type: Number,
			default: 0,
		},

		/** Whether rows/cards can be selected */
		selectable: {
			type: Boolean,
			default: true,
		},

		/** Currently selected IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},

		/** Label for the Add button */
		addLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Add'),
		},

		/** MDI icon name for the Add button (e.g. 'AccountGroup'). Falls back to Plus icon. */
		addIcon: {
			type: String,
			default: '',
		},

		/** How many action buttons to show inline (rest go in overflow dropdown) */
		inlineActionCount: {
			type: Number,
			default: 0,
		},

		/** Whether to show the built-in mass Import action */
		showMassImport: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Export action */
		showMassExport: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Copy action */
		showMassCopy: {
			type: Boolean,
			default: true,
		},

		/** Whether to show the built-in mass Delete action */
		showMassDelete: {
			type: Boolean,
			default: true,
		},

		/** Current view mode: 'table' or 'cards' */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards'].includes(v),
		},

		/** Whether to show the Cards/Table view toggle */
		showViewToggle: {
			type: Boolean,
			default: true,
		},

		/** Whether the refresh action is currently in progress */
		refreshing: {
			type: Boolean,
			default: false,
		},

		/** Whether the refresh action is disabled (e.g. when required selections are missing) */
		refreshDisabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Show a built-in "Request a feature" entry in the overflow
		 * dropdown (after Refresh + headerActions). Emits `@request-feature`
		 * on click; the host opens the CnSuggestFeatureModal. Off by
		 * default — CnIndexPage opts in so every list view gets it.
		 *
		 * @type {boolean}
		 */
		showRequestFeature: {
			type: Boolean,
			default: false,
		},
		/**
		 * Documentation link for this page. When a non-empty URL is set,
		 * the overflow dropdown renders a "Documentation" entry (before
		 * Request a feature) that opens the link in a new tab. Empty (the
		 * default) hides it. Mirrors the widget Actions menu.
		 *
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Pre-translated label for the Documentation entry. Defaults to the
		 * lib's translation of "Documentation".
		 */
		documentationLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Documentation'),
		},
		/** Whether the Add button is disabled (e.g. when required selections are missing) */
		addDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether to show the Add button */
		showAdd: {
			type: Boolean,
			default: true,
		},

		/**
		 * Manifest-declared page-level actions rendered inside the overflow
		 * dropdown, between the built-in Refresh action and the `#action-items`
		 * slot. Each entry is `{ id, label, icon?, disabled? }` — the actual
		 * handler dispatch happens upstream (in CnIndexPage), and CnActionsBar
		 * emits `@header-action({ action, id })` on click for the parent to
		 * resolve.
		 *
		 * The `icon` field accepts EITHER:
		 * - an MDI Vue icon component **name** (e.g. `'History'`) — rendered
		 *   via the local CnIcon (same path the Add button uses), OR
		 * - a Nextcloud core CSS icon class (e.g. `'icon-history'`) —
		 *   rendered as a `<span>` carrying that class.
		 *
		 * The MDI/CSS-class discrimination is heuristic: a leading
		 * `icon-` prefix is treated as a CSS class; anything else is
		 * treated as an MDI icon name. Consumers that need a non-conventional
		 * icon class can prefix it with `icon-` to opt in to the CSS path.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, disabled?: boolean }>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		countText() {
			if (!this.pagination) return ''
			return t('nextcloud-vue', 'Showing {count} of {total}', { count: this.objectCount, total: this.pagination.total })
		},

		hasMassActions() {
			return this.showMassImport || this.showMassExport || this.showMassCopy || this.showMassDelete
		},
	},

	methods: {
		t,

		/**
		 * Decide whether a `headerActions[].icon` string should be rendered
		 * via the CnIcon MDI component or as a CSS-class `<span>`. A
		 * leading `icon-` prefix means CSS class; anything else means
		 * MDI Vue component name.
		 *
		 * @param {string} icon The icon spec from a header action.
		 * @return {boolean} true when the icon is an MDI component name.
		 */
		isMdiIconName(icon) {
			if (typeof icon !== 'string' || icon.length === 0) return false
			return !icon.startsWith('icon-')
		},

		/**
		 * Emit `@header-action` with a payload that aliases the action's
		 * id under both `action` and `id` keys (matches the row-level
		 * `@action` convention used elsewhere). The CnIndexPage parent
		 * (or any other consumer) is responsible for resolving handlers.
		 *
		 * @param {{ id: string, label: string, icon?: string, disabled?: boolean }} action The clicked header action.
		 * @return {void}
		 */
		emitHeaderAction(action) {
			if (!action || !action.id) return
			/**
			 * @event header-action A `headerActions[]` entry was clicked. Payload: `{ action, id }` where `id` is the action's id and `action` aliases it (matches the row-level `@action` convention).
			 */
			this.$emit('header-action', { action: action.id, id: action.id })
		},

		/**
		 * Emit the view-mode toggle event.
		 *
		 * @param {'cards'|'table'} mode Newly selected view mode.
		 * @return {void}
		 */
		emitViewModeChange(mode) {
			/**
			 * @event view-mode-change View toggle changed. Payload: `'table'` or `'cards'`.
			 */
			this.$emit('view-mode-change', mode)
		},

		/**
		 * Emit the primary Add button click. No payload.
		 *
		 * @return {void}
		 */
		emitAdd() {
			/**
			 * @event add Primary Add button clicked. No payload.
			 */
			this.$emit('add')
		},

		/**
		 * Emit the Refresh action click. No payload.
		 *
		 * @return {void}
		 */
		emitRefresh() {
			/**
			 * @event refresh Refresh action clicked from the overflow dropdown. No payload.
			 */
			this.$emit('refresh')
		},

		/**
		 * Emit the built-in mass Import click. No payload.
		 *
		 * @return {void}
		 */
		emitShowImport() {
			/**
			 * @event show-import Built-in mass Import action clicked. No payload.
			 */
			this.$emit('show-import')
		},

		/**
		 * Emit the built-in mass Export click. No payload.
		 *
		 * @return {void}
		 */
		emitShowExport() {
			/**
			 * @event show-export Built-in mass Export action clicked. No payload.
			 */
			this.$emit('show-export')
		},

		/**
		 * Emit the built-in mass Copy click. No payload.
		 *
		 * @return {void}
		 */
		emitShowCopy() {
			/**
			 * @event show-copy Built-in mass Copy action clicked. No payload.
			 */
			this.$emit('show-copy')
		},

		/**
		 * Emit the built-in mass Delete click. No payload.
		 *
		 * @return {void}
		 */
		emitShowDelete() {
			/**
			 * @event show-delete Built-in mass Delete action clicked. No payload.
			 */
			this.$emit('show-delete')
		},
	},
}
</script>

<!-- Styles in css/actions-bar.css -->
