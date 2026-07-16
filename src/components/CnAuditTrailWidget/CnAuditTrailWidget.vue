<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnAuditTrailCard
		v-if="resolvedRegister && resolvedSchema && resolvedObjectId"
		:register="resolvedRegister"
		:schema="resolvedSchema"
		:object-id="resolvedObjectId"
		:title="resolvedTitle"
		:max-display="resolvedMaxDisplay" />
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
		 * @type {string|object}
		 */
		schema: { type: [String, Object], default: '' },
		/** The audited object's id — object context spread as props by CnWidgetGrid (slot path). */
		objectId: { type: String, default: '' },
		/** Optional card title override (defaults to the card's translated label). */
		title: { type: String, default: '' },
		/** Maximum audit rows to render (0 falls back to the card default). */
		maxDisplay: { type: Number, default: 0 },
		/** Stored widget content blob (CnDashboardPage registry branch): `{ title, maxDisplay, register?, schema?, objectId? }`. */
		content: { type: Object, default: () => ({}) },
	},

	computed: {
		/**
		 * The resolved object-context bag from either inject shape, or {}.
		 * @return {object}
		 */
		ctx() {
			const inj = this.cnObjectContext && (this.cnObjectContext.value || this.cnObjectContext)
			const holder = this.cnDetailObjectContext && this.cnDetailObjectContext.value
			return inj || holder || {}
		},
		/**
		 * The audited object's id: explicit prop → inject context → content.
		 * @return {string}
		 */
		resolvedObjectId() {
			return this.objectId || this.ctx.objectId || this.content.objectId || ''
		},
		/**
		 * The register slug/id: explicit prop → inject context → content.
		 * @return {string}
		 */
		resolvedRegister() {
			return this.register || this.ctx.register || this.content.register || ''
		},
		/**
		 * The schema SLUG: explicit prop → inject context → content; a
		 * schema object collapses to its slug/name/id.
		 * @return {string}
		 */
		resolvedSchema() {
			const s = this.schema || this.ctx.schema || this.content.schema || ''
			return typeof s === 'string' ? s : (s && (s.slug || s.name || s.id)) || ''
		},
		/**
		 * The card title: explicit prop → content → '' (card default).
		 * @return {string}
		 */
		resolvedTitle() {
			return this.title || this.content.title || ''
		},
		/**
		 * The row cap: explicit prop → content → the card's own default (5).
		 * @return {number}
		 */
		resolvedMaxDisplay() {
			if (this.maxDisplay > 0) return this.maxDisplay
			const fromContent = Number(this.content.maxDisplay)
			return Number.isFinite(fromContent) && fromContent > 0 ? fromContent : 5
		},
	},
}
</script>
