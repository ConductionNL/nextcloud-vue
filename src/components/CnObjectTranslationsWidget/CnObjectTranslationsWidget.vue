<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnObjectTranslationsWidget — an object's translatable properties in every
  language its register serves: one completeness chip per language (a stale
  value counts as missing), a language tab strip, the source language read-only,
  a stale mark per field, and one save that writes each edited property as a
  whole language map. It translates nothing itself.
-->
<template>
	<div class="cn-object-translations" data-testid="cn-object-translations">
		<NcLoadingIcon v-if="loading" :size="24" />

		<p v-else-if="error" class="cn-object-translations__empty" role="alert">
			{{ t('nextcloud-vue', 'The translations could not be read. Reload the page to try again.') }}
		</p>

		<p v-else-if="propertiesShown.length === 0"
			class="cn-object-translations__empty"
			data-testid="cn-object-translations-none">
			{{ emptyText || t('nextcloud-vue', 'This item has no labels that can be translated.') }}
		</p>

		<template v-else>
			<ul class="cn-object-translations__chips" data-testid="cn-object-translations-chips">
				<li v-for="chip in chips"
					:key="chip.language"
					class="cn-object-translations__chip cn-status-badge cn-status-badge--default"
					:class="{ 'cn-object-translations__chip--complete': chip.complete }"
					:data-language="chip.language">
					<span class="cn-object-translations__chip-name">{{ chip.name }}</span>
					<span class="cn-object-translations__chip-count">{{ chip.count }}</span>
				</li>
			</ul>

			<p class="cn-object-translations__source">
				{{ sourceNote }}
			</p>

			<div class="cn-object-translations__tabs"
				role="tablist"
				:aria-label="t('nextcloud-vue', 'Languages')"
				@keydown="onTabKeydown">
				<NcButton v-for="language in languages"
					:id="tabId(language)"
					:key="language"
					:variant="language === activeLanguage ? 'primary' : 'tertiary'"
					role="tab"
					:aria-selected="String(language === activeLanguage)"
					:aria-controls="panelId"
					:tabindex="language === activeLanguage ? 0 : -1"
					:data-language="language"
					@click="activeLanguage = language">
					{{ nameOf(language) }}
				</NcButton>
			</div>

			<div :id="panelId"
				role="tabpanel"
				class="cn-object-translations__panel"
				:aria-labelledby="tabId(activeLanguage)">
				<div v-for="property in propertiesShown"
					:key="property"
					class="cn-object-translations__field"
					:data-property="property">
					<NcTextField :label="labelOf(property)"
						:modelValue="draftOf(property)"
						:disabled="activeLanguage === sourceLanguage"
						@update:modelValue="setDraft(property, $event)" />

					<span v-if="isStale(property)"
						class="cn-object-translations__stale"
						:data-property="property">
						{{ t('nextcloud-vue', 'Out of date') }}
					</span>
				</div>

				<NcButton variant="primary"
					:disabled="saving || !hasEdits"
					data-testid="cn-object-translations-save"
					@click="save">
					{{ t('nextcloud-vue', 'Save') }}
				</NcButton>
			</div>
		</template>
	</div>
</template>

<script>
import { showError, showSuccess } from '@nextcloud/dialogs'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { getLanguage, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcTextField } from '@nextcloud/vue'
import {
	completenessOf,
	DEFAULT_API_BASE,
	objectWithTranslations,
	registerLanguages,
	saveTranslatedProperty,
	schemaProperties,
	STATUS_OUTDATED,
	translationRows,
} from '../../utils/objectTranslations.js'

const PAGE_REFRESH = 'cn:page:refresh'

let instanceCount = 0

export default {
	name: 'CnObjectTranslationsWidget',

	components: { NcButton, NcLoadingIcon, NcTextField },

	props: {
		/** Register slug or id (detail-context merge). */
		register: { type: String, default: '' },
		/** Schema slug, or the schema object the detail-context merge supplies. */
		schema: { type: [String, Object], default: '' },
		/** The object id (detail-context merge). Falls back to the route's `id`. */
		objectId: { type: String, default: '' },
		/** OpenRegister API root. */
		apiBase: { type: String, default: DEFAULT_API_BASE },
		/** Optional whitelist of properties to offer; empty offers every translatable one. */
		properties: { type: Array, default: () => [] },
		/** Text when nothing is translatable; empty uses the translated default. */
		emptyText: { type: String, default: '' },
		/** Stored widget content blob; its keys are read as the props above. */
		content: { type: Object, default: () => ({}) },
	},

	data() {
		instanceCount += 1
		return {
			uid: `cn-object-translations-${instanceCount}`,
			loading: true,
			error: false,
			saving: false,
			languages: [],
			sourceLanguage: '',
			translatable: [],
			titles: {},
			values: {},
			statuses: {},
			drafts: {},
			activeLanguage: '',
		}
	},

	computed: {
		target() {
			return {
				register: this.register || this.content.register || '',
				schema: this.schema || this.content.schema || '',
				apiBase: this.content.apiBase || this.apiBase,
			}
		},

		resolvedId() {
			return String(this.objectId || this.content.objectId || this.$route?.params?.id || '')
		},

		whitelist() {
			const list = this.properties.length > 0 ? this.properties : (this.content.properties || [])
			return Array.isArray(list) ? list.map(String) : []
		},

		/** The translatable properties OpenRegister reported, narrowed by the whitelist. */
		propertiesShown() {
			return this.whitelist.length === 0
				? this.translatable
				: this.translatable.filter((property) => this.whitelist.includes(property))
		},

		panelId() {
			return `${this.uid}-panel`
		},

		/**
		 * One chip per language the REGISTER declares (so a language nobody has
		 * started reads "0 of 5"), counting a stale value as missing.
		 *
		 * @return {Array<object>} The chips, source first.
		 */
		chips() {
			return this.languages.map((language) => {
				const { translated, total } = completenessOf({
					properties: this.propertiesShown,
					values: this.values,
					statuses: this.statuses,
					language,
					sourceLanguage: this.sourceLanguage,
				})
				return {
					language,
					name: this.nameOf(language),
					// TRANSLATORS: how many of a record's labels exist in one language
					count: t('nextcloud-vue', '{translated} of {total}', { translated, total }),
					complete: translated === total,
				}
			})
		},

		sourceNote() {
			return t('nextcloud-vue', '{language} is the source. Change a {language} label and its translations are marked out of date.', { language: this.nameOf(this.sourceLanguage) })
		},

		hasEdits() {
			return this.propertiesShown.some((property) => this.draftOf(property) !== this.storedOf(property))
		},
	},

	mounted() {
		subscribe(PAGE_REFRESH, this.load)
		this.load()
	},

	beforeUnmount() {
		unsubscribe(PAGE_REFRESH, this.load)
	},

	methods: {
		t,

		/**
		 * A language's name in the reader's own language, from the browser
		 * (keeps 38 language names out of the catalogue).
		 *
		 * @param {string} code The BCP 47 tag.
		 * @return {string} The name, or the tag.
		 */
		nameOf(code) {
			try {
				return new Intl.DisplayNames([getLanguage()], { type: 'language' }).of(code) ?? code
			} catch {
				return code
			}
		},

		tabId(language) {
			return `${this.uid}-tab-${language}`
		},

		/**
		 * Arrow keys, Home and End move between the language tabs.
		 *
		 * @param {KeyboardEvent} event The key event.
		 */
		onTabKeydown(event) {
			const index = this.languages.indexOf(this.activeLanguage)
			const last = this.languages.length - 1
			const next = {
				ArrowRight: index >= last ? 0 : index + 1,
				ArrowLeft: index <= 0 ? last : index - 1,
				Home: 0,
				End: last,
			}[event.key]
			if (next === undefined || last < 0) {
				return
			}
			event.preventDefault()
			this.activeLanguage = this.languages[next]
			this.$nextTick(() => {
				const el = document.getElementById(this.tabId(this.activeLanguage))
				if (el && typeof el.focus === 'function') {
					el.focus()
				}
			})
		},

		labelOf(property) {
			return this.titles[property] ?? property
		},

		storedOf(property) {
			return this.values?.[property]?.[this.activeLanguage] ?? ''
		},

		draftOf(property) {
			const typed = this.drafts?.[this.activeLanguage]?.[property]
			return typed === undefined ? this.storedOf(property) : typed
		},

		setDraft(property, value) {
			const language = this.activeLanguage
			this.drafts = { ...this.drafts, [language]: { ...(this.drafts[language] ?? {}), [property]: value } }
		},

		isStale(property) {
			return (this.statuses?.[property]?.[this.activeLanguage] ?? '') === STATUS_OUTDATED
		},

		/**
		 * Read the register languages, the object with every language, the
		 * property titles and the sidecar statuses.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			if (!this.resolvedId) {
				this.loading = false
				this.error = true
				return
			}

			this.loading = true
			try {
				const [languages, read, definitions] = await Promise.all([
					registerLanguages(this.target),
					objectWithTranslations(this.target, this.resolvedId),
					schemaProperties(this.target),
				])

				const meta = read.languageMeta ?? {}
				this.translatable = Object.keys(meta)
				const first = this.propertiesShown[0] ?? this.translatable[0]
				this.sourceLanguage = meta[first]?.sourceLanguage ?? languages[0] ?? 'nl'
				this.languages = languages.length > 0 ? languages : [this.sourceLanguage]
				this.activeLanguage = this.languages.find((code) => code !== this.sourceLanguage) ?? this.sourceLanguage

				this.values = Object.fromEntries(this.translatable.map((property) => {
					const stored = read.object?.[property]
					return [property, { ...(stored !== null && typeof stored === 'object' ? stored : {}) }]
				}))
				this.titles = Object.fromEntries(this.translatable.map((property) => [property, definitions[property]?.title ?? property]))

				const uuid = String(read.object?.['@self']?.uuid ?? read.object?.id ?? this.resolvedId)
				const statuses = {}
				for (const row of await translationRows(this.target, uuid)) {
					const property = String(row.property ?? '')
					const language = String(row.language ?? '')
					if (property === '' || language === '') {
						continue
					}
					statuses[property] = { ...(statuses[property] ?? {}), [language]: row.status }
				}
				this.statuses = statuses

				this.drafts = {}
				this.error = false
			} catch {
				this.error = true
			} finally {
				this.loading = false
			}
		},

		/**
		 * Write every edited property back, each as a whole language map.
		 *
		 * @return {Promise<void>}
		 */
		async save() {
			this.saving = true
			try {
				for (const property of this.propertiesShown) {
					const draft = this.draftOf(property)
					if (draft === this.storedOf(property)) {
						continue
					}
					const map = { ...(this.values[property] ?? {}), [this.activeLanguage]: draft }
					await saveTranslatedProperty(this.target, this.resolvedId, property, map)
					this.values = { ...this.values, [property]: map }
				}
				this.drafts = { ...this.drafts, [this.activeLanguage]: {} }
				showSuccess(t('nextcloud-vue', 'The labels are saved.'))
			} catch {
				showError(t('nextcloud-vue', 'The labels could not be saved.'))
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-object-translations__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	list-style: none;
	margin: 0 0 8px;
	padding: 0;
}

.cn-object-translations__chip {
	align-items: center;
	background: var(--color-background-dark);
	display: flex;
	gap: 6px;
}

.cn-object-translations__chip--complete {
	background: var(--color-success, var(--color-background-dark));
	--cn-status-badge-ink: var(--color-primary-text);
	color: var(--cn-status-badge-ink);
}

.cn-object-translations__source,
.cn-object-translations__empty {
	color: var(--color-text-maxcontrast);
	margin: 0 0 8px;
}

.cn-object-translations__tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-bottom: 8px;
}

.cn-object-translations__field {
	align-items: center;
	display: flex;
	gap: 8px;
	margin-bottom: 8px;
}

.cn-object-translations__stale {
	color: var(--color-warning-text, var(--color-main-text));
	white-space: nowrap;
}
</style>
