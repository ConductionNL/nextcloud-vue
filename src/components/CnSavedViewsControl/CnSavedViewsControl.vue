<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<!--
		The toolbar half of saved filters. Under the board look the filters are
		a row of chips that apply them; everywhere a "Save filter" button saves
		the current filters. Listing, editing, sharing and deleting live in the
		filters sidebar (CnSavedFiltersPanel).
	-->
	<div
		v-if="isBoardLook && chipRows.length > 0"
		class="cn-saved-views__chips"
		role="group"
		:aria-label="t('nextcloud-vue', 'Saved filters')"
		data-testid="cn-saved-views-chips">
		<button
			v-for="row in chipRows"
			:key="`chip-${row.view.id || row.view.slug}`"
			type="button"
			class="cn-saved-views__chip"
			:class="{ 'cn-saved-views__chip--selected': isSelected(row.view) }"
			:aria-pressed="isSelected(row.view)"
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
	<!-- The wrapper carries the board look's class, so the bar's row rules
	     and the ghost-button rules reach the button the way they did when it
	     was an NcActions trigger. -->
	<div v-bind="$attrs" :class="{ 'cn-saved-views__save': isBoardLook }">
		<NcButton
			:variant="isBoardLook ? 'tertiary' : 'secondary'"
			:aria-label="t('nextcloud-vue', 'Save filter')"
			data-testid="cn-saved-views-control"
			@click="onSaveRequest">
			<template #icon>
				<ContentSaveOutline :size="isBoardLook ? 14 : 20" />
			</template>
			{{ t('nextcloud-vue', 'Save filter') }}
		</NcButton>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { savedViewsList } from '../../mixins/savedViewsList.js'

/**
 * CnSavedViewsControl — the toolbar entry to saved filters: a "Save filter"
 * button and, under the board look, the saved filters as chips that apply
 * them. Everything else (the list, edit, share, delete, add to menu) lives in
 * the index sidebar's `CnSavedFiltersPanel`.
 *
 * Purely presentational: `CnIndexPage` owns fetching and every write.
 *
 * @event {object} apply — A chip was clicked; apply its view. Payload: the View API object.
 * @event {void} save-request — "Save filter" clicked; open the save dialog.
 */
export default {
	name: 'CnSavedViewsControl',

	components: { NcButton, ContentSaveOutline },

	mixins: [savedViewsList],

	inject: {
		/** The look CnAppRoot provides; `board` draws the views as chips. */
		cnLook: { default: 'nextcloud' },
	},

	// The chips and the button are two roots under the board look.
	inheritAttrs: false,

	emits: ['apply', 'save-request'],

	computed: {
		/** @return {boolean} Whether the saved filters draw as chips. */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/** @return {Array<object>} The top level of the tree, in tree order. */
		chipRows() {
			return this.rows.filter((row) => row.depth === 0)
		},
	},

	methods: {
		onApply(view) {
			/**
			 * @event apply A chip was clicked; apply its stored state.
			 * @type {object}
			 */
			this.$emit('apply', view)
		},

		onSaveRequest() {
			/** @event save-request "Save filter" clicked; open the save dialog. */
			this.$emit('save-request')
		},
	},
}
</script>
