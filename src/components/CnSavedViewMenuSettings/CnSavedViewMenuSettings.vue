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
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import CnOrderedListField from '../CnOrderedListField/CnOrderedListField.vue'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'
import { countLine } from '../../utils/countLine.js'
import { facetFilterParams } from '../../utils/facets.js'
import { fetchFilterCounts } from '../../utils/fetchFilterCounts.js'
import { pickRefLabel } from '../../utils/headerFieldChips.js'
import { buildHeaders, buildQueryString, prefixUrl } from '../../utils/headers.js'
import { resolveFilterMap } from '../../utils/routeFilters.js'
import { defaultFilterViews, extractViewState, pageOffersSavedViews, viewMatchesScope } from '../../utils/savedViewHelpers.js'
import { normalizeSavedViewMenu } from '../../utils/savedViewMenu.js'
import { summarizeViewFilters, viewFilterReferences } from '../../utils/savedViewSummary.js'
import { fieldsFromSchema } from '../../utils/schema.js'

// Per session: a schema, a referenced record's name and a view's count are
// asked once, however often the dialog opens.
const schemaCache = new Map()
const labelCache = new Map()
const countCache = new Map()

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
 * GET a JSON document from OpenRegister.
 *
 * @param {string} path The app-absolute path.
 * @param {object} [params] Query parameters.
 * @return {Promise<object>}
 */
async function getJson(path, params = {}) {
	const response = await fetch(prefixUrl(path + buildQueryString(params)), { headers: buildHeaders() })
	if (!response.ok) {
		throw new Error(`${path} returned ${response.status}`)
	}
	return response.json()
}

/**
 * A page's schema, asked once.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @return {Promise<object|null>}
 */
function loadSchema(register, schema) {
	const key = `${register}|${schema}`
	if (!schemaCache.has(key)) {
		// A failed read is forgotten, so the next opening asks again instead
		// of naming every filter by its raw key for the rest of the session.
		schemaCache.set(key, getJson(`/apps/openregister/api/schemas/${encodeURIComponent(schema)}`, { register }).catch(() => {
			schemaCache.delete(key)
			return null
		}))
	}
	return schemaCache.get(key)
}

/**
 * The names of referenced records, each asked once.
 *
 * @param {{register: string, schema: string, labelField: string, matchField?: string, ids: Array<string>}} ref The reference filter; with `matchField` the ids are that field's values.
 * @return {Promise<{[id: string]: string}>}
 */
async function loadLabels(ref) {
	const prefix = `${ref.register}|${ref.schema}|${ref.labelField}|${ref.matchField || ''}|`
	const missing = ref.ids.filter((id) => !labelCache.has(prefix + id))
	// A value that identifies a record by another field: one read per value.
	if (missing.length > 0 && ref.matchField) {
		for (const value of missing) {
			labelCache.set(prefix + value, getJson(`/apps/openregister/api/objects/${encodeURIComponent(ref.register)}/${encodeURIComponent(ref.schema)}`, { [ref.matchField]: value, _limit: 1 })
				.then((data) => {
					const row = Array.isArray(data && data.results) ? data.results[0] : null
					return row ? pickRefLabel(row, ref.labelField) : null
				})
				.catch(() => null))
		}
	} else if (missing.length > 0) {
		const request = getJson(`/apps/openregister/api/objects/${encodeURIComponent(ref.register)}/${encodeURIComponent(ref.schema)}`, { _ids: missing.join(','), _limit: missing.length })
			.then((data) => {
				const byId = {}
				for (const row of (Array.isArray(data && data.results) ? data.results : [])) {
					const id = row && (row.id ?? row.uuid ?? (row['@self'] && row['@self'].id))
					if (id !== undefined && id !== null) {
						byId[String(id)] = pickRefLabel(row, ref.labelField)
					}
				}
				return byId
			})
			.catch(() => ({}))
		for (const id of missing) {
			labelCache.set(prefix + id, request.then((byId) => byId[id] || null))
		}
	}
	const out = {}
	await Promise.all(ref.ids.map(async (id) => {
		const label = await labelCache.get(prefix + id)
		if (label) {
			out[id] = label
		}
	}))
	return out
}

/**
 * How many records a view's filters match on its page, asked once per view.
 *
 * @param {{register: string, schema: string, baseFilter: object}} page The page.
 * @param {object} filter The view's filters as query parameters.
 * @return {Promise<number|null>}
 */
function loadCount(page, filter) {
	const key = JSON.stringify([page.register, page.schema, page.baseFilter, filter])
	if (!countCache.has(key)) {
		countCache.set(key, fetchFilterCounts({ register: page.register, schema: page.schema, entries: [{ key: 'view', filter }], baseFilter: page.baseFilter })
			.then((counts) => (typeof counts.view === 'number' ? counts.view : null))
			.catch(() => null))
	}
	return countCache.get(key)
}

/**
 * A view's filters as the list request sends them.
 *
 * @param {{filters: object, search: string}} state The view's state.
 * @return {object}
 */
function filterParams(state) {
	const out = {}
	for (const [key, raw] of Object.entries(state.filters || {})) {
		Object.assign(out, facetFilterParams(key, Array.isArray(raw) ? raw : [raw]))
	}
	if (state.search) {
		out._search = state.search
	}
	return out
}

/**
 * CnSavedViewMenuSettings - the user's "My views" menu entries as a settings
 * section body (board DqPersoonlijkeInstellingen, "Views in my menu"): the
 * entries in their menu order, reordered by dragging or the arrow keys,
 * taken out of the menu with "Remove from menu", and a picker that adds any
 * view the user can see on a page of the app (their own, shared ones and the
 * pages' default views). Removing an entry never deletes the view.
 *
 * Each row says what its view shows and how many records that is: "Case
 * type Woo request, status open · 19 cases". The line is built from the
 * view's filters with the page schema's titles and the names of the records
 * and options they point at; the count is one request per view, cached for
 * the session, and fills in when it arrives without holding up the list.
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
		cnAppId: { default: '' },
		cnAppConfig: { default: null },
	},

	data() {
		return {
			views: [],
			loading: false,
			/** The schema per page id. */
			schemas: {},
			/** Looked-up display names per page id, filter key and value. */
			valueLabels: {},
			/** The count per list value; undefined while it is asked. */
			counts: {},
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

		/** @return {Array<object>} The pages that offer saved views. */
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
						register: typeof config.register === 'string' ? config.register : '',
						schema: typeof config.schema === 'string' ? config.schema : '',
						baseFilter: resolveFilterMap(config.filter, {}, { config: this.cnAppConfig || {} }),
						countSubtitle: config.countSubtitle || null,
						filterLabels: (config.filterLabels && typeof config.filterLabels === 'object') ? config.filterLabels : {},
					}
				})
		},

		/** @return {Array<object>} Every view the user can put in the menu, with its page and state. */
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
					out.push({ value: keyOf(page.id, id), id, page: page.id, label: view.name, state: extractViewState(view) })
				}
			}
			return out
		},

		/** @return {Array<string>} The entries as list values, in menu order. */
		values() {
			return this.entries.map((entry) => keyOf(entry.page, entry.id))
		},

		/**
		 * The choices: the candidates, and the entries no candidate covers. A
		 * choice's second line says what the view shows; a row in the menu
		 * adds how many records that is, once the count is in.
		 *
		 * @return {Array<{value: string, label: string, description: string}>}
		 */
		options() {
			const byId = new Map(this.pages.map((page) => [page.id, page]))
			const inMenu = new Set(this.values)
			const known = new Set(this.candidates.map((c) => c.value))
			const candidates = this.candidates.map((c) => {
				const summary = this.summaryOf(byId.get(c.page), c.state)
				const count = inMenu.has(c.value) ? this.countText(byId.get(c.page), this.counts[c.value]) : ''
				return { value: c.value, label: c.label, description: count ? `${summary} · ${count}` : summary }
			})
			const stored = this.entries
				.filter((entry) => !known.has(keyOf(entry.page, entry.id)))
				.map((entry) => ({ value: keyOf(entry.page, entry.id), label: entry.name, description: byId.has(entry.page) ? byId.get(entry.page).title : '' }))
			return [...candidates, ...stored]
		},
	},

	watch: {
		/** Look up the names a summary needs once the views are in. */
		candidates() {
			this.loadValueLabels()
			this.loadCounts()
		},

		/** Count a view as soon as it is in the menu. */
		values() {
			this.loadCounts()
		},
	},

	mounted() {
		this.fetchViews()
		this.loadSchemas()
		this.loadCounts()
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
		 * A view's filters as one line, else the page's title.
		 *
		 * @param {object} page The page.
		 * @param {{filters: object, search: string}} state The view's state.
		 * @return {string}
		 */
		summaryOf(page, state) {
			const schema = this.schemas[page.id]
			const summary = summarizeViewFilters(state, {
				properties: (schema && schema.properties) || {},
				valueLabels: this.valueLabels[page.id] || {},
				filterLabels: page.filterLabels,
				translate: this.cnTranslate,
			})
			return summary || page.title
		},

		/**
		 * "19 cases": the page's `countSubtitle` for the total, else "19 results".
		 *
		 * @param {object} page The page.
		 * @param {number|undefined} total The count, when it is in.
		 * @return {string} The text, or '' while the count is unknown.
		 */
		countText(page, total) {
			if (typeof total !== 'number') {
				return ''
			}
			const line = page.countSubtitle ? countLine(page.countSubtitle, total, { translate: this.cnTranslate, appId: this.cnAppId }) : ''
			return line || n('nextcloud-vue', '%n result', '%n results', total)
		},

		/** Read the schema of every page that offers saved views, for field titles and value names. */
		async loadSchemas() {
			await Promise.all(this.pages.filter((page) => page.register && page.schema).map(async (page) => {
				const schema = await loadSchema(page.register, page.schema)
				if (schema) {
					this.schemas = { ...this.schemas, [page.id]: schema }
				}
			}))
			this.loadValueLabels()
		},

		/** Look up the names of the referenced records the views filter on. */
		async loadValueLabels() {
			for (const page of this.pages) {
				const schema = this.schemas[page.id]
				if (!schema) {
					continue
				}
				const fields = fieldsFromSchema(schema, { includeReadOnly: true })
				const refs = this.candidates
					.filter((c) => c.page === page.id)
					.flatMap((c) => viewFilterReferences(c.state, fields, page.filterLabels))
				for (const ref of refs) {
					const labels = await loadLabels({ ...ref, register: ref.register || page.register })
					if (Object.keys(labels).length === 0) {
						continue
					}
					const forPage = this.valueLabels[page.id] || {}
					this.valueLabels = { ...this.valueLabels, [page.id]: { ...forPage, [ref.key]: { ...(forPage[ref.key] || {}), ...labels } } }
				}
			}
		},

		/** Count every view in the menu; each count fills in on its own. */
		loadCounts() {
			for (const value of this.values) {
				if (Object.hasOwn(this.counts, value)) {
					continue
				}
				const candidate = this.candidates.find((c) => c.value === value)
				const page = candidate && this.pages.find((p) => p.id === candidate.page)
				if (!page || !page.register || !page.schema) {
					continue
				}
				this.counts = { ...this.counts, [value]: undefined }
				loadCount(page, filterParams(candidate.state)).then((total) => {
					if (typeof total === 'number') {
						this.counts = { ...this.counts, [value]: total }
					}
				})
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
