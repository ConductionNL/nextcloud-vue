<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnAuditTrailCard
		v-if="resolvedScope === 'app' || resolvedSource || resolvedEndpoint || (resolvedRegister && resolvedSchema && resolvedObjectId)"
		:source="resolvedSource"
		:endpoint="resolvedEndpoint"
		:register="resolvedRegister"
		:schema="resolvedSchema"
		:objectId="resolvedObjectId"
		:scope="resolvedScope"
		:title="resolvedTitle"
		:maxDisplay="resolvedMaxDisplay"
		:excludeActions="resolvedExcludeActions"
		:actionLabels="actionLabels"
		:valueLabels="valueLabels"
		v-bind="emptyText ? { noEntriesLabel: emptyText } : {}" />
</template>

<script>
import CnAuditTrailCard from '../CnAuditTrailCard/CnAuditTrailCard.vue'

/**
 * CnAuditTrailWidget — thin built-in widget wrapping CnAuditTrailCard with
 * unified object-context resolution (`audit-trail` widget key, Wave 1 of
 * nextcloud-vue#91).
 *
 * CnAuditTrailCard needs explicit `register` / `schema` / `objectId` props,
 * but the detail render paths surface the current object differently:
 * CnDetailPage's config grid provides a `cnObjectContext` inject, while
 * CnPageRenderer's slot CnWidgetGrid spreads the detail object context as
 * props, and CnDashboardPage's registry branch hands a stored `content`
 * blob. This widget reads whichever is present — explicit props win, then
 * the injects, then `content` — so the single `audit-trail` key works on
 * every surface. It replaces the three identical per-app adapters
 * (procest / zaakafhandelapp / scholiq).
 *
 * Registered in BOTH the v2 grid's BUILT_IN_WIDGETS and (detail-page
 * surface, like the `data` widget) the shared dashboardWidgetRegistry —
 * see `dashboardRegistration.js`.
 */
export default {
	name: 'CnAuditTrailWidget',

	components: { CnAuditTrailCard },

	inject: {
		/** The host app's translate function, for `content.emptyText`. */
		cnTranslate: { default: () => (key) => key },
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage (raw object or `{ value }` holder).
		 */
		cnObjectContext: { default: null },
		/**
		 * Detail object context holder (`{ value: { objectData, schema,
		 * objectType, objectId, register, store } | null }`) provided by
		 * CnPageRenderer for the v2 slot grid.
		 */
		cnDetailObjectContext: { default: null },
	},

	props: {
		/** OpenRegister register slug/id — object context spread as props by CnWidgetGrid (slot path). */
		register: { type: String, default: '' },
		/**
		 * OpenRegister schema — a slug string, or the schema OBJECT the
		 * detail-context merge supplies (its slug/name/id is used).
		 *
		 * @type {string|object}
		 */
		schema: { type: [String, Object], default: '' },
		/** The audited object's id — object context spread as props by CnWidgetGrid (slot path). */
		objectId: { type: String, default: '' },
		/** Optional card title override (defaults to the card's translated label). */
		title: { type: String, default: '' },
		/** Maximum audit rows to render (0 falls back to the card default). */
		maxDisplay: { type: Number, default: 0 },
		/**
		 * `app` lists the app-wide feed (every object the caller may read,
		 * narrowed to `register` / `schema` when set) and needs no object;
		 * `object` (the default) is one object's trail. Also read from
		 * `content.scope`.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
		 */
		scope: { type: String, default: '' },
		/** Read the trail of something that is not an object (`{ kind: 'flow-task', id? }`); also read from `content.source`. */
		source: { type: Object, default: null },
		/** A trail URL of its own; also read from `content.endpoint`. */
		endpoint: { type: String, default: '' },
		/** Actions to leave out (`['read']`); also read from `content.excludeActions`. */
		excludeActions: { type: Array, default: () => [] },
		/** Stored widget content blob (CnDashboardPage registry branch): `{ title, maxDisplay, register?, schema?, objectId?, source?, endpoint?, emptyText?, excludeActions?, actionLabels?, valueLabels? }`. */
		content: { type: Object, default: () => ({}) },
	},

	computed: {
		/**
		 * The resolved object-context bag from either inject shape, or {}.
		 *
		 * @return {object}
		 */
		ctx() {
			const inj = this.cnObjectContext && (this.cnObjectContext.value || this.cnObjectContext)
			const holder = this.cnDetailObjectContext && this.cnDetailObjectContext.value
			return inj || holder || {}
		},

		/**
		 * The audited object's id: explicit prop → inject context → content.
		 *
		 * @return {string}
		 */
		resolvedObjectId() {
			return this.objectId || this.ctx.objectId || this.content.objectId || ''
		},

		/**
		 * The register slug/id: explicit prop → inject context → content.
		 *
		 * @return {string}
		 */
		resolvedRegister() {
			return this.register || this.ctx.register || this.content.register || ''
		},

		/**
		 * The schema SLUG: explicit prop → inject context → content; a
		 * schema object collapses to its slug/name/id.
		 *
		 * @return {string}
		 */
		resolvedSchema() {
			const s = this.schema || this.ctx.schema || this.content.schema || ''
			return typeof s === 'string' ? s : (s && (s.slug || s.name || s.id)) || ''
		},

		/**
		 * The feed scope: explicit prop → content → `object`.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
		 * @return {('object'|'app')}
		 */
		resolvedScope() {
			const s = this.scope || this.content.scope
			return s === 'app' ? 'app' : 'object'
		},

		/**
		 * The card title: explicit prop → content → '' (card default).
		 *
		 * @return {string}
		 */
		/** @return {object|null} The non-object anchor, from the prop or the content. */
		resolvedSource() {
			const source = this.source || this.content.source
			return source && typeof source === 'object' ? source : null
		},

		/** @return {string} The trail URL of its own, from the prop or the content. */
		resolvedEndpoint() {
			return this.endpoint || (typeof this.content.endpoint === 'string' ? this.content.endpoint : '')
		},

		/** @return {string} The empty line the content names, through the host's translate, or ''. */
		/**
		 * `content.actionLabels`, each label through the app's translate.
		 *
		 * @return {Object<string, string>|null}
		 * @spec openspec/changes/audit-trail-action-labels/specs/audit-trail/spec.md#requirement-a-trail-can-say-what-happened-in-words
		 */
		actionLabels() {
			const labels = this.content.actionLabels
			if (!labels || typeof labels !== 'object') {
				return null
			}
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (text) => text
			return Object.fromEntries(Object.entries(labels)
				.filter(([, text]) => typeof text === 'string' && text !== '')
				.map(([key, text]) => [key, translate(text)]))
		},

		/**
		 * `content.valueLabels`, each word through the app's translate.
		 *
		 * @return {{[key: string]: {[value: string]: string}}|null}
		 * @spec openspec/changes/audit-label-changed-values/specs/audit-trail/spec.md#requirement-a-trail-label-can-quote-what-the-entry-recorded
		 */
		valueLabels() {
			const labels = this.content.valueLabels
			if (!labels || typeof labels !== 'object') {
				return null
			}
			const translate = typeof this.cnTranslate === 'function' ? this.cnTranslate : (text) => text
			return Object.fromEntries(Object.entries(labels)
				.filter(([, words]) => words && typeof words === 'object')
				.map(([key, words]) => [key, Object.fromEntries(Object.entries(words)
					.filter(([, text]) => typeof text === 'string' && text !== '')
					.map(([value, text]) => [value, translate(text)]))]))
		},

		emptyText() {
			const text = this.content.emptyText
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The actions to leave out: explicit prop → content → none.
		 *
		 * @spec openspec/changes/audit-trail-exclude-actions/specs/audit-trail/spec.md#requirement-a-history-card-can-leave-out-events-by-action
		 * @return {Array<string>}
		 */
		resolvedExcludeActions() {
			if (this.excludeActions.length > 0) {
				return this.excludeActions
			}
			const fromContent = this.content.excludeActions
			return Array.isArray(fromContent) ? fromContent.filter((action) => typeof action === 'string' && action !== '') : []
		},

		resolvedTitle() {
			return this.title || this.content.title || ''
		},

		/**
		 * The row cap: explicit prop → content → the card's own default (5).
		 *
		 * @return {number}
		 */
		resolvedMaxDisplay() {
			if (this.maxDisplay > 0) {
				return this.maxDisplay
			}
			const fromContent = Number(this.content.maxDisplay)
			return Number.isFinite(fromContent) && fromContent > 0 ? fromContent : 5
		},
	},
}
</script>
