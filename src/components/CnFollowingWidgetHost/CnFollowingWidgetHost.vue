<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnDetailWidgetHost
		v-if="row"
		v-bind="$attrs"
		:widget="followedWidget"
		:object="row"
		:objectId="rowId"
		:objectType="follows.schema || ''"
		:register="follows.register || register"
		:schema="follows.schema || schema" />
</template>

<script>
import CnDetailWidgetHost from '../CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { followedRow, WIDGET_SELECTION } from '../../utils/widgetSelection.js'

/**
 * CnFollowingWidgetHost: hosts a widget on the row another list on the page
 * has selected, instead of on the page's own record (widget `follows`).
 *
 * `follows: { widget, register, schema, when? }` names the list (by widget
 * id) and the register and schema its rows belong to. The card shows the
 * selected row when `when` holds for it, else, while nothing is selected, the
 * first row for which it holds, and draws nothing without such a row. Its
 * title's `{field}` placeholders are filled from the row. Every other prop
 * passes through to CnDetailWidgetHost.
 *
 * @spec openspec/changes/side-card-follows-row/specs/side-card-follows-row/spec.md#requirement-a-card-follows-the-selected-row
 */
export default {
	name: 'CnFollowingWidgetHost',

	components: { CnDetailWidgetHost },

	inject: {
		cnWidgetSelection: { from: WIDGET_SELECTION, default: null },
		/** The host's translate (CnAppRoot provides `cnTranslate`), applied to the title before it is filled. */
		cnTranslate: { default: () => (key) => key },
	},

	inheritAttrs: false,

	props: {
		/** The widget definition, with `follows`. */
		widget: {
			type: Object,
			required: true,
		},

		/** The page's register, used when `follows` names none. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** The page's schema, used when `follows` names none. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	computed: {
		/** @return {object} The widget's `follows` declaration. */
		follows() {
			return (this.widget && typeof this.widget.follows === 'object' && this.widget.follows) || {}
		},

		/** @return {object|null} The row the card is hosted on. */
		row() {
			if (!this.cnWidgetSelection || !this.follows.widget) {
				return null
			}
			return followedRow(this.cnWidgetSelection.entry(this.follows.widget), this.follows)
		},

		/** @return {string} The row's id. */
		rowId() {
			const row = this.row || {}
			return String(row.id ?? row['@self']?.id ?? '')
		},

		/** @return {object} The widget, its title filled from the row. */
		followedWidget() {
			const title = this.widget.title
			if (typeof title !== 'string' || !title.includes('{')) {
				return this.widget
			}
			const translated = this.cnTranslate(title)
			return { ...this.widget, title: fillTemplate(translated, this.row) || translated.replace(/\s*\{[^}]*\}/g, '') }
		},
	},
}
</script>
