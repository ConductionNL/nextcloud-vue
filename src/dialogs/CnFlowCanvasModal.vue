<!--
 - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 - SPDX-License-Identifier: EUPL-1.2
-->

<docs>
### CnFlowCanvasModal

The visual counterpart to `CnEditFlowsModal`: opens from the OpenBuild "Edit flows…"
menu and edits a schema's `x-openregister-flows` on a `CnFlowCanvas`. It resolves the
app's register(s) → schemas exactly like `CnEditFlowsModal`, hosts the canvas for the
selected schema, and persists via `PATCH /apps/openregister/api/schemas/{id}` (key
`x-openregister-flows`). The two editors are interchangeable and forward-compatible.
</docs>

<template>
	<NcDialog :name="t('nextcloud-vue', 'Edit flows')"
		size="large"
		:can-close="!busy"
		@closing="$emit('close')">
		<div class="cn-flow-modal">
			<div v-if="loading" class="cn-flow-modal__loading">
				<NcLoadingIcon :size="32" />
			</div>

			<NcEmptyContent v-else-if="!schemas.length"
				:name="t('nextcloud-vue', 'No schemas to attach flows to')"
				:description="t('nextcloud-vue', 'This app\'s pages reference no OpenRegister register, so there is nothing to automate yet.')">
				<template #icon>
					<Sitemap :size="20" />
				</template>
			</NcEmptyContent>

			<template v-else>
				<div class="cn-flow-modal__toolbar">
					<NcSelect :options="schemaOptions"
						:model-value="selectedSchemaOption"
						:input-label="t('nextcloud-vue', 'Object type')"
						:clearable="false"
						class="cn-flow-modal__schema-select"
						@update:model-value="onSelectSchema" />
					<a v-if="onOpenForm"
						class="cn-flow-modal__form-link"
						href="#"
						@click.prevent="onOpenForm">{{ t('nextcloud-vue', 'Use the form editor instead') }}</a>
				</div>

				<NcNoteCard v-if="error" type="error">
					{{ error }}
				</NcNoteCard>

				<CnFlowCanvas v-model="flows" :schema="selectedSchema" :event-catalog="eventCatalog" />
			</template>
		</div>

		<template #actions>
			<NcButton variant="tertiary" :disabled="busy" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton variant="primary" :disabled="busy || loading || !selectedSchema" @click="save">
				<template #icon>
					<NcLoadingIcon v-if="busy" :size="18" />
					<ContentSave v-else :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Save flows') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import { NcDialog, NcButton, NcSelect, NcLoadingIcon, NcNoteCard, NcEmptyContent } from '@nextcloud/vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import CnFlowCanvas from '../components/CnFlowCanvas/CnFlowCanvas.vue'
import { buildHeaders } from '../utils/headers.js'

/**
 * Unwrap an OpenRegister API payload (`{result}` / `{results}` / `{schemas}` / raw).
 * @param {object|Array} data The raw response body.
 * @return {*} The unwrapped payload.
 */
function unwrap(data) {
	if (!data) return data
	if (data.result !== undefined) return data.result
	if (data.results !== undefined) return data.results
	if (data.registers !== undefined) return data.registers
	if (data.schemas !== undefined) return data.schemas
	return data
}

export default {
	name: 'CnFlowCanvasModal',

	components: { NcDialog, NcButton, NcSelect, NcLoadingIcon, NcNoteCard, NcEmptyContent, ContentSave, Sitemap, CnFlowCanvas },

	props: {
		/**
		 * The app manifest (working or live) — `pages[].config.register` slugs
		 * identify which schemas this app's flows attach to.
		 *
		 * @type {object}
		 */
		manifest: {
			type: Object,
			default: null,
		},
		/**
		 * Optional callback to switch to the form editor (`CnEditFlowsModal`).
		 *
		 * @type {Function}
		 */
		onOpenForm: {
			type: Function,
			default: null,
		},
	},

	emits: ['close', 'saved'],

	data() {
		return {
			loading: true,
			busy: false,
			error: '',
			schemas: [],
			selectedSchemaId: null,
			flows: [],
			eventCatalog: [],
		}
	},

	computed: {
		manifestRegisterSlugs() {
			const pages = (this.manifest && Array.isArray(this.manifest.pages)) ? this.manifest.pages : []
			return [...new Set(pages
				.map((p) => p && p.config && p.config.register)
				.filter((s) => typeof s === 'string' && s.length > 0))]
		},
		schemaOptions() {
			return this.schemas.map((s) => ({ id: s.id, label: s.title || s.slug || String(s.id) }))
		},
		selectedSchema() {
			return this.schemas.find((s) => s.id === this.selectedSchemaId) || null
		},
		selectedSchemaOption() {
			const s = this.selectedSchema
			return s ? { id: s.id, label: s.title || s.slug || String(s.id) } : null
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,
		headers() {
			return buildHeaders()
		},
		async loadEventCatalog() {
			// Best-effort: an older backend without this endpoint leaves the
			// catalog empty and CnFlowCanvas falls back to the legacy triggers.
			try {
				const { data } = await axios.get(
					generateUrl('/apps/openregister/api/flow/event-catalog'),
					{ headers: this.headers() },
				)
				const list = unwrap(data)
				this.eventCatalog = Array.isArray(list) ? list : (Array.isArray(list?.results) ? list.results : [])
			} catch {
				this.eventCatalog = []
			}
		},
		async load() {
			this.loading = true
			this.error = ''
			this.loadEventCatalog()
			try {
				const { data } = await axios.get(generateUrl('/apps/openregister/api/registers') + '?_limit=1000', { headers: this.headers() })
				const list = Array.isArray(unwrap(data)) ? unwrap(data) : []
				const wanted = this.manifestRegisterSlugs
				const registers = wanted.length ? list.filter((r) => wanted.includes(r.slug)) : list
				const ids = []
				registers.forEach((r) => {
					(Array.isArray(r.schemas) ? r.schemas : []).forEach((id) => {
						if ((typeof id === 'number' || typeof id === 'string') && !ids.includes(id)) ids.push(id)
					})
				})
				const resolved = await Promise.all(ids.map(async (id) => {
					try {
						const res = await axios.get(generateUrl(`/apps/openregister/api/schemas/${id}`), { headers: this.headers() })
						return unwrap(res.data)
					} catch {
						return null
					}
				}))
				this.schemas = resolved.filter(Boolean)
				if (this.schemas.length) this.selectSchema(this.schemas[0].id)
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to load schemas.')
			} finally {
				this.loading = false
			}
		},
		selectSchema(id) {
			this.selectedSchemaId = id
			const cfg = (this.selectedSchema && this.selectedSchema.configuration) || {}
			let raw = cfg['x-openregister-flows']
			if (!Array.isArray(raw)) raw = raw && typeof raw === 'object' ? [raw] : []
			this.flows = JSON.parse(JSON.stringify(raw)).map((f) => ({
				name: f.name || 'flow',
				trigger: f.trigger || 'created',
				actions: Array.isArray(f.actions) ? f.actions : [],
				...(f._layout ? { _layout: f._layout } : {}),
			}))
		},
		onSelectSchema(option) {
			if (option && option.id != null) this.selectSchema(option.id)
		},
		/** Normalise the working flows for persistence (drop empty layout keys). */
		cleanFlows() {
			return this.flows.map((f) => {
				const out = {
					name: f.name || 'flow',
					trigger: f.trigger || 'created',
					actions: (Array.isArray(f.actions) ? f.actions : []).map((a) => ({ ...a })),
				}
				if (f._layout && (f._layout.t || (Array.isArray(f._layout.a) && f._layout.a.length))) {
					out._layout = f._layout
				}
				return out
			})
		},
		async save() {
			const schema = this.selectedSchema
			if (!schema) return
			this.busy = true
			this.error = ''
			try {
				const configuration = { ...(schema.configuration || {}) }
				configuration['x-openregister-flows'] = this.cleanFlows()
				await axios.patch(
					generateUrl(`/apps/openregister/api/schemas/${schema.id}`),
					{ configuration },
					{ headers: this.headers() },
				)
				schema.configuration = configuration
				this.$emit('saved', { schemaId: schema.id, flows: configuration['x-openregister-flows'] })
				this.$emit('close')
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to save flows.')
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-flow-modal { min-height: 480px; }
.cn-flow-modal__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 420px;
}
.cn-flow-modal__toolbar {
	display: flex;
	align-items: center;
	gap: 16px;
	margin-bottom: 12px;
}
.cn-flow-modal__schema-select { min-width: 260px; }
.cn-flow-modal__form-link { font-size: 13px; }
</style>
