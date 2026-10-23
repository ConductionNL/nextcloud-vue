<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<!--
		The toolbar half of saved views. Under the board look the views are
		a row of chips that apply them; everywhere a "Save view" button saves
		the current filters. Listing, editing, sharing and deleting live in the
		sidebar's Filters tab (CnSavedViewsPanel).
	-->
	<div
		v-if="isBoardLook && chips && chipRows.length > 0"
		class="cn-saved-views__chips"
		role="group"
		:aria-label="t('nextcloud-vue', 'Saved views')"
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
	<div v-if="save" v-bind="$attrs" :class="{ 'cn-saved-views__save': isBoardLook }">
		<NcButton
			:variant="isBoardLook ? 'tertiary' : 'secondary'"
			:aria-label="t('nextcloud-vue', 'Save view')"
			data-testid="cn-saved-views-control"
			@click="onSaveRequest">
			<template #icon>
				<ContentSaveOutline :size="isBoardLook ? 14 : 20" />
			</template>
			{{ t('nextcloud-vue', 'Save view') }}
		</NcButton>
	</div>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { savedViewsList } from '../../mixins/savedViewsList.js'

/**
 * CnSavedViewsControl — the toolbar entry to saved views: a "Save view"
 * button and, under the board look, the saved views as chips that apply
 * them. Everything else (the list, edit, share, delete, add to menu) lives in
 * the index sidebar's `CnSavedViewsPanel`.
 *
 * Purely presentational: `CnIndexPage` owns fetching and every write.
 *
 * @event {object} apply — A chip was clicked; apply its view. Payload: the View API object.
 * @event {void} save-request — "Save view" clicked; open the save dialog.
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

	props: {
		/**
		 * Whether the toolbar draws its Save view button. `false` when the page
		 * header already saves the view (a `save-view` header button), so the
		 * page offers one way to save, as DqZoekresultaten draws it.
		 */
		save: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether the board look draws the saved views as chips. `false`
		 * leaves only Save view, for a page whose views live in the side
		 * panel (DqZaken).
		 */
		chips: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['apply', 'save-request'],

	computed: {
		/** @return {boolean} Whether the saved views draw as chips. */
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
			/** @event save-request "Save view" clicked; open the save dialog. */
			this.$emit('save-request')
		},
	},
}
</script>
