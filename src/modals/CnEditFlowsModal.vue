<!--
  CnEditFlowsModal — author simple "flows" (declarative business logic) on the
  app's OpenRegister schemas, no code.

  Opened from the OpenBuild edit menu ("Edit flows…"). A flow lives on a schema
  under `configuration['x-openregister-flows']` (ADR-031 declarative behaviour):
  it declares a trigger (object created / updated / deleted) and a list of
  actions. This modal reads the register slug(s) the manifest's pages point at,
  loads the matching OpenRegister schemas, and lets the user pick a schema and
  build its flows with a form — pick a trigger, add Calendar-event and Email
  actions, fill in their fields (with `{{ field }}` placeholders).

  Persistence talks straight to the OpenRegister REST API: PATCH
  /api/schemas/{id} with the merged `configuration`. The runtime's
  FlowActionService reads the same `x-openregister-flows` at object-lifecycle
  time. Isolated NcModal per ADR-004.

  SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcModal size="large" :name="t('nextcloud-vue', 'Edit flows')" @close="$emit('close')">
		<div class="cn-edit-flows">
			<h2 class="cn-edit-flows__title">
				{{ t('nextcloud-vue', 'Edit flows') }}
			</h2>
			<p class="cn-edit-flows__intro">
				{{ t('nextcloud-vue', 'Flows run simple business logic when an object is created, updated or deleted — declared on a schema, no code. For example: when a pet is created, add a vet inspection to the calendar and email the vet.') }}
			</p>

			<div v-if="loading" class="cn-edit-flows__center">
				<NcLoadingIcon :size="32" />
			</div>
			<NcNoteCard v-else-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<NcNoteCard v-else-if="!schemas.length" type="warning">
				{{ t('nextcloud-vue', 'This app has no schemas yet. Add data first (Edit data…), then attach flows to a schema.') }}
			</NcNoteCard>

			<template v-else>
				<!-- Schema picker: flows are attached per schema. -->
				<div class="cn-edit-flows__schema">
					<NcSelect :value="selectedSchemaOption"
						:options="schemaOptions"
						:input-label="t('nextcloud-vue', 'Schema')"
						:clearable="false"
						@input="onSelectSchema" />
				</div>

				<template v-if="selectedSchema">
					<NcEmptyContent v-if="!flows.length"
						:name="t('nextcloud-vue', 'No flows yet')"
						:description="t('nextcloud-vue', 'Add a flow to run actions when this object changes.')">
						<template #icon>
							<Sitemap :size="20" />
						</template>
					</NcEmptyContent>

					<div v-for="(flow, fi) in flows" :key="fi" class="cn-edit-flows__flow">
						<div class="cn-edit-flows__flow-head">
							<NcTextField class="cn-edit-flows__grow"
								:value="flow.name"
								:label="t('nextcloud-vue', 'Flow name')"
								@update:value="(v) => $set(flow, 'name', v)" />
							<NcButton type="tertiary"
								:aria-label="t('nextcloud-vue', 'Remove flow')"
								:title="t('nextcloud-vue', 'Remove flow')"
								@click="removeFlow(fi)">
								<template #icon>
									<Delete :size="20" />
								</template>
							</NcButton>
						</div>

						<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'When') }}</label>
						<NcSelect :value="triggerOption(flow.trigger)"
							:options="triggerOptions"
							:clearable="false"
							:input-label="t('nextcloud-vue', 'Trigger')"
							@input="(o) => $set(flow, 'trigger', o ? o.id : 'created')" />

						<div v-for="(action, ai) in flow.actions" :key="ai" class="cn-edit-flows__action">
							<div class="cn-edit-flows__action-head">
								<NcSelect class="cn-edit-flows__grow"
									:value="actionTypeOption(action.type)"
									:options="actionTypeOptions"
									:clearable="false"
									:input-label="t('nextcloud-vue', 'Action')"
									@input="(o) => setActionType(action, o)" />
								<NcButton type="tertiary"
									:aria-label="t('nextcloud-vue', 'Remove action')"
									:title="t('nextcloud-vue', 'Remove action')"
									@click="removeAction(flow, ai)">
									<template #icon>
										<Delete :size="20" />
									</template>
								</NcButton>
							</div>

							<!-- Calendar-event fields -->
							<template v-if="isCalendar(action.type)">
								<NcTextField :value="action.summary"
									:label="t('nextcloud-vue', 'Event title')"
									@update:value="(v) => $set(action, 'summary', v)" />
								<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'Description') }}</label>
								<textarea class="cn-edit-flows__textarea"
									:value="action.description"
									rows="2"
									@input="(e) => $set(action, 'description', e.target.value)" />
								<NcTextField :value="action.location"
									:label="t('nextcloud-vue', 'Location')"
									@update:value="(v) => $set(action, 'location', v)" />
								<div class="cn-edit-flows__row">
									<NcTextField type="number"
										:value="String(action.offsetDays != null ? action.offsetDays : 1)"
										:label="t('nextcloud-vue', 'Days from now')"
										@update:value="(v) => $set(action, 'offsetDays', v)" />
									<NcTextField type="number"
										:value="String(action.durationMinutes != null ? action.durationMinutes : 30)"
										:label="t('nextcloud-vue', 'Duration (minutes)')"
										@update:value="(v) => $set(action, 'durationMinutes', v)" />
								</div>
							</template>

							<!-- Email fields -->
							<template v-else-if="isEmail(action.type)">
								<NcTextField :value="action.to"
									:label="t('nextcloud-vue', 'Send to (email)')"
									@update:value="(v) => $set(action, 'to', v)" />
								<NcTextField :value="action.subject"
									:label="t('nextcloud-vue', 'Subject')"
									@update:value="(v) => $set(action, 'subject', v)" />
								<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'Message') }}</label>
								<textarea class="cn-edit-flows__textarea"
									:value="action.body"
									rows="3"
									@input="(e) => $set(action, 'body', e.target.value)" />
							</template>
						</div>

						<NcButton type="secondary" @click="addAction(flow)">
							<template #icon>
								<Plus :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Add action') }}
						</NcButton>
					</div>

					<div class="cn-edit-flows__actions-bar">
						<NcButton type="secondary" @click="addFlow">
							<template #icon>
								<Plus :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Add flow') }}
						</NcButton>
					</div>

					<p class="cn-edit-flows__hint">
						{{ t('nextcloud-vue', 'Tip: insert a value from the object with double braces, e.g.') }}
						<code>{{ placeholderExample }}</code>.
						<span v-if="schemaFieldHint">{{ schemaFieldHint }}</span>
					</p>

					<div class="cn-edit-flows__footer">
						<NcButton type="primary" :disabled="busy" @click="save">
							<template #icon>
								<NcLoadingIcon v-if="busy" :size="20" />
								<ContentSave v-else :size="20" />
							</template>
							{{ t('nextcloud-vue', 'Save flows') }}
						</NcButton>
					</div>
				</template>
			</template>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcLoadingIcon, NcNoteCard, NcEmptyContent } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
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

/**
 * CnEditFlowsModal — form-based editor for a schema's `x-openregister-flows`
 * (see file header). Internal to the OpenBuild edit menu; not part of the public
 * barrel (mirrors CnEditDataModal).
 */
export default {
	name: 'CnEditFlowsModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcLoadingIcon, NcNoteCard, NcEmptyContent, Plus, Delete, ContentSave, Sitemap },

	props: {
		/**
		 * The app manifest (working or live). Its `pages[].config.register`
		 * slugs identify which OpenRegister register(s) — and therefore which
		 * schemas — this app's flows can be attached to.
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
			// Resolved schema objects across the app's register(s).
			schemas: [],
			selectedSchemaId: null,
			// Working copy of the selected schema's flows (deep-cloned on select).
			flows: [],
			// Shown literally in the placeholder hint.
			placeholderExample: '{{ name }}',
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
		/** NcSelect options for the schema picker. */
		schemaOptions() {
			return this.schemas.map((s) => ({ id: s.id, label: s.title || s.slug || String(s.id) }))
		},
		/** The selected schema object. */
		selectedSchema() {
			return this.schemas.find((s) => s.id === this.selectedSchemaId) || null
		},
		/** The selected schema as an NcSelect option. */
		selectedSchemaOption() {
			const s = this.selectedSchema
			return s ? { id: s.id, label: s.title || s.slug || String(s.id) } : null
		},
		/** Trigger options. */
		triggerOptions() {
			return [
				{ id: 'created', label: t('nextcloud-vue', 'An object is created') },
				{ id: 'updated', label: t('nextcloud-vue', 'An object is updated') },
				{ id: 'deleted', label: t('nextcloud-vue', 'An object is deleted') },
			]
		},
		/** Action-type options (mirror FlowActionService's supported types). */
		actionTypeOptions() {
			return [
				{ id: 'calendar-event', label: t('nextcloud-vue', 'Add a calendar event') },
				{ id: 'email', label: t('nextcloud-vue', 'Send an email') },
			]
		},
		/** A hint listing the selected schema's field names usable as placeholders. */
		schemaFieldHint() {
			const props = (this.selectedSchema && this.selectedSchema.properties && typeof this.selectedSchema.properties === 'object')
				? Object.keys(this.selectedSchema.properties)
				: []
			if (!props.length) return ''
			return t('nextcloud-vue', 'Available fields: {fields}', { fields: props.slice(0, 12).join(', ') })
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
		 * Load the app's register(s) and resolve their schemas.
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				const { data } = await axios.get(generateUrl('/apps/openregister/api/registers') + '?_limit=1000', { headers: this.headers() })
				const all = unwrap(data) || []
				const list = Array.isArray(all) ? all : []
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
				if (this.schemas.length) {
					this.selectSchema(this.schemas[0].id)
				}
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to load schemas.')
			} finally {
				this.loading = false
			}
		},
		/**
		 * Select a schema and load a deep copy of its flows for editing.
		 * @param {number} id The schema id.
		 * @return {void}
		 */
		selectSchema(id) {
			this.selectedSchemaId = id
			const cfg = (this.selectedSchema && this.selectedSchema.configuration) || {}
			let raw = cfg['x-openregister-flows']
			if (!Array.isArray(raw)) raw = raw && typeof raw === 'object' ? [raw] : []
			this.flows = JSON.parse(JSON.stringify(raw)).map((f) => ({
				name: f.name || 'flow',
				trigger: f.trigger || 'created',
				actions: Array.isArray(f.actions) ? f.actions : [],
			}))
		},
		/**
		 * Handle the schema picker.
		 * @param {{id: number}} option The chosen option.
		 * @return {void}
		 */
		onSelectSchema(option) {
			if (option && option.id != null) this.selectSchema(option.id)
		},
		/**
		 * Map a trigger id to its option.
		 * @param {string} id The trigger id.
		 * @return {object} The matching option.
		 */
		triggerOption(id) {
			return this.triggerOptions.find((o) => o.id === (id || 'created')) || this.triggerOptions[0]
		},
		/**
		 * Map an action-type id to its option.
		 * @param {string} type The action type.
		 * @return {object} The matching option.
		 */
		actionTypeOption(type) {
			return this.actionTypeOptions.find((o) => o.id === this.normaliseType(type)) || this.actionTypeOptions[0]
		},
		/**
		 * Normalise action-type aliases (agenda-task→calendar-event, mail→email).
		 * @param {string} type The raw type.
		 * @return {string} The canonical type.
		 */
		normaliseType(type) {
			if (type === 'agenda-task') return 'calendar-event'
			if (type === 'mail') return 'email'
			return type || 'calendar-event'
		},
		/**
		 * Whether an action is a calendar event.
		 * @param {string} type The action type.
		 * @return {boolean} True for calendar-event/agenda-task.
		 */
		isCalendar(type) {
			return this.normaliseType(type) === 'calendar-event'
		},
		/**
		 * Whether an action is an email.
		 * @param {string} type The action type.
		 * @return {boolean} True for email/mail.
		 */
		isEmail(type) {
			return this.normaliseType(type) === 'email'
		},
		/**
		 * Change an action's type, seeding sensible default fields.
		 * @param {object} action The action to mutate.
		 * @param {{id: string}} option The chosen type option.
		 * @return {void}
		 */
		setActionType(action, option) {
			const type = option ? option.id : 'calendar-event'
			this.$set(action, 'type', type)
		},
		/** Append a new flow. */
		addFlow() {
			this.flows.push({
				name: t('nextcloud-vue', 'New flow'),
				trigger: 'created',
				actions: [this.newAction()],
			})
		},
		/**
		 * Remove a flow.
		 * @param {number} index The flow index.
		 * @return {void}
		 */
		removeFlow(index) {
			this.flows.splice(index, 1)
		},
		/**
		 * Build a default calendar-event action.
		 * @return {object} A new action.
		 */
		newAction() {
			return { type: 'calendar-event', summary: '', description: '', location: '', offsetDays: 1, durationMinutes: 30 }
		},
		/**
		 * Append an action to a flow.
		 * @param {object} flow The flow.
		 * @return {void}
		 */
		addAction(flow) {
			if (!Array.isArray(flow.actions)) this.$set(flow, 'actions', [])
			flow.actions.push(this.newAction())
		},
		/**
		 * Remove an action from a flow.
		 * @param {object} flow The flow.
		 * @param {number} index The action index.
		 * @return {void}
		 */
		removeAction(flow, index) {
			flow.actions.splice(index, 1)
		},
		/**
		 * Serialise the working flows into clean `x-openregister-flows` config
		 * (coercing numeric fields, dropping empty actions).
		 * @return {Array<object>} The cleaned flows.
		 */
		cleanFlows() {
			return this.flows.map((f) => {
				const actions = (Array.isArray(f.actions) ? f.actions : []).map((a) => {
					const type = this.normaliseType(a.type)
					if (type === 'calendar-event') {
						return {
							type: 'calendar-event',
							summary: a.summary || '',
							description: a.description || '',
							location: a.location || '',
							offsetDays: Number(a.offsetDays) || 0,
							durationMinutes: Number(a.durationMinutes) || 30,
						}
					}
					return { type: 'email', to: a.to || '', subject: a.subject || '', body: a.body || '' }
				})
				return { name: f.name || 'flow', trigger: f.trigger || 'created', actions }
			})
		},
		/**
		 * Persist the flows onto the selected schema's configuration via PATCH.
		 * @return {Promise<void>}
		 */
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
				// Reflect the saved config locally so re-selecting shows the new state.
				this.$set(schema, 'configuration', configuration)
				/**
				 * @event saved Emitted after flows are persisted to a schema.
				 * @type {{ schemaId: number, flows: Array<object> }}
				 */
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
.cn-edit-flows {
	padding: 20px;
	max-height: 80vh;
	overflow-y: auto;
}

.cn-edit-flows__title {
	margin: 0 0 8px;
}

.cn-edit-flows__intro {
	color: var(--color-text-maxcontrast);
	margin-bottom: 16px;
}

.cn-edit-flows__center {
	display: flex;
	justify-content: center;
	padding: 40px 0;
}

.cn-edit-flows__schema {
	margin-bottom: 16px;
}

.cn-edit-flows__flow {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 16px;
	margin-bottom: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-flows__flow-head,
.cn-edit-flows__action-head {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}

.cn-edit-flows__grow {
	flex: 1 1 auto;
}

.cn-edit-flows__action {
	border-inline-start: 3px solid var(--color-primary-element);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	padding: 12px;
	margin-top: 4px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-flows__row {
	display: flex;
	gap: 8px;
}

.cn-edit-flows__row > * {
	flex: 1 1 0;
}

.cn-edit-flows__field-label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-edit-flows__textarea {
	width: 100%;
	border-radius: var(--border-radius);
	border: 2px solid var(--color-border-maxcontrast);
	background: var(--color-main-background);
	color: var(--color-main-text);
	padding: 8px;
	font-family: inherit;
	resize: vertical;
}

.cn-edit-flows__actions-bar {
	margin-bottom: 12px;
}

.cn-edit-flows__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 8px 0 16px;
}

.cn-edit-flows__footer {
	display: flex;
	justify-content: flex-end;
}
</style>
