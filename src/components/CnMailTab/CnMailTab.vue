<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-mail-tab" data-testid="cn-mail-tab">
		<CnEmptyContent
			v-if="unavailable"
			:name="t('nextcloud-vue', 'Mail is not available')"
			:description="t('nextcloud-vue', 'Install Nextcloud Mail to draft and link mail here.')">
			<template #icon>
				<EmailOffOutline :size="48" />
			</template>
		</CnEmptyContent>

		<template v-else>
			<h3 v-if="heading" class="cn-mail-tab__title">
				{{ heading }}
			</h3>
			<p v-if="description" class="cn-mail-tab__subtitle">
				{{ description }}
			</p>

			<div v-if="draftEnabled" class="cn-mail-tab__template-row" data-testid="cn-mail-tab-template-row">
				<NcSelect
					v-if="templatesEnabled"
					v-model="selectedTemplate"
					class="cn-mail-tab__template-select"
					:options="templates"
					:disabled="templates.length === 0"
					:inputLabel="t('nextcloud-vue', 'Email template')"
					:label="templateLabelField"
					:trackBy="templateIdField"
					:placeholder="templatePlaceholder"
					:clearable="true" />
				<NcButton
					v-if="templatesEnabled"
					:disabled="closed || drafting || !selectedTemplate"
					data-testid="cn-mail-tab-draft-template"
					@click="draftFromTemplate">
					{{ t('nextcloud-vue', 'Open draft from template') }}
				</NcButton>
				<NcButton
					:disabled="closed || drafting"
					data-testid="cn-mail-tab-draft-blank"
					@click="draftBlank">
					{{ t('nextcloud-vue', 'Empty draft') }}
				</NcButton>
			</div>
			<p v-if="hint" class="cn-mail-tab__hint">
				{{ hint }}
			</p>

			<NcNoteCard
				v-if="error"
				type="error"
				:heading="t('nextcloud-vue', 'Could not open draft')"
				role="alert">
				{{ error }}
			</NcNoteCard>
			<NcNoteCard
				v-if="unresolved.length > 0"
				type="warning"
				role="status"
				data-testid="cn-mail-tab-unresolved">
				<p>{{ t('nextcloud-vue', 'Some template fields could not be filled. Fill these in the draft yourself:') }}</p>
				<ul class="cn-mail-tab__unresolved">
					<li v-for="name in unresolved" :key="name">
						<code>{{ placeholderOf(name) }}</code>
					</li>
				</ul>
			</NcNoteCard>

			<CnEmailTab
				v-if="linkedMail && objectKey"
				class="cn-mail-tab__linked"
				:objectId="objectKey"
				:register="registerKey"
				:schema="schemaKey" />
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcNoteCard, NcSelect } from '@nextcloud/vue'
import EmailOffOutline from 'vue-material-design-icons/EmailOffOutline.vue'
import CnEmailTab from '../../integrations/builtin/email/CnEmailTab.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import { fetchEndpointSource, interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'

/**
 * Read a reference that may be a slug, an id or an object carrying either.
 *
 * @param {string|number|object} value The reference.
 * @return {string} The slug or id, or ''.
 */
function keyOf(value) {
	if (value === null || value === undefined) {
		return ''
	}
	if (typeof value === 'object') {
		return String(value.slug || value.id || value.uuid || '')
	}
	return String(value)
}

/**
 * CnMailTab — the mail of one record: drafts in Nextcloud Mail, from a
 * template or empty, above the mail linked to the record.
 *
 * Registered as the `mail` widget type. The app owns the endpoints and the
 * texts; the tab never sends mail. A draft is a POST to `draft.url`, whose
 * response may carry `draftUrl` (opened in a new tab) and `unresolved` (the
 * template fields the server could not fill). A 404 there means the app has
 * no Mail to draft into, and the tab says so instead of the controls.
 *
 * ```json
 * {
 *   "type": "mail",
 *   "content": {
 *     "heading": "Email",
 *     "description": "Mail linked to this case",
 *     "hint": "The draft opens in Nextcloud Mail.",
 *     "templates": { "url": "/apps/app/api/types/@object.type/templates", "responsePath": "results", "labelField": "name", "idField": "id" },
 *     "noTemplatesText": "No templates for this type yet",
 *     "draft": { "url": "/apps/app/api/records/@objectId/templates/{templateId}/draft", "blankTemplateId": "blank" },
 *     "closedWhen": { "field": "endDate", "op": "notEmpty" },
 *     "linkedMail": true
 *   }
 * }
 * ```
 *
 * URLs take the `@objectId` / `@object.<field>` tokens of `endpointSource`;
 * `{templateId}` in the draft URL is the chosen template's id, or
 * `blankTemplateId` for an empty draft. Without `templates` the row offers
 * the empty draft only; without `draft` there is no row. `closedWhen` is a
 * local visibleWhen condition on the record that disables drafting.
 * `linkedMail: false` leaves the linked mail to a separate `email`
 * integration card. Texts go through the host's translate.
 */
export default {
	name: 'CnMailTab',

	components: {
		CnEmailTab,
		CnEmptyContent,
		EmailOffOutline,
		NcButton,
		NcNoteCard,
		NcSelect,
	},

	inject: {
		/** The detail page's object context (`{ objectId, object }`), for tokens. */
		cnObjectContext: { default: null },
		/** The host's translate, for the manifest texts. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget config: `{ heading?, description?, hint?, templates?,
		 * noTemplatesText?, draft?, closedWhen?, linkedMail? }`, as in the
		 * component description and docs/components/cn-mail-tab.md.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The bound record's id, for `@objectId` and the linked mail. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The bound record, for `@object.<field>` and `closedWhen`. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The bound record's register, for the linked mail. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** The bound record's schema, for the linked mail. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	emits: ['drafted'],

	data() {
		return {
			templates: [],
			selectedTemplate: null,
			drafting: false,
			error: '',
			unresolved: [],
			unavailable: false,
		}
	},

	computed: {
		/** @return {object} The record, from the prop or the page context. */
		record() {
			if (this.objectData) {
				return this.objectData
			}
			const ctx = this.cnObjectContext
			const value = ctx && typeof ctx === 'object' && 'value' in ctx ? ctx.value : ctx
			return (value && value.object) || {}
		},

		/** @return {string} The record id. */
		objectKey() {
			return keyOf(this.objectId) || keyOf(this.record.id) || keyOf(this.record['@self'] && this.record['@self'].id)
		},

		/** @return {string} The register slug or id. */
		registerKey() {
			return keyOf(this.register)
		},

		/** @return {string} The schema slug or id. */
		schemaKey() {
			return keyOf(this.schema)
		},

		/** @return {object} The token context for the URLs. */
		tokenContext() {
			return { objectId: this.objectKey, object: this.record }
		},

		/** @return {string} The heading, translated, or ''. */
		heading() {
			return this.tr(this.content.heading)
		},

		/** @return {string} The line under the heading, translated, or ''. */
		description() {
			return this.tr(this.content.description)
		},

		/** @return {string} The line under the template row, translated, or ''. */
		hint() {
			return this.tr(this.content.hint)
		},

		/** @return {object|null} The templates endpoint, or null. */
		templatesSource() {
			const source = this.content.templates
			return source && typeof source === 'object' && source.url ? source : null
		},

		/** @return {object|null} The draft endpoint, or null. */
		draftSource() {
			const source = this.content.draft
			return source && typeof source === 'object' && source.url ? source : null
		},

		/** @return {boolean} Whether the template select and its button show. */
		templatesEnabled() {
			return this.templatesSource !== null
		},

		/** @return {boolean} Whether the template row shows. */
		draftEnabled() {
			return this.draftSource !== null
		},

		/** @return {string} The template field shown in the select. */
		templateLabelField() {
			return (this.templatesSource && this.templatesSource.labelField) || 'name'
		},

		/** @return {string} The template field that identifies it. */
		templateIdField() {
			return (this.templatesSource && this.templatesSource.idField) || 'id'
		},

		/** @return {string} The select's placeholder. */
		templatePlaceholder() {
			if (this.templates.length === 0) {
				return this.tr(this.content.noTemplatesText) || t('nextcloud-vue', 'No templates yet')
			}
			return t('nextcloud-vue', 'Select a template (optional)…')
		},

		/** @return {boolean} Whether `closedWhen` holds for the record. */
		closed() {
			const cond = this.content.closedWhen
			if (!cond) {
				return false
			}
			return evaluateVisibleWhenLocal(cond, this.record)
		},

		/** @return {string} The templates URL after tokens, to refetch on change. */
		templatesUrl() {
			return this.templatesSource ? interpolateUrlTokens(this.templatesSource.url, this.tokenContext) : ''
		},

		/** @return {boolean} Whether the linked mail list shows. */
		linkedMail() {
			return this.content.linkedMail !== false
		},
	},

	watch: {
		templatesUrl: {
			immediate: true,
			handler() {
				this.loadTemplates()
			},
		},
	},

	methods: {
		t,

		/**
		 * Translate a manifest text through the host.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation, or '' for no text.
		 */
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return this.cnTranslate(text)
		},

		/**
		 * Read the templates. A failed read leaves the empty draft usable.
		 *
		 * @return {Promise<void>}
		 */
		async loadTemplates() {
			if (!this.templatesSource) {
				this.templates = []
				return
			}
			try {
				const payload = await fetchEndpointSource(this.templatesSource, this.tokenContext)
				const list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.results) ? payload.results : [])
				this.templates = list
			} catch (err) {
				// eslint-disable-next-line no-console
				console.warn('[CnMailTab] could not read the templates', err)
				this.templates = []
			}
		},

		/** @return {Promise<void>} */
		draftFromTemplate() {
			return this.openDraft(this.selectedTemplate)
		},

		/** @return {Promise<void>} */
		draftBlank() {
			this.selectedTemplate = null
			return this.openDraft(null)
		},

		/**
		 * Ask the app to create a Nextcloud Mail draft and open it.
		 *
		 * @param {object|null} template The chosen template, or null for an empty draft.
		 * @return {Promise<void>}
		 */
		async openDraft(template) {
			if (this.closed || !this.draftSource) {
				return
			}
			this.drafting = true
			this.error = ''
			this.unresolved = []
			try {
				const id = template ? template[this.templateIdField] : (this.draftSource.blankTemplateId || 'blank')
				const path = interpolateUrlTokens(this.draftSource.url, this.tokenContext)
					.replace('{templateId}', encodeURIComponent(String(id)))
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const { data } = await axios.post(generateUrl(path), {})
				this.unresolved = Array.isArray(data && data.unresolved) ? data.unresolved : []
				if (data && data.draftUrl) {
					window.open(data.draftUrl, '_blank', 'noopener')
				}
				this.$emit('drafted', data)
			} catch (err) {
				const response = err && err.response
				if (response && response.status === 404) {
					this.unavailable = true
				}
				this.error = (response && response.data && response.data.message)
					|| (err && err.message)
					|| t('nextcloud-vue', 'The draft could not be opened.')
			} finally {
				this.drafting = false
			}
		},

		/**
		 * Write a template field the way the template spells it.
		 *
		 * @param {string} name The field name.
		 * @return {string} `{{name}}`.
		 */
		placeholderOf(name) {
			return `{{${name}}}`
		},
	},
}
</script>

<style scoped>
.cn-mail-tab {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 12px;
}

.cn-mail-tab__title {
	margin: 0;
	font-size: 16px;
	font-weight: bold;
}

.cn-mail-tab__subtitle,
.cn-mail-tab__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-mail-tab__template-row {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
}

.cn-mail-tab__template-select {
	flex: 1 1 260px;
}

.cn-mail-tab__unresolved {
	margin: 4px 0 0;
	padding-inline-start: 20px;
}

.cn-mail-tab__unresolved code {
	background: var(--color-background-dark);
	padding: 2px 6px;
	border-radius: var(--border-radius);
	font-family: var(--font-face-mono, monospace);
}
</style>
