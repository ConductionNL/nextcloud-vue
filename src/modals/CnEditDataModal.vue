<!--
  CnEditDataModal — manage the app's data model (OpenRegister register + schemas)
  from inside the OpenBuild runtime (ADR-041 / ADR-004).

  Opened from the OpenBuild edit menu ("Edit data…"). It reads the register
  slug(s) the manifest's pages point at, loads the matching OpenRegister
  register(s) and their schemas, and lets the user:
    • create a register when the app has none yet,
    • add a schema (reuses the full CnSchemaFormDialog editor),
    • edit a schema's properties / config / RBAC,
    • remove a schema.

  Persistence talks straight to the OpenRegister REST API (the same backend the
  runtime already reads objects from): POST/PUT/DELETE /api/schemas, and
  PATCH /api/registers/{id} to (un)link a schema. Isolated NcModal per ADR-004.
-->
<template>
	<NcModal size="large" @close="$emit('close')">
		<div class="cn-edit-data">
			<h2 class="cn-edit-data__title">
				{{ t('nextcloud-vue', 'Manage data') }}
			</h2>

			<NcLoadingIcon v-if="loading" :size="32" class="cn-edit-data__loading" />

			<div v-else-if="error" class="cn-edit-data__error">
				{{ error }}
			</div>

			<!-- No register yet → offer to create one. -->
			<div v-else-if="!registers.length" class="cn-edit-data__empty">
				<p>{{ t('nextcloud-vue', 'This app has no data register yet. Create one to start adding schemas.') }}</p>
				<NcTextField :value="newRegisterTitle"
					:label="t('nextcloud-vue', 'Register name')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'My data')"
					@update:value="(v) => newRegisterTitle = v" />
				<NcButton type="primary" :disabled="busy || !newRegisterTitle.trim()" @click="createRegister">
					<template v-if="busy" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Create register') }}
				</NcButton>
			</div>

			<template v-else>
				<!-- Register selector (usually a single register). -->
				<div class="cn-edit-data__register">
					<NcSelect v-if="registers.length > 1"
						class="cn-edit-data__register-select"
						:value="selectedRegisterOption"
						:options="registerOptions"
						:input-label="t('nextcloud-vue', 'Register')"
						label="label"
						:clearable="false"
						@input="onSelectRegister" />
					<span v-else class="cn-edit-data__register-name">
						{{ t('nextcloud-vue', 'Register') }}: <strong>{{ selectedRegister && (selectedRegister.title || selectedRegister.slug) }}</strong>
					</span>
				</div>

				<!-- Schemas of the selected register. -->
				<div class="cn-edit-data__schemas">
					<div class="cn-edit-data__schemas-head">
						<h3 class="cn-edit-data__subtitle">
							{{ t('nextcloud-vue', 'Schemas') }}
						</h3>
						<NcButton type="secondary" :disabled="busy" @click="openCreate">
							<template #icon>
								<Plus :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Add schema') }}
						</NcButton>
					</div>

					<p v-if="!schemas.length" class="cn-edit-data__hint">
						{{ t('nextcloud-vue', 'No schemas yet. Add one to define what data this app stores.') }}
					</p>

					<ul v-else class="cn-edit-data__list">
						<li v-for="schema in schemas" :key="schema.id" class="cn-edit-data__row">
							<span class="cn-edit-data__schema-name">
								<strong>{{ schema.title || schema.slug }}</strong>
								<span class="cn-edit-data__schema-meta">{{ propertyCount(schema) }}</span>
							</span>
							<div class="cn-edit-data__row-actions">
								<NcButton type="tertiary"
									:disabled="busy"
									:aria-label="t('nextcloud-vue', 'Edit schema')"
									@click="openEdit(schema)">
									<template #icon>
										<Pencil :size="20" />
									</template>
								</NcButton>
								<NcButton type="tertiary"
									:disabled="busy"
									:aria-label="t('nextcloud-vue', 'Remove schema')"
									@click="removeSchema(schema)">
									<template #icon>
										<Delete :size="20" />
									</template>
								</NcButton>
							</div>
						</li>
					</ul>
				</div>
			</template>

			<div class="cn-edit-data__footer">
				<NcButton @click="$emit('close')">
					{{ t('nextcloud-vue', 'Close') }}
				</NcButton>
			</div>
		</div>

		<!-- Reuse the full OpenRegister schema editor for add/edit. It renders its
		     own dialog (teleported); a global z-index rule below stacks it above
		     this data modal so it isn't painted underneath. -->
		<CnSchemaFormDialog
			v-if="showSchemaDialog"
			:item="editingSchema"
			:dialog-title="editingSchema ? t('nextcloud-vue', 'Edit schema') : t('nextcloud-vue', 'New schema')"
			:available-registers="registerOptions"
			:available-schemas="schemas"
			:show-delete="!!editingSchema"
			@confirm="onSchemaConfirm"
			@delete-schema="onSchemaDelete"
			@close="showSchemaDialog = false" />
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import CnSchemaFormDialog from '../components/CnSchemaFormDialog/CnSchemaFormDialog.vue'
import { buildHeaders } from '../utils/headers.js'

/**
 * Unwrap an OpenRegister API payload (`{result}` / `{results}` / array / object).
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

/**
 * Process-lifetime cache for the registers list + resolved schema objects, so
 * re-opening Manage data (or reopening after a page-config picker used the same
 * data) is instant instead of re-fetching every register and every schema on
 * each open. Invalidated on any write from this modal (create/edit/delete/link)
 * and after a short TTL so external changes still surface. Keyed by nothing for
 * registers (single app-scoped list) and by schema id for schemas.
 */
const REGISTER_TTL_MS = 60000
const dataCache = { registers: null, registersAt: 0, schemas: new Map() }

/** Drop all cached registers + schemas (call after any write; exported for test isolation). */
export function invalidateDataCache() {
	dataCache.registers = null
	dataCache.registersAt = 0
	dataCache.schemas.clear()
}

/**
 * CnEditDataModal — manage the app's OpenRegister register + schemas in-app
 * (see file header). Reads the register slugs from the manifest, talks to the
 * OpenRegister REST API, and reuses CnSchemaFormDialog for schema editing.
 */
export default {
	name: 'CnEditDataModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcLoadingIcon, CnSchemaFormDialog, Plus, Pencil, Delete },

	inject: {
		/**
		 * Shared app data-source map (`{ registers: [{ value, label, schemas }] }`)
		 * provided by CnAppRoot and consumed by the page-config Data-source/Schema
		 * pickers. Kept in sync here so a schema added/removed via this modal
		 * appears in those pickers without an app reload. Null when not provided.
		 */
		cnDataSources: { default: null },
	},

	props: {
		/**
		 * The app manifest (working or live). Its `pages[].config.register`
		 * slugs identify which OpenRegister register(s) belong to this app.
		 *
		 * @type {object}
		 */
		manifest: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			loading: true,
			busy: false,
			error: '',
			// The app's registers (full OR objects).
			registers: [],
			selectedRegisterId: null,
			// Resolved schema objects for the selected register.
			schemas: [],
			// Schema editor dialog.
			showSchemaDialog: false,
			editingSchema: null,
			// New-register form.
			newRegisterTitle: '',
		}
	},

	computed: {
		/** Distinct, non-empty register slugs referenced by the manifest's pages. */
		manifestRegisterSlugs() {
			const pages = (this.manifest && Array.isArray(this.manifest.pages)) ? this.manifest.pages : []
			const slugs = pages
				.map((p) => p && p.config && p.config.register)
				.filter((s) => typeof s === 'string' && s.length > 0)
			return [...new Set(slugs)]
		},
		/** The selected register object. */
		selectedRegister() {
			return this.registers.find((r) => r.id === this.selectedRegisterId) || this.registers[0] || null
		},
		/** Register options for the selector + CnSchemaFormDialog. */
		registerOptions() {
			return this.registers.map((r) => ({ id: r.id, value: r.id, label: r.title || r.slug, title: r.title, slug: r.slug }))
		},
		/** The selected register as an option. */
		selectedRegisterOption() {
			const r = this.selectedRegister
			return r ? { id: r.id, value: r.id, label: r.title || r.slug } : null
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,
		/** Default request headers for OpenRegister API calls. */
		headers() {
			return buildHeaders()
		},
		/**
		 * Load the app's registers (filtered to the manifest's slugs) and the
		 * selected register's schemas.
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				const fresh = dataCache.registers && (Date.now() - dataCache.registersAt) < REGISTER_TTL_MS
				let list
				if (fresh) {
					list = dataCache.registers
				} else {
					const url = generateUrl('/apps/openregister/api/registers') + '?_limit=1000'
					const { data } = await axios.get(url, { headers: this.headers() })
					const all = unwrap(data) || []
					list = Array.isArray(all) ? all : []
					dataCache.registers = list
					dataCache.registersAt = Date.now()
				}
				const wanted = this.manifestRegisterSlugs
				this.registers = wanted.length
					? list.filter((r) => wanted.includes(r.slug))
					: list
				if (this.registers.length) {
					this.selectedRegisterId = this.registers[0].id
					await this.loadSchemas()
				}
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to load data registers.')
			} finally {
				this.loading = false
			}
		},
		/**
		 * Resolve the selected register's schema ids into full schema objects.
		 * @return {Promise<void>}
		 */
		async loadSchemas() {
			const reg = this.selectedRegister
			const ids = (reg && Array.isArray(reg.schemas)) ? reg.schemas.filter((x) => typeof x === 'number' || typeof x === 'string') : []
			const resolved = await Promise.all(ids.map(async (id) => {
				const cached = dataCache.schemas.get(id)
				if (cached) return cached
				try {
					const { data } = await axios.get(generateUrl(`/apps/openregister/api/schemas/${id}`), { headers: this.headers() })
					const schema = unwrap(data)
					if (schema) dataCache.schemas.set(id, schema)
					return schema
				} catch {
					return null
				}
			}))
			this.schemas = resolved.filter(Boolean)
			this.syncDataSources()
		},
		/**
		 * Mirror the selected register's current schemas into the shared
		 * `cnDataSources` map (same object the page-config pickers read), so a
		 * schema added/removed here shows up there without an app reload.
		 * @return {void}
		 */
		syncDataSources() {
			const ds = this.cnDataSources
			const reg = this.selectedRegister
			if (!ds || !Array.isArray(ds.registers) || !reg) return
			const dsReg = ds.registers.find((r) => r.value === reg.slug)
			if (!dsReg) return
			this.$set(dsReg, 'schemas', this.schemas.map((s) => ({
				value: s.slug,
				label: s.title || s.slug,
				columns: (s.properties && typeof s.properties === 'object') ? Object.keys(s.properties) : [],
			})))
		},
		/**
		 * Switch the selected register and reload its schemas.
		 * @param {{id: number}} option The chosen register option.
		 * @return {Promise<void>}
		 */
		async onSelectRegister(option) {
			this.selectedRegisterId = option ? option.id : null
			await this.loadSchemas()
		},
		/**
		 * Human-readable property count for a schema.
		 * @param {object} schema The schema object.
		 * @return {string} A localised "{n} properties" label.
		 */
		propertyCount(schema) {
			const props = (schema && schema.properties && typeof schema.properties === 'object') ? Object.keys(schema.properties) : []
			return t('nextcloud-vue', '{count} properties', { count: props.length })
		},
		/** Open the editor to create a new schema. */
		openCreate() {
			this.editingSchema = null
			this.showSchemaDialog = true
		},
		/**
		 * Open the editor for an existing schema.
		 * @param {object} schema The schema to edit.
		 * @return {void}
		 */
		openEdit(schema) {
			this.editingSchema = schema
			this.showSchemaDialog = true
		},
		/**
		 * Persist a schema from the editor: PUT when editing, else POST + link
		 * the new schema id onto the register.
		 * @param {object} schema The schema payload from CnSchemaFormDialog.
		 * @return {Promise<void>}
		 */
		async onSchemaConfirm(schema) {
			this.busy = true
			this.error = ''
			try {
				if (this.editingSchema && this.editingSchema.id) {
					await axios.put(
						generateUrl(`/apps/openregister/api/schemas/${this.editingSchema.id}`),
						schema,
						{ headers: this.headers() },
					)
				} else {
					const { data } = await axios.post(
						generateUrl('/apps/openregister/api/schemas'),
						schema,
						{ headers: this.headers() },
					)
					const created = unwrap(data)
					if (created && created.id) await this.linkSchema(created.id)
				}
				this.showSchemaDialog = false
				invalidateDataCache()
				await this.loadSchemas()
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to save the schema.')
			} finally {
				this.busy = false
			}
		},
		/** Delete the schema currently open in the editor (editor Delete button). */
		async onSchemaDelete() {
			if (this.editingSchema) {
				this.showSchemaDialog = false
				await this.removeSchema(this.editingSchema)
			}
		},
		/**
		 * Append a schema id to the selected register's schemas list.
		 * @param {number} schemaId The new schema id.
		 * @return {Promise<void>}
		 */
		async linkSchema(schemaId) {
			const reg = this.selectedRegister
			if (!reg) return
			const ids = Array.isArray(reg.schemas) ? [...reg.schemas] : []
			if (!ids.includes(schemaId)) ids.push(schemaId)
			await axios.patch(
				generateUrl(`/apps/openregister/api/registers/${reg.id}`),
				{ schemas: ids },
				{ headers: this.headers() },
			)
			reg.schemas = ids
		},
		/**
		 * Remove a schema: unlink it from the register, then delete it.
		 * @param {object} schema The schema to remove.
		 * @return {Promise<void>}
		 */
		async removeSchema(schema) {
			if (!schema || !schema.id) return
			this.busy = true
			this.error = ''
			try {
				const reg = this.selectedRegister
				if (reg && Array.isArray(reg.schemas)) {
					const ids = reg.schemas.filter((id) => id !== schema.id)
					await axios.patch(
						generateUrl(`/apps/openregister/api/registers/${reg.id}`),
						{ schemas: ids },
						{ headers: this.headers() },
					)
					reg.schemas = ids
				}
				await axios.delete(generateUrl(`/apps/openregister/api/schemas/${schema.id}`), { headers: this.headers() })
				invalidateDataCache()
				await this.loadSchemas()
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to remove the schema.')
			} finally {
				this.busy = false
			}
		},
		/**
		 * Create a register for this app and select it.
		 * @return {Promise<void>}
		 */
		async createRegister() {
			const title = this.newRegisterTitle.trim()
			if (!title) return
			this.busy = true
			this.error = ''
			try {
				const body = { title, schemas: [] }
				// Adopt the slug the manifest already points at, when one is set
				// but the register doesn't exist yet — so existing pages resolve.
				if (this.manifestRegisterSlugs.length === 1) {
					body.slug = this.manifestRegisterSlugs[0]
				}
				const { data } = await axios.post(
					generateUrl('/apps/openregister/api/registers'),
					body,
					{ headers: this.headers() },
				)
				const created = unwrap(data)
				if (created && created.id) {
					invalidateDataCache()
					this.registers = [created]
					this.selectedRegisterId = created.id
					this.schemas = []
					// Surface the new register in the shared data-source map so the
					// page-config Register picker can select it without a reload.
					const ds = this.cnDataSources
					if (ds && Array.isArray(ds.registers) && created.slug && !ds.registers.some((r) => r.value === created.slug)) {
						ds.registers.push({ value: created.slug, label: created.title || created.slug, schemas: [] })
					}
				}
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to create the register.')
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-edit-data {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 280px;
}

.cn-edit-data__title {
	margin: 0;
}

.cn-edit-data__subtitle {
	margin: 0;
	font-size: 1em;
	font-weight: 600;
}

.cn-edit-data__loading {
	margin: 40px auto;
}

.cn-edit-data__error {
	color: var(--color-error);
	padding: 8px 12px;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius);
}

.cn-edit-data__empty {
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: flex-start;
}

.cn-edit-data__register-name {
	color: var(--color-text-maxcontrast);
}

.cn-edit-data__schemas {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-edit-data__schemas-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.cn-edit-data__hint {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-edit-data__list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-edit-data__row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.cn-edit-data__schema-name {
	display: flex;
	flex-direction: column;
}

.cn-edit-data__schema-meta {
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-edit-data__row-actions {
	display: flex;
	gap: 4px;
}

.cn-edit-data__footer {
	display: flex;
	justify-content: flex-end;
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
	margin-top: auto;
}
</style>

<!-- Global (un-scoped): NcModal and NcDialog both render a `.modal-mask` at
     z-index 9998. NcModal's own scoped rule `.modal-mask[data-v-…]{z-index:9998}`
     has the SAME specificity as a plain `.modal-mask.dialog__modal` selector, so a
     non-important override loses the tie to whichever stylesheet loads last and the
     nested schema editor (an NcDialog) paints *under* this data modal. Force it with
     `!important` and clear headroom so a modal-launched NcDialog always sits on top. -->
<style>
.modal-mask.dialog__modal {
	z-index: 10005 !important;
}
</style>
