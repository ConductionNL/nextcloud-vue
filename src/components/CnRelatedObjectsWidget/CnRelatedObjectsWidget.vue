<!--
  CnRelatedObjectsWidget — Everything linked to an object, in one widget.

  Aggregates what the object relates to through OpenRegister relations and
  leaf integrations, grouped into clickable sections:
    • Objects — outgoing (uses), incoming (used) and contractual relations
    • Files   — files attached to the object
    • Linked apps — entry points into the leaf integrations that carry
      related content (mails, calendar events, …) for this object

  Sits on the CnWidgetWrapper chrome, so it carries the shared overflow
  Actions menu (Refresh / Documentation / Request a feature). Refresh
  refetches every section.
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId || objectType"
		:documentation-url="documentationUrl"
		:refreshing="loading"
		flush>
		<div class="cn-related-objects-widget">
			<!-- Objects -->
			<section v-if="showObjects && objectItems.length" class="cn-related-objects-widget__group">
				<h4 class="cn-related-objects-widget__group-title">
					{{ objectsLabel }} <span class="cn-related-objects-widget__count">{{ objectItems.length }}</span>
				</h4>
				<ul class="cn-related-objects-widget__list">
					<li v-for="item in objectItems"
						:key="`obj-${item.id}`"
						class="cn-related-objects-widget__row"
						tabindex="0"
						role="button"
						@click="onSelectObject(item.raw)"
						@keydown.enter="onSelectObject(item.raw)">
						<FileTreeOutline class="cn-related-objects-widget__icon" :size="20" />
						<span class="cn-related-objects-widget__label">{{ item.label }}</span>
						<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
					</li>
				</ul>
			</section>

			<!-- Files -->
			<section v-if="showFiles && fileItems.length" class="cn-related-objects-widget__group">
				<h4 class="cn-related-objects-widget__group-title">
					{{ filesLabel }} <span class="cn-related-objects-widget__count">{{ fileItems.length }}</span>
				</h4>
				<ul class="cn-related-objects-widget__list">
					<li v-for="item in fileItems"
						:key="`file-${item.id}`"
						class="cn-related-objects-widget__row"
						tabindex="0"
						role="button"
						@click="onSelectFile(item.raw)"
						@keydown.enter="onSelectFile(item.raw)">
						<Paperclip class="cn-related-objects-widget__icon" :size="20" />
						<span class="cn-related-objects-widget__label">{{ item.label }}</span>
						<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
					</li>
				</ul>
			</section>

			<!-- Host-supplied extra sections (e.g. mails resolved by a leaf) -->
			<section v-for="section in extraSections"
				:key="`extra-${section.key}`"
				class="cn-related-objects-widget__group">
				<h4 v-if="(section.items || []).length" class="cn-related-objects-widget__group-title">
					{{ section.label }} <span class="cn-related-objects-widget__count">{{ section.items.length }}</span>
				</h4>
				<ul v-if="(section.items || []).length" class="cn-related-objects-widget__list">
					<li v-for="(item, i) in section.items"
						:key="`extra-${section.key}-${i}`"
						class="cn-related-objects-widget__row"
						tabindex="0"
						role="button"
						@click="onSelectExtra(section.key, item)"
						@keydown.enter="onSelectExtra(section.key, item)">
						<CnIcon v-if="section.icon"
							:name="section.icon"
							:size="20"
							class="cn-related-objects-widget__icon" />
						<span class="cn-related-objects-widget__label">{{ item.label || item.title || item.name }}</span>
					</li>
				</ul>
			</section>

			<!-- Linked apps — leaf integrations carrying related content -->
			<section v-if="showIntegrations && linkedApps.length" class="cn-related-objects-widget__group">
				<h4 class="cn-related-objects-widget__group-title">
					{{ linkedAppsLabel }}
				</h4>
				<ul class="cn-related-objects-widget__list cn-related-objects-widget__list--apps">
					<li v-for="app in linkedApps"
						:key="`app-${app.id}`"
						class="cn-related-objects-widget__row cn-related-objects-widget__row--app"
						tabindex="0"
						role="button"
						@click="onOpenIntegration(app.id)"
						@keydown.enter="onOpenIntegration(app.id)">
						<CnIcon :name="app.icon || 'PuzzleOutline'" :size="20" class="cn-related-objects-widget__icon" />
						<span class="cn-related-objects-widget__label">{{ app.label }}</span>
						<ChevronRight class="cn-related-objects-widget__chevron" :size="20" />
					</li>
				</ul>
			</section>

			<!-- Empty -->
			<div v-if="isEmpty" class="cn-related-objects-widget__empty">
				{{ emptyLabel }}
			</div>
		</div>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { useObjectStore } from '../../store/index.js'
import FileTreeOutline from 'vue-material-design-icons/FileTreeOutline.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'

/** Event-bus channel CnWidgetWrapper's Refresh action broadcasts on. */
const REFRESH_BUS_CHANNEL = 'cn:widget:refresh'

/** Core sidebar tabs that are not "related content" leaves. */
const CORE_TABS = ['files', 'notes', 'tags', 'tasks', 'auditTrail', 'shares']

/**
 * CnRelatedObjectsWidget — Everything linked to an object, in one widget.
 *
 * Resolves an object's relations (uses / used / contracts) and files from
 * the object store, plus leaf-integration entry points from the pluggable
 * registry, and renders them as grouped, clickable sections. Emits a
 * `select-*` / `open-integration` event per row so the host routes the
 * navigation.
 *
 * ```vue
 * <CnRelatedObjectsWidget
 *   object-type="lead"
 *   :object-id="lead.id"
 *   :object-data="lead"
 *   :store="objectStore"
 *   @select-object="openObject"
 *   @open-integration="openSidebarTab" />
 * ```
 *
 * Mails and other leaf-specific collections that the store can't resolve
 * generically can be passed in via `extraSections`.
 */
export default {
	name: 'CnRelatedObjectsWidget',

	components: {
		CnWidgetWrapper,
		CnIcon,
		FileTreeOutline,
		Paperclip,
		ChevronRight,
	},

	props: {
		/** Widget title shown in the header. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Related'),
		},
		/** The registered object type slug (used for store fetches). */
		objectType: {
			type: String,
			default: '',
		},
		/** The object's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/** The object data — used to derive id/type when not passed explicitly. */
		objectData: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Object store instance. When omitted, the widget tries Pinia
		 * auto-detection. Relation/file sections only render when the store
		 * exposes the matching `fetch*` actions (relationsPlugin / filesPlugin).
		 */
		store: {
			type: Object,
			default: null,
		},
		/** Show the related-objects (uses/used/contracts) section. */
		showObjects: {
			type: Boolean,
			default: true,
		},
		/** Show the files section. */
		showFiles: {
			type: Boolean,
			default: true,
		},
		/** Show the leaf-integration entry-point section. */
		showIntegrations: {
			type: Boolean,
			default: true,
		},
		/**
		 * Integration ids to omit from the "Linked apps" section (on top of
		 * the always-omitted core tabs files/notes/tags/tasks/audit/shares).
		 * @type {string[]}
		 */
		excludeIntegrations: {
			type: Array,
			default: () => [],
		},
		/**
		 * Extra related sections the store can't resolve generically (e.g.
		 * mails surfaced by a leaf). Each: `{ key, label, icon?, items: [] }`.
		 * @type {Array<{ key: string, label: string, icon?: string, items: object[] }>}
		 */
		extraSections: {
			type: Array,
			default: () => [],
		},
		/** Documentation link for the overflow Actions menu. */
		documentationUrl: {
			type: String,
			default: '',
		},
		/** Stable id forwarded to the widget chrome. Falls back to objectType. */
		widgetId: {
			type: String,
			default: '',
		},
		/** Section heading for related objects. */
		objectsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Objects'),
		},
		/** Section heading for files. */
		filesLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Files'),
		},
		/** Section heading for the leaf-integration entry points. */
		linkedAppsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Linked apps'),
		},
		/** Empty-state label shown when nothing is related. */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Nothing related yet'),
		},
	},

	setup() {
		const { integrations } = useIntegrationRegistry()
		return { integrations }
	},

	data() {
		return {
			/** Whether any section is currently fetching. */
			loading: false,
			/** Merged related-object rows. */
			objectItems: [],
			/** File rows. */
			fileItems: [],
		}
	},

	computed: {
		/** Resolved object id — explicit prop wins, else from object data. */
		resolvedId() {
			return this.objectId || this.objectData.id || (this.objectData['@self'] && this.objectData['@self'].id) || ''
		},

		/** Leaf integrations that can carry related content for the object. */
		linkedApps() {
			const omit = new Set([...CORE_TABS, ...this.excludeIntegrations])
			return (this.integrations || []).filter((entry) => !omit.has(entry.id))
		},

		/** True when every section is empty. */
		isEmpty() {
			if (this.objectItems.length || this.fileItems.length) return false
			if (this.extraSections.some((s) => (s.items || []).length)) return false
			if (this.showIntegrations && this.linkedApps.length) return false
			return true
		},
	},

	watch: {
		resolvedId() {
			this.loadAll()
		},
	},

	mounted() {
		this.loadAll()
		subscribe(REFRESH_BUS_CHANNEL, this.onBusRefresh)
	},

	beforeDestroy() {
		unsubscribe(REFRESH_BUS_CHANNEL, this.onBusRefresh)
	},

	methods: {
		/**
		 * Emit the related-object selection for the host to route.
		 * @param {object} raw - The related object record.
		 */
		onSelectObject(raw) {
			/**
			 * @event select-object A related-object row was clicked.
			 * @type {object}
			 */
			this.$emit('select-object', raw)
		},

		/**
		 * Emit the file selection for the host to route.
		 * @param {object} raw - The file record.
		 */
		onSelectFile(raw) {
			/**
			 * @event select-file A file row was clicked.
			 * @type {object}
			 */
			this.$emit('select-file', raw)
		},

		/**
		 * Emit a click in a host-supplied extra section.
		 * @param {string} sectionKey - The section's key.
		 * @param {object} item - The clicked item.
		 */
		onSelectExtra(sectionKey, item) {
			/**
			 * @event select-extra A row in a host-supplied `extraSections`
			 * group was clicked.
			 * @type {{ section: string, item: object }}
			 */
			this.$emit('select-extra', { section: sectionKey, item })
		},

		/**
		 * Emit the leaf-integration open request for the host to route
		 * (the detail-page auto-body deep-links the sidebar tab).
		 * @param {string} integrationId - The leaf integration id.
		 */
		onOpenIntegration(integrationId) {
			/**
			 * @event open-integration A "Linked apps" row was clicked.
			 * @type {string}
			 */
			this.$emit('open-integration', integrationId)
		},

		/**
		 * Resolve the object store: explicit prop first, then Pinia.
		 * @return {object|null}
		 */
		getStore() {
			if (this.store) return this.store
			try {
				if (!this.$pinia) return null
				return useObjectStore()
			} catch {
				return null
			}
		},

		/**
		 * Normalise a related object into a display row.
		 * @param {object} raw - The related object record.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toObjectRow(raw) {
			const self = raw['@self'] || {}
			const id = raw.id || self.id || self.uuid || ''
			const label = raw.title || raw.name || self.title || self.name || self.schema || String(id)
			const meta = self.schema || raw.schema || ''
			return { id, label, meta: typeof meta === 'string' ? meta : '', raw }
		},

		/**
		 * Normalise a file record into a display row.
		 * @param {object} raw - The file record.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toFileRow(raw) {
			const id = raw.id || raw.fileid || raw.name || ''
			const label = raw.name || raw.title || raw.basename || String(id)
			const size = raw.size != null ? this.formatSize(raw.size) : ''
			return { id, label, meta: size, raw }
		},

		/**
		 * Human-readable byte size.
		 * @param {number} bytes - Raw byte count.
		 * @return {string}
		 */
		formatSize(bytes) {
			if (!Number.isFinite(bytes)) return ''
			const units = ['B', 'KB', 'MB', 'GB']
			let n = bytes
			let u = 0
			while (n >= 1024 && u < units.length - 1) { n /= 1024; u++ }
			return `${n.toFixed(u === 0 ? 0 : 1)} ${units[u]}`
		},

		/**
		 * Fetch and merge every section's data, guarding on store capability.
		 * @return {Promise<void>}
		 */
		async loadAll() {
			const store = this.getStore()
			const type = this.objectType
			const id = this.resolvedId
			if (!store || !type || !id) {
				this.objectItems = []
				this.fileItems = []
				return
			}

			this.loading = true
			try {
				if (this.showObjects) {
					const calls = []
					if (typeof store.fetchUses === 'function') calls.push(store.fetchUses(type, id))
					if (typeof store.fetchUsed === 'function') calls.push(store.fetchUsed(type, id))
					if (typeof store.fetchContracts === 'function') calls.push(store.fetchContracts(type, id))
					const groups = await Promise.all(calls)
					const seen = new Set()
					const merged = []
					for (const group of groups) {
						for (const raw of (group || [])) {
							const row = this.toObjectRow(raw)
							const key = String(row.id)
							if (key && seen.has(key)) continue
							if (key) seen.add(key)
							merged.push(row)
						}
					}
					this.objectItems = merged
				}

				if (this.showFiles && typeof store.fetchFiles === 'function') {
					const files = await store.fetchFiles(type, id)
					this.fileItems = (files || []).map((f) => this.toFileRow(f))
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Refetch when the shared widget Refresh fires for this widget.
		 * @param {{ widgetId: string }} payload - Bus payload.
		 */
		onBusRefresh(payload) {
			const mine = this.widgetId || this.objectType
			if (!payload || !payload.widgetId || !mine || payload.widgetId === mine) {
				this.loadAll()
			}
		},
	},
}
</script>

<style scoped>
.cn-related-objects-widget__group {
	padding: calc(2 * var(--default-grid-baseline, 4px)) 0;
}

.cn-related-objects-widget__group + .cn-related-objects-widget__group {
	border-top: 1px solid var(--color-border);
}

.cn-related-objects-widget__group-title {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 4px;
	padding: 0 calc(2 * var(--default-grid-baseline, 4px));
	font-size: 0.8em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border-radius: 9px;
	background: var(--color-background-dark);
	font-size: 0.9em;
	font-weight: 600;
}

.cn-related-objects-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-related-objects-widget__row {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: calc(1.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	cursor: pointer;
	border-radius: var(--border-radius);
}

.cn-related-objects-widget__row:hover {
	background: var(--color-background-hover);
}

.cn-related-objects-widget__row:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-related-objects-widget__icon {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-related-objects-widget__meta {
	flex: 0 0 auto;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__chevron {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__empty {
	padding: calc(3 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-text-maxcontrast);
	font-style: italic;
}
</style>
