<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-api-reference" data-testid="cn-api-reference">
		<p v-if="family === 'unknown'" class="cn-api-reference__notice" role="alert">
			{{ t('nextcloud-vue', 'This is not an OpenAPI document.') }}
		</p>
		<template v-else>
			<header class="cn-api-reference__header">
				<h2 class="cn-api-reference__title">
					{{ info.title || t('nextcloud-vue', 'API reference') }}
					<small v-if="info.version" class="cn-api-reference__version">{{ info.version }}</small>
				</h2>
				<p v-if="info.description" class="cn-api-reference__description">
					{{ info.description }}
				</p>
				<ul v-if="servers.length" class="cn-api-reference__servers">
					<li v-for="server in servers" :key="server.url">
						<code>{{ server.url }}</code>
						<NcButton
							variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Copy {url}', { url: server.url })"
							@click="copy(server.url)">
							{{ t('nextcloud-vue', 'Copy') }}
						</NcButton>
					</li>
				</ul>
				<ul v-if="security.length" class="cn-api-reference__security">
					<li v-for="line in security" :key="line">
						{{ line }}
					</li>
				</ul>
				<p v-if="externalDocsHref" class="cn-api-reference__docs">
					<a :href="externalDocsHref" rel="noopener noreferrer" target="_blank">{{ info.externalDocs.description || externalDocsHref }}</a>
				</p>
				<!-- @slot intro Extra lines under the header (for example how to sign in). -->
				<slot name="intro" />
				<NcButton
					v-if="downloadable"
					data-testid="cn-api-reference-download"
					@click="download">
					{{ t('nextcloud-vue', 'Download OpenAPI file') }}
				</NcButton>
			</header>

			<p v-if="family === 'swagger2'" class="cn-api-reference__notice" role="note">
				{{ t('nextcloud-vue', 'This file is Swagger 2.0. Only OpenAPI 3 is shown here.') }}
			</p>
			<template v-else>
				<div class="cn-api-reference__filter">
					<NcTextField
						v-model="query"
						:label="t('nextcloud-vue', 'Filter calls')"
						data-testid="cn-api-reference-filter" />
					<p class="cn-api-reference__status" aria-live="polite" data-testid="cn-api-reference-status">
						{{ statusText }}
					</p>
				</div>

				<section v-for="group in groups" :key="group.tag" class="cn-api-reference__group">
					<h3 class="cn-api-reference__tag">
						{{ group.tag }}
					</h3>
					<CnApiOperation
						v-for="op in group.operations"
						:key="op.id"
						:op="op"
						:document="document"
						:open="isOpen(op.id)"
						@toggle="toggle(op.id)" />
				</section>

				<section v-if="models.length" class="cn-api-reference__models">
					<h3 class="cn-api-reference__tag">
						{{ t('nextcloud-vue', 'Models') }}
					</h3>
					<details v-for="model in models" :key="model.name" class="cn-api-reference__model">
						<summary>{{ model.name }}</summary>
						<CnApiSchema :node="model.node" :caption="model.name" />
					</details>
				</section>
			</template>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField } from '@nextcloud/vue'
import CnApiOperation from './CnApiOperation.vue'
import CnApiSchema from './CnApiSchema.vue'
import { describeSchema, describeSecuritySchemes, detectOpenApiVersion, filterOperations, groupByTag, listOperations } from '../../utils/openApiModel.js'
import { safeHref } from '../../utils/safeHref.js'
import { triggerBlobDownload } from '../CnIndexPage/selfModeIO.js'

/**
 * CnApiReference — shows an OpenAPI 3 document inside the Nextcloud page.
 *
 * The host fetches the document (with its own session, from its own instance)
 * and hands it in; the component makes no request. It renders the title,
 * version and servers, the calls grouped by their first tag (untagged under
 * "Other"), per call the parameters, request body and responses, and the models.
 * Only `#/` references resolve; an external one reads "External reference, not
 * loaded", a cycle "See above". Descriptions render as plain text and links pass
 * `safeHref`. A filter narrows the calls, and "Download OpenAPI file" saves the
 * document as shown. Every call is a keyboard-operable disclosure button.
 *
 * ```vue
 * <CnApiReference :document="oas" download-name="vergunningen-1.4.0" />
 * ```
 */
export default {
	name: 'CnApiReference',

	components: { CnApiOperation, CnApiSchema, NcButton, NcTextField },

	props: {
		/**
		 * The parsed OpenAPI 3 document. The only required prop.
		 *
		 * @type {object}
		 */
		document: {
			type: Object,
			required: true,
		},

		/** File name stem for the download (`<name>.openapi.json`); defaults to `<title>-<version>`. */
		downloadName: {
			type: String,
			default: '',
		},

		/** Show the "Download OpenAPI file" button. */
		downloadable: {
			type: Boolean,
			default: true,
		},
	},

	data() {
		return {
			query: '',
			openIds: {},
		}
	},

	computed: {
		family() {
			return detectOpenApiVersion(this.document)
		},

		info() {
			return (this.document && this.document.info) || {}
		},

		servers() {
			return Array.isArray(this.document && this.document.servers) ? this.document.servers.filter((s) => s && s.url) : []
		},

		security() {
			return describeSecuritySchemes(this.document)
		},

		externalDocsHref() {
			const url = this.document && this.document.externalDocs && this.document.externalDocs.url
			const safe = safeHref(url)
			return safe === '#' ? '' : safe
		},

		allOperations() {
			return this.family === 'swagger2' || this.family === 'unknown' ? [] : listOperations(this.document)
		},

		shownOperations() {
			return filterOperations(this.allOperations, this.query)
		},

		groups() {
			return groupByTag(this.shownOperations, t('nextcloud-vue', 'Other'))
		},

		statusText() {
			if (this.shownOperations.length === 0) {
				return t('nextcloud-vue', 'No call matches this filter.')
			}
			return t('nextcloud-vue', '{shown} of {total} calls', { shown: this.shownOperations.length, total: this.allOperations.length })
		},

		models() {
			const schemas = this.document && this.document.components && this.document.components.schemas
			if (!schemas || typeof schemas !== 'object') {
				return []
			}
			return Object.entries(schemas).map(([name, schema]) => ({ name, node: describeSchema(this.document, schema) }))
		},
	},

	methods: {
		t,

		/**
		 * Whether a call is open.
		 *
		 * @param {string} id The call id.
		 * @return {boolean} True when open.
		 */
		isOpen(id) {
			return this.openIds[id] === true
		},

		/**
		 * Open or close a call.
		 *
		 * @param {string} id The call id.
		 */
		toggle(id) {
			this.openIds = { ...this.openIds, [id]: !this.openIds[id] }
		},

		/**
		 * Copy a server address.
		 *
		 * @param {string} text The text to copy.
		 */
		copy(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text)
			}
		},

		/** Save the document as shown, built in the browser. */
		download() {
			const stem = this.downloadName || `${this.info.title || 'api'}-${this.info.version || ''}`.replace(/-$/, '').replace(/\s+/g, '-')
			const blob = new Blob([JSON.stringify(this.document, null, 2)], { type: 'application/json' })
			triggerBlobDownload(blob, `${stem}.openapi.json`)
		},
	},
}
</script>

<style>
.cn-api-reference__header {
	margin-bottom: 16px;
}

.cn-api-reference__title {
	margin: 0 0 4px;
}

.cn-api-reference__version {
	color: var(--color-text-maxcontrast);
	font-weight: 400;
	margin-inline-start: 8px;
}

.cn-api-reference__servers,
.cn-api-reference__security {
	list-style: none;
	margin: 8px 0;
	padding: 0;
}

.cn-api-reference__notice {
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
}

.cn-api-reference__status {
	margin: 4px 0 12px;
	color: var(--color-text-maxcontrast);
}

.cn-api-reference__tag {
	margin: 16px 0 4px;
}

.cn-api-reference__model {
	margin: 4px 0;
}

.cn-api-schema__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
}

.cn-api-schema__table th,
.cn-api-schema__table td {
	padding: 4px 8px;
	text-align: start;
	vertical-align: top;
	border-bottom: 1px solid var(--color-border);
}

.cn-api-schema__caption {
	text-align: start;
	font-weight: 600;
	padding: 4px 0;
}
</style>
