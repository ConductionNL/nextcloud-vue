<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-api-operation">
		<h4 class="cn-api-operation__heading">
			<button
				type="button"
				class="cn-api-operation__toggle"
				:aria-expanded="open ? 'true' : 'false'"
				:aria-controls="bodyId"
				@click="$emit('toggle')">
				<span class="cn-api-operation__method">{{ op.method }}</span>
				<span class="cn-api-operation__path">{{ op.path }}</span>
				<span v-if="op.summary" class="cn-api-operation__summary">{{ op.summary }}</span>
			</button>
		</h4>
		<!-- The body is built only once the call is opened. -->
		<div v-if="open" :id="bodyId" class="cn-api-operation__body">
			<p v-if="op.operation.description" class="cn-api-operation__description">
				{{ op.operation.description }}
			</p>
			<table v-if="parameters.length" class="cn-api-schema__table">
				<caption class="cn-api-schema__caption">
					{{ t('nextcloud-vue', 'Parameters') }}
				</caption>
				<thead>
					<tr>
						<th scope="col">
							{{ t('nextcloud-vue', 'Name') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'In') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Required') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Type') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Description') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="p in parameters" :key="p.in + p.name">
						<th scope="row">
							{{ p.name }}
						</th>
						<td>{{ p.in }}</td>
						<td>{{ p.required ? t('nextcloud-vue', 'yes') : t('nextcloud-vue', 'no') }}</td>
						<td><code>{{ p.type }}</code></td>
						<td>{{ p.description }}</td>
					</tr>
				</tbody>
			</table>
			<div v-if="requestBody" class="cn-api-operation__section">
				<h5>{{ t('nextcloud-vue', 'Request body') }} <small>{{ requestBody.mediaType }}</small></h5>
				<CnApiSchema :node="requestBody.node" :caption="t('nextcloud-vue', 'Request body fields')" />
			</div>
			<div v-for="r in responses" :key="r.status" class="cn-api-operation__section">
				<h5>{{ t('nextcloud-vue', 'Response') }} {{ r.status }} <small>{{ r.description }}</small></h5>
				<CnApiSchema v-if="r.node" :node="r.node" :caption="`${t('nextcloud-vue', 'Response')} ${r.status}`" />
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnApiSchema from './CnApiSchema.vue'
import { describeSchema, firstContentSchema, resolveLocalRef } from '../../utils/openApiModel.js'

/**
 * CnApiOperation — one call of an OpenAPI document: a disclosure button
 * (method, path, summary) and, once opened, its parameters, request body and
 * responses. Internal to `CnApiReference`.
 */
export default {
	name: 'CnApiOperation',

	components: { CnApiSchema },

	props: {
		/**
		 * The call from `listOperations`.
		 *
		 * @type {object}
		 */
		op: {
			type: Object,
			required: true,
		},

		/**
		 * The whole document, for local `$ref`.
		 *
		 * @type {object}
		 */
		document: {
			type: Object,
			required: true,
		},

		/** Whether the call is open. */
		open: {
			type: Boolean,
			default: false,
		},
	},

	emits: [
		/**
		 * The reader opened or closed the call.
		 *
		 * @event toggle
		 */
		'toggle',
	],

	computed: {
		bodyId() {
			return `cn-api-op-${this.op.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
		},

		parameters() {
			const list = [...(this.op.pathItem.parameters || []), ...(this.op.operation.parameters || [])]
			return list.map((raw) => {
				const p = typeof raw.$ref === 'string' ? (resolveLocalRef(this.document, raw.$ref).value || {}) : raw
				const node = describeSchema(this.document, p.schema)
				return { name: p.name || '', in: p.in || '', required: p.required === true, type: node.type || node.refName, description: String(p.description || '') }
			})
		},

		requestBody() {
			const found = firstContentSchema(this.op.operation.requestBody && this.op.operation.requestBody.content)
			return found ? { mediaType: found.mediaType, node: describeSchema(this.document, found.schema) } : null
		},

		responses() {
			const responses = this.op.operation.responses || {}
			return Object.entries(responses).map(([status, raw]) => {
				const r = raw && typeof raw.$ref === 'string' ? (resolveLocalRef(this.document, raw.$ref).value || {}) : (raw || {})
				const found = firstContentSchema(r.content)
				return { status, description: String(r.description || ''), node: found ? describeSchema(this.document, found.schema) : null }
			})
		},
	},

	methods: { t },
}
</script>

<style scoped>
.cn-api-operation__heading {
	margin: 0;
	font-size: inherit;
}

.cn-api-operation__toggle {
	display: flex;
	width: 100%;
	gap: 12px;
	align-items: baseline;
	padding: 6px 8px;
	text-align: start;
	background: transparent;
	border: 0;
	border-bottom: 1px solid var(--color-border);
	cursor: pointer;
}

.cn-api-operation__toggle:hover {
	background: var(--color-background-hover);
}

.cn-api-operation__method {
	min-width: 64px;
	padding: 0 6px;
	border: 2px solid var(--color-primary-element);
	border-radius: var(--border-radius, 4px);
	color: var(--color-main-text);
	font-weight: 700;
	font-size: 12px;
	text-align: center;
}

.cn-api-operation__path {
	font-family: monospace;
}

.cn-api-operation__summary {
	color: var(--color-text-maxcontrast);
}

.cn-api-operation__body {
	padding: 8px 12px 16px;
}

.cn-api-operation__description {
	white-space: pre-line;
}

.cn-api-operation__section h5 {
	margin: 12px 0 4px;
}
</style>
