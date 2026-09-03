<!--
  - SPDX-License-Identifier: EUPL-1.2
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  -
  - CnContactmomentCard — contact moments recorded against one object.
  -
  - A contactmoment is a logged interaction with a person: a phone call, a
  - counter visit, an email. pipelinq owns them; this surfaces the ones
  - attached to whatever object the surrounding page is showing, so a case
  - handler can see the conversation history without leaving the case.
  -
  - Reads pipelinq's aggregation endpoint rather than the objects API, because
  - that endpoint already applies the per-object owner access policy and
  - resolves the link field for the entity type.
-->
<template>
	<component :is="wrapper" v-bind="wrapperProps">
		<div class="cn-contactmoment-card" data-testid="cn-contactmoment-card">
			<div v-if="loading" class="cn-contactmoment-card__state">
				<NcLoadingIcon :size="20" />
				<span>{{ loadingLabel }}</span>
			</div>

			<div v-else-if="error" class="cn-contactmoment-card__state cn-contactmoment-card__state--error">
				{{ errorLabel }}
			</div>

			<div v-else-if="!items.length" class="cn-contactmoment-card__state">
				{{ emptyLabel }}
			</div>

			<ul v-else class="cn-contactmoment-card__list">
				<li
					v-for="item in items"
					:key="item.id"
					class="cn-contactmoment-card__item">
					<div class="cn-contactmoment-card__head">
						<span class="cn-contactmoment-card__subject">{{ item.subject || unknownLabel }}</span>
						<span v-if="item.channel" class="cn-contactmoment-card__channel">{{ item.channel }}</span>
					</div>
					<div v-if="item.summary" class="cn-contactmoment-card__summary">{{ item.summary }}</div>
					<div class="cn-contactmoment-card__meta">
						<span v-if="item.agent">{{ item.agent }}</span>
						<span v-if="item.timestamp">{{ formatWhen(item.timestamp) }}</span>
					</div>
				</li>
			</ul>

			<div v-if="total > items.length" class="cn-contactmoment-card__more">
				{{ moreLabel }}
			</div>
		</div>
	</component>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import PhoneOutline from 'vue-material-design-icons/PhoneOutline.vue'
import CnDetailCard from '../../../components/CnDetailCard/CnDetailCard.vue'

export default {
	name: 'CnContactmomentCard',

	components: { NcLoadingIcon, CnDetailCard },

	props: {
		/** The object whose contact moments are shown. */
		objectId: { type: String, required: true },
		/**
		 * The entity type pipelinq keys its link field on, such as
		 * `dossiq:case`. Defaults to the surrounding schema when not given.
		 */
		entityType: { type: String, default: '' },
		/** OpenRegister schema slug of the surrounding object. */
		schema: { type: String, default: '' },
		/** Rendering surface, forwarded by the registry (AD-19). */
		surface: { type: String, default: 'detail-page' },
		/** How many interactions to show before the "more" line. */
		limit: { type: Number, default: 5 },
		/**
		 * Render without the surrounding CnDetailCard, for a surface that
		 * already supplies the card and the title.
		 */
		chromeless: { type: Boolean, default: false },

		// --- Pre-translated labels ---
		titleLabel: { type: String, default: () => t('nextcloud-vue', 'Contact moments') },
		loadingLabel: { type: String, default: () => t('nextcloud-vue', 'Loading contact moments') },
		emptyLabel: { type: String, default: () => t('nextcloud-vue', 'No contact moments recorded yet') },
		errorLabel: { type: String, default: () => t('nextcloud-vue', 'Could not load contact moments') },
		unknownLabel: { type: String, default: () => t('nextcloud-vue', 'Untitled interaction') },
	},

	data() {
		return { items: [], total: 0, loading: false, error: false }
	},

	computed: {
		/** The card wrapper, or a plain div when rendering chromeless. */
		wrapper() {
			return this.chromeless ? 'div' : CnDetailCard
		},

		/** Card props, omitted entirely when there is no card to configure. */
		wrapperProps() {
			return this.chromeless ? {} : { title: this.titleLabel, icon: PhoneOutline }
		},

		/** The entity type to query, falling back to the surrounding schema. */
		resolvedEntityType() {
			return this.entityType || this.schema || ''
		},

		/** Line shown when more interactions exist than are displayed. */
		moreLabel() {
			return t('nextcloud-vue', '{count} more', { count: this.total - this.items.length })
		},
	},

	watch: {
		objectId: 'load',
		resolvedEntityType: 'load',
	},

	mounted() {
		this.load()
	},

	methods: {
		/**
		 * Load this object's contact moments from pipelinq.
		 *
		 * @return {Promise<void>} Resolves once state reflects the response.
		 */
		async load() {
			if (!this.objectId || !this.resolvedEntityType) {
				this.items = []
				this.total = 0
				return
			}
			this.loading = true
			this.error = false
			try {
				const url = `/apps/pipelinq/api/activity/${encodeURIComponent(this.resolvedEntityType)}/${encodeURIComponent(this.objectId)}`
					+ `?type=contactmomenten&_limit=${encodeURIComponent(this.limit)}`
				const res = await fetch(url, { headers: { Accept: 'application/json' } })
				if (!res.ok) throw new Error(String(res.status))
				const body = await res.json()
				this.items = Array.isArray(body.results) ? body.results : []
				this.total = Number(body.total) || this.items.length
			} catch (e) {
				// pipelinq absent, or the object is not visible to this user.
				// Either way the card says so rather than rendering an empty
				// list, which would read as "no interactions" when the truth is
				// "we could not ask".
				this.error = true
				this.items = []
				this.total = 0
			} finally {
				this.loading = false
			}
		},

		/**
		 * Format an interaction timestamp for display.
		 *
		 * @param {string} value ISO-8601 timestamp.
		 * @return {string} A locale date-time, or the raw value if unparseable.
		 */
		formatWhen(value) {
			const d = new Date(value)
			return isNaN(d.getTime()) ? value : d.toLocaleString()
		},
	},
}
</script>

<style scoped>
.cn-contactmoment-card__list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-contactmoment-card__item {
	border-left: 3px solid var(--color-primary-element);
	background: var(--color-background-hover);
	border-radius: 0 var(--border-radius) var(--border-radius) 0;
	padding: 8px 12px;
}

.cn-contactmoment-card__head {
	display: flex;
	justify-content: space-between;
	gap: 8px;
}

.cn-contactmoment-card__subject {
	font-weight: 500;
}

.cn-contactmoment-card__channel,
.cn-contactmoment-card__meta {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-contactmoment-card__meta {
	display: flex;
	gap: 12px;
	margin-top: 4px;
}

.cn-contactmoment-card__summary {
	margin-top: 2px;
	word-break: break-word;
}

.cn-contactmoment-card__state {
	align-items: center;
	color: var(--color-text-maxcontrast);
	display: flex;
	gap: 8px;
	padding: 8px 0;
}

.cn-contactmoment-card__state--error {
	color: var(--color-error);
}

.cn-contactmoment-card__more {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin-top: 8px;
}
</style>
