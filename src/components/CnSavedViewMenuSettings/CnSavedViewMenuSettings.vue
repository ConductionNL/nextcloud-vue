<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-saved-view-menu-settings" data-testid="cn-saved-view-menu-settings">
		<p class="cn-saved-view-menu-settings__intro">
			{{ t('nextcloud-vue', 'These saved views are at the bottom of your menu under My views, in this order. Drag a row or use the arrow keys. You put a view in the menu with Add to menu in the side panel of a list.') }}
		</p>
		<CnOrderedListField
			:modelValue="values"
			:options="options"
			:label="t('nextcloud-vue', 'Views in my menu')"
			:addLabel="t('nextcloud-vue', 'Add view')"
			:addPlaceholder="t('nextcloud-vue', 'Pick a saved view')"
			:addHint="t('nextcloud-vue', 'You see your own views, the views shared with you and the default views. A new view goes to the bottom.')"
			:removeLabel="t('nextcloud-vue', 'Remove from menu')"
			:emptyText="t('nextcloud-vue', 'Your menu has no views yet.')"
			:loading="loading"
			:disabled="!menu"
			@update:modelValue="onChange" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnOrderedListField from '../CnOrderedListField/CnOrderedListField.vue'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { defaultFilterViews, pageOffersSavedViews, viewMatchesScope } from '../../utils/savedViewHelpers.js'
import { normalizeSavedViewMenu } from '../../utils/savedViewMenu.js'

/**
 * The key a menu entry or a candidate view is listed under.
 *
 * @param {string} page The page's route name.
 * @param {string} id The view id.
 * @return {string}
 */
function keyOf(page, id) {
	return `${page}|${id}`
}

/**
 * CnSavedViewMenuSettings - the user's "My views" menu entries as a settings
 * section body (board DqPersoonlijkeInstellingen, "Views in my menu"): the
 * entries in their menu order, reordered by dragging or the arrow keys,
 * taken out of the menu with "Remove from menu", and a picker that adds any
 * view the user can see on a page of the app (their own, shared ones and the
 * pages' default views). Removing an entry never deletes the view.
 *
 * Reads and writes the list CnAppRoot holds (`cnSavedViewMenu`, stored in
 * the `cn_saved_view_menu` preference). CnAppRoot draws it as the `views`
 * section of its user settings dialog; an app with a dialog of its own can
 * mount it inside an NcAppSettingsSection.
 *
 * @spec openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-a-user-orders-and-picks-the-views-in-their-menu
 */
export default {
	name: 'CnSavedViewMenuSettings',
	components: { CnOrderedListField },
	inject: {
		cnSavedViewMenu: { default: null },
		cnManifest: { default: null },
		cnTranslate: { default: () => (key) => key },
	},

	data() {
		return {
			views: [],
			loading: false,
		}
	},

	computed: {
		/** @return {object|null} The menu holder, when it can be changed. */
		menu() {
			const menu = this.cnSavedViewMenu
			return menu && typeof menu.set === 'function' ? menu : null
		},

		/** @return {Array<object>} The stored entries. */
		entries() {
			return normalizeSavedViewMenu(this.cnSavedViewMenu ? this.cnSavedViewMenu.entries : [])
		},

		/** @return {Array<{id: string, title: string, scope: object, defaults: Array}>} The pages that offer saved views. */
		pages() {
			const pages = this.cnManifest && Array.isArray(this.cnManifest.pages) ? this.cnManifest.pages : []
			return pages
				.filter((page) => page && page.type === 'index' && typeof page.id === 'string' && pageOffersSavedViews(page.config))
				.map((page) => {
					const config = page.config || {}
					return {
						id: page.id,
						title: typeof page.title === 'string' ? this.cnTranslate(page.title) : page.id,
						scope: { scope: config.savedViewsScope, register: config.register, schema: config.schema, source: config.entitySource },
						defaults: Array.isArray(config.defaultSavedViews) ? config.defaultSavedViews : [],
					}
				})
		},

		/** @return {Array<{value: string, id: string, page: string, label: string, description: string}>} Every view the user can put in the menu. */
		candidates() {
			const out = []
			for (const page of this.pages) {
				const defaults = page.defaults.map((entry) => (entry && typeof entry.name === 'string' ? { ...entry, name: this.cnTranslate(entry.name) } : entry))
				const views = [...defaultFilterViews(defaults, page.scope), ...this.views.filter((view) => viewMatchesScope(view, page.scope))]
				for (const view of views) {
					const id = String(view.id ?? view.slug ?? '')
					if (id === '' || typeof view.name !== 'string' || view.name === '') {
						continue
					}
					out.push({ value: keyOf(page.id, id), id, page: page.id, label: view.name, description: page.title })
				}
			}
			return out
		},

		/** @return {Array<string>} The entries as list values, in menu order. */
		values() {
			return this.entries.map((entry) => keyOf(entry.page, entry.id))
		},

		/** @return {Array<object>} The choices: the candidates, and the entries no candidate covers. */
		options() {
			const known = new Set(this.candidates.map((c) => c.value))
			const titles = new Map(this.pages.map((page) => [page.id, page.title]))
			const stored = this.entries
				.filter((entry) => !known.has(keyOf(entry.page, entry.id)))
				.map((entry) => ({ value: keyOf(entry.page, entry.id), label: entry.name, description: titles.get(entry.page) || '' }))
			return [...this.candidates, ...stored]
		},
	},

	mounted() {
		this.fetchViews()
	},

	methods: {
		t,

		/** Read the saved views the user can see; without them the defaults stay. */
		async fetchViews() {
			this.loading = true
			try {
				const views = await useSavedViewsApi().fetchViews()
				this.views = Array.isArray(views) ? views : []
			} catch {
				this.views = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Store the list in its new order, with entries removed or added.
		 *
		 * @param {Array<string>} values The list values in order.
		 */
		onChange(values) {
			if (!this.menu) {
				return
			}
			const byKey = new Map(this.entries.map((entry) => [keyOf(entry.page, entry.id), entry]))
			const candidates = new Map(this.candidates.map((c) => [c.value, c]))
			const next = values
				.map((value) => {
					if (byKey.has(value)) {
						return byKey.get(value)
					}
					const candidate = candidates.get(value)
					return candidate ? { id: candidate.id, page: candidate.page, name: candidate.label } : null
				})
				.filter(Boolean)
			this.menu.set(next)
		},
	},
}
</script>

<style scoped>
.cn-saved-view-menu-settings__intro {
	margin: 0 0 12px;
	color: var(--color-text-maxcontrast);
}
</style>
