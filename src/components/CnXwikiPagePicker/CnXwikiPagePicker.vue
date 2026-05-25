<!--
  CnXwikiPagePicker — modal for browsing a remote xWiki instance and
  picking an existing page to link to the parent OR object.

  Flow:
    1. Browse pages via GET /api/integrations/xwiki/available
       (each row carries reference + title + space + url + breadcrumb).
       xWiki is external (OpenConnector-routed): when no `xwiki` source is
       configured (or the upstream is down) the endpoint answers 503 with
       `details.cause` — the picker then renders a prominent
       Configure-XWiki CTA instead of a page list (AD-23 / wave-5.1).
    2. Filter client-side via a search input (debounced; the same query is
       forwarded as `?search=` for server-side filtering)
    3. Single-select a page row (title + space breadcrumb)
    4. Confirm → emit `link` with `{ pageReference }`

  All API calls are wrapped in best-effort try/catch so a transient xWiki
  failure surfaces a user-visible state rather than a modal crash.

  ADR-004: modal lives in its own .vue file under
  `src/components/CnXwikiPagePicker/` (NcDialog-based; matches the
  collectives/photos/deck picker pattern).

  ADR-019: drives the `xwiki` external integration leaf's "link existing"
  surface; emits `link` so the parent (CnXwikiTab) can POST the selection
  to the OR endpoint.

  SPDX-License-Identifier: EUPL-1.2
  SPDX-FileCopyrightText: 2026 Conduction B.V.
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="true"
		data-testid="cn-xwiki-page-picker"
		@closing="$emit('close')">
		<div class="cn-xwiki-page-picker">
			<!-- Unconfigured / upstream-down state: prominent Configure CTA -->
			<div
				v-if="unconfigured"
				class="cn-xwiki-page-picker__unconfigured"
				role="alert">
				<AlertCircleOutline :size="32" class="cn-xwiki-page-picker__unconfigured-icon" />
				<strong>{{ unconfiguredTitle }}</strong>
				<p>{{ unconfiguredMessage }}</p>
				<NcButton type="primary" @click="openOpenConnector">
					{{ t('nextcloud-vue', 'Configure XWiki connection') }}
				</NcButton>
			</div>

			<template v-else>
				<NcNoteCard v-if="error" type="error" class="cn-xwiki-page-picker__error">
					{{ error }}
				</NcNoteCard>

				<NcTextField
					v-model="search"
					:label="t('nextcloud-vue', 'Search pages')"
					:placeholder="t('nextcloud-vue', 'Type to filter…')"
					class="cn-xwiki-page-picker__search"
					@update:value="onSearch" />

				<NcLoadingIcon v-if="loading" />
				<NcEmptyContent
					v-else-if="visiblePages.length === 0"
					:name="t('nextcloud-vue', 'No pages available')"
					:description="t('nextcloud-vue', 'No xWiki pages matched. Try a different search, or create a new page.')" />
				<ul v-else class="cn-xwiki-page-picker__list">
					<li
						v-for="page in visiblePages"
						:key="pageRef(page)"
						class="cn-xwiki-page-picker__row"
						:class="{ 'cn-xwiki-page-picker__row--selected': selectedReference === pageRef(page) }">
						<button type="button" class="cn-xwiki-page-picker__row-button" @click="pickPage(page)">
							<span class="cn-xwiki-page-picker__icon" :aria-hidden="true">
								<FileDocumentMultiple :size="18" />
							</span>
							<span class="cn-xwiki-page-picker__main">
								<span class="cn-xwiki-page-picker__title">{{ pageTitle(page) }}</span>
								<span v-if="breadcrumbLabel(page)" class="cn-xwiki-page-picker__sub">
									{{ breadcrumbLabel(page) }}
								</span>
							</span>
						</button>
					</li>
				</ul>
			</template>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="selectedReference === null || unconfigured"
				@click="confirm">
				{{ t('nextcloud-vue', 'Link page') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnXwikiPagePicker — browse a remote xWiki instance and pick an existing
 * page. Emits `link` with the chosen page reference. Handles the
 * unconfigured-source state with a Configure-XWiki CTA.
 *
 * @see ADR-019 (pluggable integrations) and ADR-022 (sidebar tabs)
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import FileDocumentMultiple from 'vue-material-design-icons/FileDocumentMultiple.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnXwikiPagePicker',

	components: { NcButton, NcDialog, NcEmptyContent, NcLoadingIcon, NcNoteCard, NcTextField, AlertCircleOutline, FileDocumentMultiple },

	props: {
		/** Base API URL for OR. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Pre-translated dialog title. */
		dialogTitle: { type: String, default: () => t('nextcloud-vue', 'Link an existing xWiki page') },
		/** URL of OpenConnector's sources admin page (deep-link target for the configure CTA). */
		openConnectorSourcesUrl: { type: String, default: '/index.php/apps/openconnector/sources' },
	},

	emits: ['close', 'link'],

	data() {
		return {
			loading: false,
			error: '',
			pages: [],
			search: '',
			selectedReference: null,
			searchTimer: null,
			/** One of: '' | 'unconfigured' | 'auth' | 'upstream'. */
			degradedCause: '',
		}
	},

	computed: {
		/**
		 * Whether the picker is in a degraded (non-listable) state.
		 *
		 * @return {boolean} True when the source is unconfigured/down.
		 */
		unconfigured() {
			return this.degradedCause !== ''
		},

		unconfiguredTitle() {
			if (this.degradedCause === 'auth') {
				return t('nextcloud-vue', 'XWiki authentication failed')
			}
			if (this.degradedCause === 'upstream') {
				return t('nextcloud-vue', 'XWiki is currently unavailable')
			}
			return t('nextcloud-vue', 'XWiki connection not configured')
		},

		unconfiguredMessage() {
			if (this.degradedCause === 'auth') {
				return t('nextcloud-vue', 'XWiki returned 401 — check the OpenConnector source credentials.')
			}
			if (this.degradedCause === 'upstream') {
				return t('nextcloud-vue', 'The upstream XWiki host did not respond. Try again in a moment.')
			}
			return t('nextcloud-vue', 'Add an XWiki source in OpenConnector with the upstream URL and credentials so OpenRegister can browse pages.')
		},

		/**
		 * Client-side filter on top of the server-side `?search=` payload.
		 *
		 * @return {Array} The filtered page rows.
		 */
		visiblePages() {
			const term = this.search.trim().toLowerCase()
			if (term === '') {
				return this.pages
			}
			return this.pages.filter((page) => {
				const hay = `${this.pageTitle(page)} ${this.pageRef(page)}`.toLowerCase()
				return hay.includes(term)
			})
		},
	},

	mounted() {
		this.fetchPages()
	},

	beforeDestroy() {
		if (this.searchTimer) {
			clearTimeout(this.searchTimer)
		}
	},

	methods: {
		t,

		/**
		 * Map a 503 cause from the controller (`details.cause`) to the
		 * matching degraded state. Unknown causes fall through to 'upstream'.
		 *
		 * @param {string} cause One of the AD-23 cause values.
		 *
		 * @return {string} Degraded-cause kind.
		 */
		degradedFromCause(cause) {
			if (cause === 'openconnector-down' || cause === 'openconnector-source-missing') {
				return 'unconfigured'
			}
			if (cause === 'provider-auth') {
				return 'auth'
			}
			return 'upstream'
		},

		async fetchPages(searchTerm = '') {
			this.loading = true
			this.error = ''
			this.degradedCause = ''
			try {
				const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
				const response = await fetch(`${this.apiBase}/integrations/xwiki/available${query}`, {
					headers: buildHeaders(),
				})
				if (response.ok) {
					const data = await response.json()
					this.pages = data.results || []
				} else if (response.status === 503) {
					let cause = ''
					try {
						const body = await response.json()
						cause = String(body?.details?.cause ?? '')
					} catch (_e) {
						cause = ''
					}
					this.degradedCause = this.degradedFromCause(cause)
				} else {
					this.error = t('nextcloud-vue', 'Could not load xWiki pages.')
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnXwikiPagePicker] fetch pages failed', err)
				this.error = t('nextcloud-vue', 'Could not load xWiki pages.')
			} finally {
				this.loading = false
			}
		},

		onSearch(value) {
			this.search = value
			if (this.searchTimer) {
				clearTimeout(this.searchTimer)
			}
			this.searchTimer = setTimeout(() => {
				this.fetchPages(this.search.trim())
			}, 300)
		},

		pickPage(page) {
			this.selectedReference = this.pageRef(page)
		},

		pageRef(page) {
			return String(page.reference ?? page.id ?? '')
		},

		pageTitle(page) {
			return String(page.title ?? page.page ?? this.pageRef(page))
		},

		breadcrumbLabel(page) {
			const crumb = page.breadcrumb
			if (Array.isArray(crumb) && crumb.length > 0) {
				const ancestors = crumb.slice(0, -1)
				if (ancestors.length > 0) {
					return ancestors.map((c) => String(c)).filter((s) => s !== '').join(' / ')
				}
			}
			return String(page.space ?? '')
		},

		openOpenConnector() {
			if (typeof window !== 'undefined') {
				window.open(this.openConnectorSourcesUrl, '_blank', 'noopener')
			}
		},

		confirm() {
			if (this.selectedReference === null) {
				return
			}
			this.$emit('link', { pageReference: this.selectedReference })
		},
	},
}
</script>

<style scoped>
.cn-xwiki-page-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 4px 0;
	min-height: 240px;
}

.cn-xwiki-page-picker__unconfigured {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 24px 12px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.cn-xwiki-page-picker__unconfigured-icon {
	color: var(--color-primary-element, #21468B);
}

.cn-xwiki-page-picker__unconfigured p {
	margin: 0;
}

.cn-xwiki-page-picker__error {
	margin: 4px 0;
}

.cn-xwiki-page-picker__search {
	width: 100%;
}

.cn-xwiki-page-picker__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-xwiki-page-picker__row {
	border-radius: var(--border-radius);
}

.cn-xwiki-page-picker__row-button {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	width: 100%;
	padding: 8px 10px;
	background: var(--color-background-hover);
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	color: var(--color-main-text);
	cursor: pointer;
	text-align: left;
}

.cn-xwiki-page-picker__row-button:hover {
	background: var(--color-background-dark, var(--color-background-hover));
}

.cn-xwiki-page-picker__row--selected .cn-xwiki-page-picker__row-button {
	border-color: var(--color-primary-element);
}

.cn-xwiki-page-picker__icon {
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-text-maxcontrast);
}

.cn-xwiki-page-picker__main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-xwiki-page-picker__title {
	font-size: 13px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-xwiki-page-picker__sub {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
