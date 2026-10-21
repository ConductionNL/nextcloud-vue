<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		v-if="crumbs.length > 0 || meta"
		class="cn-header-trail cn-detail-page__header-row2"
		data-testid="cn-header-trail">
		<CnBreadcrumbs
			v-if="crumbs.length > 0"
			class="cn-detail-page__breadcrumbs cn-detail-page__breadcrumbs--row2"
			:crumbs="crumbs"
			:rootText="crumbs[0].icon === undefined"
			:separator="separator"
			data-testid="cn-header-trail-breadcrumbs" />
		<span
			v-if="crumbs.length > 0 && meta"
			class="cn-detail-page__header-dot"
			aria-hidden="true">&middot;</span>
		<span
			v-if="meta"
			class="cn-detail-page__header-meta"
			data-testid="cn-header-trail-meta">{{ meta }}</span>
	</div>
</template>

<script>
import { CnBreadcrumbs } from '../CnBreadcrumbs/index.js'

/**
 * The breadcrumb and meta line under a page title: "Instellingen / Zaaktypen
 * · 12 zaaktypen". It draws the same markup and classes as the board look's
 * detail header row, so a list, dashboard or settings page carries the
 * detail page's breadcrumb style rather than one of its own.
 *
 * `breadcrumb` is one crumb or a list, each `{ label, route?, params?, href?,
 * icon?, separator? }`. The page title follows as the current crumb.
 */
export default {
	name: 'CnHeaderTrail',

	components: { CnBreadcrumbs },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The crumbs before the current page, one object or a list.
		 *
		 * @type {object|Array<object>|null}
		 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
		 */
		breadcrumb: {
			type: [Object, Array],
			default: null,
		},

		/** The current crumb: the page title, already translated. */
		current: {
			type: String,
			default: '',
		},

		/**
		 * The note after the crumbs and a middle dot, already resolved.
		 *
		 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
		 */
		meta: {
			type: String,
			default: '',
		},

		/**
		 * Translate function for the crumb labels; falls back to the injected
		 * `cnTranslate`.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	computed: {
		/**
		 * The declared crumbs that carry a label.
		 *
		 * @return {Array<object>}
		 */
		declared() {
			const list = Array.isArray(this.breadcrumb) ? this.breadcrumb : (this.breadcrumb ? [this.breadcrumb] : [])
			return list.filter((crumb) => crumb && typeof crumb.label === 'string' && crumb.label !== '')
		},

		/**
		 * The crumbs for CnBreadcrumbs: each declared crumb as a link, then the
		 * current page. Empty without a declared crumb.
		 *
		 * @spec openspec/changes/page-header-breadcrumb/specs/page-header/spec.md#requirement-a-list-dashboard-or-settings-page-can-show-a-breadcrumb-and-a-meta-note
		 * @return {Array<object>}
		 */
		crumbs() {
			if (this.declared.length === 0) {
				return []
			}
			const out = this.declared.map((crumb) => {
				const entry = { label: (this.translate ?? this.cnTranslate)(crumb.label) }
				if (typeof crumb.icon === 'string' && crumb.icon !== '') {
					entry.icon = crumb.icon
				}
				if (crumb.route) {
					entry.to = { name: crumb.route, ...(crumb.params ? { params: crumb.params } : {}), ...(crumb.query ? { query: crumb.query } : {}) }
				} else if (crumb.href) {
					entry.href = crumb.href
				}
				return entry
			})
			if (this.current) {
				out.push({ label: this.current })
			}
			return out
		},

		/**
		 * The text between the crumbs: the first crumb's `separator`, else `/`.
		 *
		 * @return {string}
		 */
		separator() {
			const declared = this.declared[0] && this.declared[0].separator
			return typeof declared === 'string' && declared !== '' ? declared : '/'
		},
	},
}
</script>
