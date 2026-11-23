<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-api-schema">
		<p v-if="node.external" class="cn-api-schema__note">
			{{ t('nextcloud-vue', 'External reference, not loaded') }} ({{ node.refName }})
		</p>
		<p v-else-if="node.cycle" class="cn-api-schema__note">
			{{ t('nextcloud-vue', 'See above') }} ({{ node.refName }})
		</p>
		<template v-else>
			<p v-if="shown.fields.length === 0" class="cn-api-schema__type">
				<code>{{ node.type || node.refName || '—' }}</code>
				<span v-if="node.enumValues.length" class="cn-api-schema__rules">
					{{ t('nextcloud-vue', 'one of') }} {{ node.enumValues.join(', ') }}
				</span>
				<span v-if="node.rules.length" class="cn-api-schema__rules">{{ node.rules.join(', ') }}</span>
				<span v-if="node.description" class="cn-api-schema__description">{{ node.description }}</span>
			</p>
			<table v-if="shown.fields.length > 0" class="cn-api-schema__table">
				<caption class="cn-api-schema__caption">
					{{ caption || shown.refName || node.refName || t('nextcloud-vue', 'Fields') }}
				</caption>
				<thead>
					<tr>
						<th scope="col">
							{{ t('nextcloud-vue', 'Field') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Type') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Required') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Rules') }}
						</th>
						<th scope="col">
							{{ t('nextcloud-vue', 'Description') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="field in shown.fields" :key="field.name">
						<th scope="row">
							{{ field.name }}
						</th>
						<td>
							<template v-if="field.node.external || field.node.cycle || field.node.fields.length || (field.node.items && field.node.items.fields.length)">
								<CnApiSchema :node="field.node.items && !field.node.fields.length ? field.node.items : field.node" :caption="field.name" />
							</template>
							<code v-else>{{ field.node.type || field.node.refName }}</code>
						</td>
						<td>{{ field.required ? t('nextcloud-vue', 'yes') : t('nextcloud-vue', 'no') }}</td>
						<td>
							{{ ruleText(field.node) }}
						</td>
						<td>{{ field.node.description }}</td>
					</tr>
				</tbody>
			</table>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnApiSchema — one OpenAPI schema as a table of fields (name, type,
 * required, rules, description). A nested object opens in place; an external
 * reference and a cycle are shown as a sentence. Every string is rendered as
 * text. Internal to `CnApiReference`.
 */
export default {
	name: 'CnApiSchema',

	props: {
		/**
		 * The schema tree from `describeSchema`.
		 *
		 * @type {object}
		 */
		node: {
			type: Object,
			required: true,
		},

		/** The table caption (a field or model name). */
		caption: {
			type: String,
			default: '',
		},
	},

	computed: {
		/** The node whose fields the table lists: an array shows its items' fields. */
		shown() {
			if (this.node.fields.length === 0 && this.node.items && this.node.items.fields.length > 0) {
				return this.node.items
			}
			return this.node
		},
	},

	methods: {
		t,

		/**
		 * The rules and enum of a field, as one line.
		 *
		 * @param {object} node The field's schema node.
		 * @return {string} The text.
		 */
		ruleText(node) {
			const parts = [...node.rules]
			if (node.enumValues.length) {
				parts.unshift(`${t('nextcloud-vue', 'one of')} ${node.enumValues.join(', ')}`)
			}
			return parts.join('; ')
		},
	},
}
</script>

<style scoped>
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

.cn-api-schema__note,
.cn-api-schema__rules,
.cn-api-schema__description {
	color: var(--color-text-maxcontrast);
	margin: 0;
}

.cn-api-schema__rules,
.cn-api-schema__description {
	margin-inline-start: 8px;
}
</style>
