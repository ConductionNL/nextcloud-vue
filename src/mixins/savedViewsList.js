/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * savedViewsList — what the saved-views panel and the toolbar chips share:
 * the views as a tree with the defaults first, the sections, the labels,
 * counts and access. Presentational only; the page owns fetching and writes.
 *
 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-6
 */
import { translate as t } from '@nextcloud/l10n'
import { buildViewTree, labelsInUse, VIEW_GROUPS } from '../utils/buildViewTree.js'
import { viewAccess } from '../utils/savedViewHelpers.js'

export const savedViewsList = {
	props: {
		/** Views to list (View API objects from `GET /apps/openregister/api/views`, defaults included). */
		views: {
			type: Array,
			default: () => [],
		},

		/** True while the parent is fetching the view list. */
		loading: {
			type: Boolean,
			default: false,
		},

		/** The signed-in NC user id; a view without `@self.access` is the owner's when it matches. */
		currentUserId: {
			type: String,
			default: '',
		},

		/** How deep the tree indents before it flattens (`savedViewTree.maxDepth`). */
		maxDepth: {
			type: Number,
			default: 3,
		},

		/**
		 * How many records each view matches, keyed by view id (or slug). `null`
		 * shows no counts.
		 *
		 * @type {{[viewId: string]: number}|null}
		 */
		counts: {
			type: Object,
			default: null,
		},

		/** The id (or slug) of the applied view. */
		selectedViewId: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			/** The label currently filtering the list, or '' for all of them. */
			labelFilter: '',
		}
	},

	computed: {
		/** @return {string} The seeded group name, for templates. */
		SEEDED_GROUP() {
			return VIEW_GROUPS.SEEDED
		},

		/**
		 * The views in tree order, defaults first, filtered by the active label.
		 *
		 * @return {Array<object>} Rows of `{ view, depth, group, orphaned }`.
		 */
		rows() {
			return buildViewTree({ views: this.views, labelFilter: this.labelFilter, maxDepth: this.maxDepth })
		},

		/**
		 * The rows in their sections: one uncaptioned section when nothing is
		 * shared and nothing is a default, else Default views, My views and
		 * Shared with me.
		 *
		 * @return {Array<{key: string, label: string, rows: Array<object>}>} The sections.
		 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-1
		 */
		sections() {
			const shared = this.rows.filter((r) => r.group !== VIEW_GROUPS.SEEDED && this.accessOf(r) !== 'owner')
			const seeded = this.rows.filter((r) => r.group === VIEW_GROUPS.SEEDED)
			if (shared.length === 0 && seeded.length === 0) {
				return [{ key: 'all', label: '', rows: this.rows }]
			}
			const mine = this.rows.filter((r) => r.group !== VIEW_GROUPS.SEEDED && this.accessOf(r) === 'owner')
			return [
				{ key: 'seeded', label: t('nextcloud-vue', 'Default views'), rows: seeded },
				{ key: 'mine', label: t('nextcloud-vue', 'My views'), rows: mine },
				{ key: 'shared', label: t('nextcloud-vue', 'Shared with me'), rows: shared },
			].filter((section) => section.rows.length > 0)
		},

		/**
		 * The labels in use, read from the UNFILTERED list so choosing one keeps
		 * the others on offer.
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
		 * Whether a view is the applied one.
		 *
		 * @param {object} view The view.
		 * @return {boolean}
		 */
		isSelected(view) {
			return this.selectedViewId !== '' && (this.selectedViewId === String(view.id) || this.selectedViewId === String(view.slug))
		},

		/**
		 * What the current user may do with a row's view.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @return {'owner'|'write'|'read'} The access.
		 */
		accessOf(row) {
			return viewAccess(row.view, this.currentUserId)
		},

		/**
		 * The people and groups a view is shared with, as text.
		 *
		 * @param {object} view The View API object.
		 * @return {string} The user and group ids, comma-separated; empty when none.
		 */
		groupsOf(view) {
			return (Array.isArray(view.sharedWith) ? view.sharedWith : [])
				.map((e) => e && (e.user || e.group))
				.filter((g) => typeof g === 'string' && g !== '')
				.join(', ')
		},

		/**
		 * The name a row shows, indented to its depth with figure spaces so a
		 * screen reader gets the same shape.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @param {boolean} [withGroups] Append who the view is shared with.
		 * @return {string} The name.
		 */
		rowName(row, withGroups = false) {
			const groups = withGroups ? this.groupsOf(row.view) : ''
			return `${' '.repeat(row.depth * 2)}${this.nameWithCount(row.view)}${groups !== '' ? ` · ${groups}` : ''}`
		},

		/**
		 * The number of records a view matches, or null when none is known.
		 *
		 * @param {object} view The saved view.
		 * @return {number|null}
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
		 */
		nameWithCount(view) {
			const count = this.countOf(view)
			return count === null ? view.name : `${view.name} (${count})`
		},

		/**
		 * What a row is called to somebody who cannot see the indentation: the
		 * level in words, and a note when its parent is out of reach.
		 *
		 * @param {object} row The row from buildViewTree().
		 * @return {string} The accessible label.
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
		 * @return {string}
		 */
		labelFilterLabel(label) {
			return this.labelFilter === label
				? t('nextcloud-vue', 'Stop filtering on "{label}"', { label })
				: t('nextcloud-vue', 'Show only views labelled "{label}"', { label })
		},

		/**
		 * Turn a label filter on, or off when it is already on.
		 *
		 * @param {string} label The label.
		 */
		onLabelFilter(label) {
			this.labelFilter = this.labelFilter === label ? '' : label
		},
	},
}
