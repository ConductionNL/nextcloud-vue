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
  PATCH /api/registers/{id} to (un)link a schema. Isolated NcDialog per ADR-004.
-->
<template>
	<NcDialog size="large" :name="t('nextcloud-vue', 'Manage data')" @closing="$emit('close')">
		<div class="cn-edit-data">
			<NcLoadingIcon v-if="loading" :size="32" class="cn-edit-data__loading" />

			<div v-else-if="error" class="cn-edit-data__error">
				{{ error }}
			</div>

			<!--
				The server refused the delete because objects still use this schema.
				Offer the cascade — but confirm first: it permanently deletes the data.
			-->
			<div v-else-if="pendingCascade" class="cn-edit-data__confirm">
				<p class="cn-edit-data__confirm-lead">
					{{ cascadeWarning }}
				</p>
				<p class="cn-edit-data__confirm-note">
					{{ t('nextcloud-vue', 'Deleting the objects cannot be undone.') }}
				</p>
				<div class="cn-edit-data__confirm-actions">
					<NcButton type="tertiary" :disabled="busy" @click="cancelCascade">
						{{ t('nextcloud-vue', 'Cancel') }}
					</NcButton>
					<NcButton type="error" :disabled="busy" @click="confirmCascade">
						{{ cascadeConfirmLabel }}
					</NcButton>
				</div>
			</div>

			<!--
				The server classified the schema edit as BREAKING and refused it until it
				is acknowledged. Show the user exactly WHICH changes it objected to, then
				let them re-save with the acknowledgement — without this the edit is
				simply impossible from the UI.
			-->
			<div v-else-if="pendingBreaking" class="cn-edit-data__confirm cn-edit-data__confirm--breaking">
				<p class="cn-edit-data__confirm-lead">
					{{ t('nextcloud-vue', 'This change breaks the existing data model:') }}
				</p>
				<ul class="cn-edit-data__breaking-list">
					<li v-for="(change, i) in breakingChanges" :key="`bc-${i}`">
						{{ describeBreakingChange(change) }}
					</li>
				</ul>
				<p class="cn-edit-data__confirm-note">
					{{ t('nextcloud-vue', 'Objects already stored under this schema may no longer match it. Save anyway?') }}
				</p>
				<div class="cn-edit-data__confirm-actions">
					<NcButton type="tertiary" :disabled="busy" @click="cancelBreaking">
						{{ t('nextcloud-vue', 'Back to editing') }}
					</NcButton>
					<NcButton type="warning" :disabled="busy" @click="confirmBreaking">
						{{ t('nextcloud-vue', 'Save anyway') }}
					</NcButton>
				</div>
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
				<!-- Register selector (usually a single register) + inline rename. -->
				<div class="cn-edit-data__register">
					<template v-if="renamingRegister">
						<NcTextField class="cn-edit-data__register-rename"
							:value="renameTitle"
							:label="t('nextcloud-vue', 'Register name')"
							:disabled="busy"
							@update:value="(v) => renameTitle = v"
							@keydown.native.enter="renameRegister"
							@keydown.native.esc="renamingRegister = false" />
						<NcButton type="primary"
							:disabled="busy || !renameTitle.trim()"
							:aria-label="t('nextcloud-vue', 'Save register name')"
							@click="renameRegister">
							<template #icon>
								<NcLoadingIcon v-if="busy" :size="20" />
								<Check v-else :size="20" />
							</template>
						</NcButton>
						<NcButton type="tertiary"
							:disabled="busy"
							:aria-label="t('nextcloud-vue', 'Cancel rename')"
							@click="renamingRegister = false">
							<template #icon>
								<Close :size="20" />
							</template>
						</NcButton>
					</template>
					<template v-else>
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
						<NcButton v-if="selectedRegister"
							type="tertiary"
							:disabled="busy"
							:aria-label="t('nextcloud-vue', 'Rename register')"
							@click="startRename">
							<template #icon>
								<Pencil :size="20" />
							</template>
						</NcButton>
					</template>
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
		</div>

		<!-- Reuse the full OpenRegister schema editor for add/edit. It renders its
		     own dialog, teleported to <body>. `cn-dialog--nested` lifts it ABOVE the
		     dialog that opened it (see the global rule below) — without it the two
		     tie on z-index and the winner is decided by DOM order, which for
		     teleported dialogs is a race this loses about half the time. -->
		<CnSchemaFormDialog
			v-if="showSchemaDialog"
			class="cn-dialog--nested"
			:item="editingSchema"
			:dialog-title="editingSchema ? t('nextcloud-vue', 'Edit schema') : t('nextcloud-vue', 'New schema')"
			:available-registers="registerOptions"
			:available-schemas="schemas"
			:show-delete="!!editingSchema"
			@confirm="onSchemaConfirm"
			@delete-schema="onSchemaDelete"
			@close="showSchemaDialog = false" />

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ t('nextcloud-vue', 'Close') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcTextField, NcSelect, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import Check from 'vue-material-design-icons/Check.vue'
import Close from 'vue-material-design-icons/Close.vue'
import CnSchemaFormDialog from '../components/CnSchemaFormDialog/CnSchemaFormDialog.vue'
import { buildHeaders } from '../utils/headers.js'
import { parseAxiosError } from '../utils/errors.js'

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

/**
 * Drop all cached registers + schemas (call after any write). Exported so tests
 * can reset the process-lifetime cache between cases for isolation.
 */
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

	components: { NcDialog, NcButton, NcTextField, NcSelect, NcLoadingIcon, CnSchemaFormDialog, Plus, Pencil, Delete, Check, Close },

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
			// Set when a schema delete was refused because objects still use it:
			// `{ schema, objectCount }`. Drives the cascade confirmation — the
			// destructive "delete the objects too" path is never a single click.
			pendingCascade: null,
			// Set when a schema SAVE was refused as a breaking change:
			// `{ schema, changes }`. Drives the breaking-change confirmation, which
			// re-saves with `acknowledgeBreaking` — the only way the edit can land.
			pendingBreaking: null,
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
			// Inline register rename.
			renamingRegister: false,
			renameTitle: '',
		}
	},

	computed: {
		/**
		 * Why the delete was refused, naming the schema and its object count.
		 *
		 * Nextcloud's l10n substitutes `%n` for the plural count and `{named}`
		 * placeholders from a vars OBJECT — it has no printf `%s`. Passing `%s`
		 * with an array leaves the literal "%s" on screen.
		 */
		cascadeWarning() {
			const p = this.pendingCascade
			if (!p) return ''
			const name = (p.schema && (p.schema.title || p.schema.slug)) || ''
			return n(
				'nextcloud-vue',
				'“{name}” still has %n object. Delete the schema and its object?',
				'“{name}” still has %n objects. Delete the schema and its objects?',
				p.objectCount,
				{ name },
			)
		},
		/** Label for the destructive confirm button, carrying the count. */
		cascadeConfirmLabel() {
			const count = (this.pendingCascade && this.pendingCascade.objectCount) || 0
			return n(
				'nextcloud-vue',
				'Delete schema and %n object',
				'Delete schema and %n objects',
				count,
			)
		},
		/** The changes the server flagged as breaking, for the confirmation list. */
		breakingChanges() {
			return (this.pendingBreaking && this.pendingBreaking.changes) || []
		},
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
				this.error = parseAxiosError(e).message || t('nextcloud-vue', 'Failed to load data registers.')
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
			this.renamingRegister = false
			await this.loadSchemas()
		},
		/** Open the inline rename field pre-filled with the current title. */
		startRename() {
			const reg = this.selectedRegister
			if (!reg) return
			this.renameTitle = reg.title || reg.slug || ''
			this.renamingRegister = true
		},
		/**
		 * Persist the new register title (PATCH — the slug and schema links are
		 * untouched, so manifest pages keep resolving) and mirror it into the
		 * shared data-source map so pickers show the new name without a reload.
		 * @return {Promise<void>}
		 */
		async renameRegister() {
			const reg = this.selectedRegister
			const title = this.renameTitle.trim()
			if (!reg || !title) return
			if (title === (reg.title || '')) {
				this.renamingRegister = false
				return
			}
			this.busy = true
			this.error = ''
			try {
				await axios.patch(
					generateUrl(`/apps/openregister/api/registers/${reg.id}`),
					{ title },
					{ headers: this.headers() },
				)
				reg.title = title
				invalidateDataCache()
				const ds = this.cnDataSources
				if (ds && Array.isArray(ds.registers)) {
					const dsReg = ds.registers.find((r) => r.value === reg.slug)
					if (dsReg) this.$set(dsReg, 'label', title)
				}
				this.renamingRegister = false
			} catch (e) {
				this.error = parseAxiosError(e).message || t('nextcloud-vue', 'Failed to rename the register.')
			} finally {
				this.busy = false
			}
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
		 *
		 * OpenRegister refuses some edits (e.g. a property going from `string` to
		 * `object` when it becomes a related object) with 409 + `classification:
		 * "breaking"` unless the request acknowledges it. Never acknowledge on the
		 * user's behalf — surface what the server objected to and let them decide.
		 *
		 * @param {object} schema The schema payload from CnSchemaFormDialog.
		 * @param {boolean} [acknowledgeBreaking] Re-send accepting the breaking change.
		 * @return {Promise<void>}
		 */
		async onSchemaConfirm(schema, acknowledgeBreaking = false) {
			this.busy = true
			this.error = ''
			try {
				if (this.editingSchema && this.editingSchema.id) {
					const url = generateUrl(`/apps/openregister/api/schemas/${this.editingSchema.id}`)
						+ (acknowledgeBreaking ? '?acknowledgeBreaking=true' : '')
					await axios.put(url, schema, { headers: this.headers() })
				} else {
					const { data } = await axios.post(
						generateUrl('/apps/openregister/api/schemas'),
						schema,
						{ headers: this.headers() },
					)
					const created = unwrap(data)
					if (created && created.id) await this.linkSchema(created.id)
				}
				this.pendingBreaking = null
				this.showSchemaDialog = false
				invalidateDataCache()
				await this.loadSchemas()
			} catch (e) {
				const { status, data } = parseAxiosError(e)
				const isBreaking = status === 409 && data && data.classification === 'breaking'

				if (isBreaking && !acknowledgeBreaking) {
					// Offer the acknowledgement instead of a dead end. Hide the editor so
					// the confirmation is not painted underneath it (nested dialogs sit on
					// a higher layer); `cancelBreaking` puts the user straight back into it
					// with their edits intact.
					this.pendingBreaking = { schema, changes: Array.isArray(data.changes) ? data.changes : [] }
					this.showSchemaDialog = false
					this.error = ''
				} else if (isBreaking) {
					// The server still calls it breaking even though we acknowledged it, so
					// acknowledging again would just re-open the same prompt forever. Stop.
					this.pendingBreaking = null
					this.error = t('nextcloud-vue', 'The server rejected the change even with the breaking-change acknowledgement.')
				} else {
					this.pendingBreaking = null
					this.error = parseAxiosError(e).message || t('nextcloud-vue', 'Failed to save the schema.')
				}
			} finally {
				this.busy = false
			}
		},
		/**
		 * Re-save the pending schema, this time acknowledging the breaking change.
		 *
		 * @return {Promise<void>}
		 */
		async confirmBreaking() {
			const pending = this.pendingBreaking
			if (!pending) return
			await this.onSchemaConfirm(pending.schema, true)
		},
		/**
		 * Abandon the acknowledgement and drop the user back into the editor with the
		 * edits they made — cancelling must not throw their work away.
		 */
		cancelBreaking() {
			this.pendingBreaking = null
			this.showSchemaDialog = true
		},
		/**
		 * Human-readable line for one entry of the server's `changes[]`, e.g.
		 * `{property: 'barn', kind: 'type_changed', old: 'string', new: 'object'}`
		 * → "barn: type changed from string to object".
		 *
		 * @param {object} change One change descriptor from the 409 body.
		 * @return {string} The description.
		 */
		describeBreakingChange(change) {
			if (!change || typeof change !== 'object') return ''
			const property = change.property || t('nextcloud-vue', 'schema')
			const kind = String(change.kind || '').replace(/_/g, ' ')
			const fmt = (v) => (v === null || v === undefined
				? t('nextcloud-vue', 'none')
				: (typeof v === 'object' ? JSON.stringify(v) : String(v)))

			if (change.old === undefined && change.new === undefined) {
				return `${property}: ${kind}`
			}
			return t('nextcloud-vue', '{property}: {kind} (from {old} to {new})', {
				property,
				kind,
				old: fmt(change.old),
				new: fmt(change.new),
			})
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
		 * Delete a schema, then unlink it from the register.
		 *
		 * ORDER IS LOAD-BEARING. This used to unlink first and delete second, so a
		 * REFUSED delete (409 — the schema still has objects) left the schema alive
		 * but detached from its register: it vanished from the pages editor while
		 * its data sat there untouched. Deleting first means a refusal changes
		 * nothing at all.
		 *
		 * When the schema still has objects the server refuses with 409
		 * `schema-has-objects` + an `objectCount`; we surface that and offer the
		 * cascade rather than echoing an HTTP status at the user.
		 *
		 * @param {object} schema The schema to remove.
		 * @param {boolean} deleteObjects Also hard-delete the schema's objects (cascade).
		 * @return {Promise<void>}
		 */
		async removeSchema(schema, deleteObjects = false) {
			if (!schema || !schema.id) return
			this.busy = true
			this.error = ''
			try {
				const url = generateUrl(`/apps/openregister/api/schemas/${schema.id}`)
					+ (deleteObjects ? '?deleteObjects=true' : '')
				await axios.delete(url, { headers: this.headers() })

				// Only now that the schema is really gone is it safe to unlink it.
				const reg = this.selectedRegister
				if (reg && Array.isArray(reg.schemas) && reg.schemas.includes(schema.id)) {
					const ids = reg.schemas.filter((id) => id !== schema.id)
					await axios.patch(
						generateUrl(`/apps/openregister/api/registers/${reg.id}`),
						{ schemas: ids },
						{ headers: this.headers() },
					)
					reg.schemas = ids
				}

				this.pendingCascade = null
				invalidateDataCache()
				await this.loadSchemas()
			} catch (e) {
				const { code, message, data } = parseAxiosError(e)

				// Only offer the cascade for a PLAIN delete. If the CASCADE itself came
				// back "still has objects", re-prompting would put the same confirmation
				// straight back on screen and the user would loop forever, confirming a
				// destructive action that never lands. That happens for real: an
				// OpenRegister too old to know `?deleteObjects=true` ignores the flag and
				// answers 409 exactly as before. Report it instead.
				if (code === 'schema-has-objects' && !deleteObjects) {
					// Confirm-gated: this permanently deletes the objects, never one click.
					const count = (data && Number(data.objectCount)) || 0
					this.pendingCascade = { schema, objectCount: count }
					this.error = ''
				} else if (code === 'schema-has-objects') {
					this.pendingCascade = null
					this.error = t('nextcloud-vue', 'Could not delete the schema and its objects. The server still reports objects attached — it may not support deleting them along with the schema.')
				} else {
					this.pendingCascade = null
					this.error = message || t('nextcloud-vue', 'Failed to remove the schema.')
				}
			} finally {
				this.busy = false
			}
		},
		/**
		 * Run the cascade the user just confirmed: delete the schema AND its objects.
		 * @return {Promise<void>}
		 */
		async confirmCascade() {
			const pending = this.pendingCascade
			if (!pending) return
			this.pendingCascade = null
			await this.removeSchema(pending.schema, true)
		},
		/** Back out of the cascade confirmation, changing nothing. */
		cancelCascade() {
			this.pendingCascade = null
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
				this.error = parseAxiosError(e).message || t('nextcloud-vue', 'Failed to create the register.')
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
/* NcDialog supplies the padding and the heading (via `name`); this div keeps only
   the body's own column layout. */
.cn-edit-data {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 280px;
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

.cn-edit-data__confirm {
	padding: 12px;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius);
}

.cn-edit-data__confirm-lead {
	font-weight: bold;
	margin-bottom: 4px;
}

/* The breaking-change confirmation is a warning, not a destruction. */
.cn-edit-data__confirm--breaking {
	border-inline-start: 4px solid var(--color-warning, var(--color-primary));
}

.cn-edit-data__breaking-list {
	margin: 0 0 8px;
	padding-inline-start: 20px;
	list-style: disc;
}

.cn-edit-data__breaking-list li {
	color: var(--color-text-maxcontrast);
	font-family: var(--font-face-monospace, monospace);
	font-size: 90%;
}

.cn-edit-data__confirm-note {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-edit-data__confirm-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.cn-edit-data__empty {
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: flex-start;
}

.cn-edit-data__register {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-edit-data__register-name {
	color: var(--color-text-maxcontrast);
}

.cn-edit-data__register-rename {
	max-width: 360px;
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

</style>

<!--
  Global (un-scoped). Every NcDialog renders a `.modal-mask` at z-index 9998, so a
  dialog and any dialog it opens land on the SAME layer.

  Raising them both to one shared value does NOT fix that: equal z-index means the
  painting order falls back to DOM order, and NcDialog teleports its mask to <body>,
  so which mask is inserted first is a mount-timing race. Observed live: the nested
  schema editor was at DOM index 641 and the "Manage data" dialog that opened it at
  1143 — so the PARENT painted over its own child. On a different run the order was
  reversed and it looked fine, which is why this kept coming back.

  Give the nested dialog a strictly HIGHER layer instead, so the stacking no longer
  depends on insertion order. Any dialog opened from inside another dialog should
  carry `cn-dialog--nested`.
-->
<style>
.modal-mask.dialog__modal {
	z-index: 10005 !important;
}

.modal-mask.cn-dialog--nested {
	z-index: 10010 !important;
}
</style>
