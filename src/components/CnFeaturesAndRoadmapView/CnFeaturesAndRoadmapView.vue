<template>
	<div class="cn-features-and-roadmap-view">
		<div v-if="disabled" class="cn-features-and-roadmap-view__disabled">
			<NcEmptyContent :name="disabledTitle" :description="disabledDescription">
				<template #icon>
					<LockOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<template v-else>
			<header class="cn-features-and-roadmap-view__header">
				<h2 class="cn-features-and-roadmap-view__title">
					{{ headerTitle }}
				</h2>
				<div class="cn-features-and-roadmap-view__actions">
					<NcButton @click="toggleView">
						<template #icon>
							<RoadVariant v-if="activeView === 'features'" :size="20" />
							<FormatListBulleted v-else :size="20" />
						</template>
						{{ toggleLabel }}
					</NcButton>
					<NcButton type="primary" @click="openSuggestModal">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ suggestLabel }}
					</NcButton>
				</div>
			</header>

			<NcNoteCard
				v-if="resolvedDocumentationUrl"
				type="info"
				class="cn-features-and-roadmap-view__docs-note">
				{{ docsNoteLeading }}
				<a
					:href="resolvedDocumentationUrl"
					:target="documentationUrlIsExternal ? '_blank' : null"
					:rel="documentationUrlIsExternal ? 'noopener noreferrer' : null">{{ docsNoteLinkLabel }}</a>
				{{ docsNoteTrailing }}
			</NcNoteCard>

			<main class="cn-features-and-roadmap-view__panel">
				<CnFeaturesTab v-if="activeView === 'features'" :features="features" />
				<CnRoadmapTab v-else :repo="repo" />
			</main>

			<CnSuggestFeatureModal
				v-if="showSuggestModal"
				:repo="repo"
				:spec-ref="suggestModalSpecRef"
				@submitted="onSubmitted"
				@close="showSuggestModal = false" />

			<CnSupportDialog
				v-if="showSupportDialog"
				:app-name="resolvedAppName"
				:app-slug="resolvedAppSlug"
				:app-store-url="resolvedAppStoreUrl"
				:feature-request-url="resolvedFeatureRequestUrl"
				:donate-url="donateUrl"
				:support-url="supportUrl"
				:founder-name="founderName"
				:founder-title="founderTitle"
				@close="showSupportDialog = false" />
		</template>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnFeaturesAndRoadmapView — route-level container for the Features &
 * Roadmap surface. Header carries the view-toggle and the primary
 * Suggest-feature CTA. Body is a card grid (Features OR Roadmap).
 *
 * The right-edge sidebar is hoisted to NcContent level via the same
 * `cnIndexSidebarConfig` provide mechanism CnIndexPage uses for its
 * CnIndexSidebar — that's the only place where Nextcloud's right-edge
 * sidebar slot renders correctly (next to NcAppContent, not inside it).
 * When mounted under CnAppRoot the view publishes
 * `CnFeaturesAndRoadmapSidebar` + props into the holder on mounted()
 * and clears it on beforeDestroy(). Sidebar carries four pitch
 * sections: Suggest, OpenBuilt, LLM, Support. Suggest emits `@suggest`
 * (forwarded to the modal opener); Support emits `@support` (forwarded
 * to a freshly-mounted `CnSupportDialog`).
 *
 * Sidebar link targets are overridable via the `openbuiltUrl` and
 * `llmSkillsUrl` props. Defaults: in-instance `/apps/openbuilt` (via
 * `generateUrl`) and `https://docs.conduction.nl/ai-skills`.
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapView".
 */
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent, NcNoteCard } from '@nextcloud/vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'

import CnFeaturesTab from '../CnFeaturesTab/CnFeaturesTab.vue'
import CnRoadmapTab from '../CnRoadmapTab/CnRoadmapTab.vue'
import CnSuggestFeatureModal from '../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'
import CnFeaturesAndRoadmapSidebar from '../CnFeaturesAndRoadmapSidebar/CnFeaturesAndRoadmapSidebar.vue'
import CnSupportDialog from '../CnSupportDialog/CnSupportDialog.vue'
import { useSpecRef } from '../../composables/useSpecRef.js'

const DEFAULT_OPENBUILT_PATH = '/apps/openbuilt'
const DEFAULT_LLM_SKILLS_URL = 'https://docs.conduction.nl/ai-skills'
const DEFAULT_DONATE_URL = 'https://github.com/sponsors/ConductionNL'
const DEFAULT_SUPPORT_URL = 'https://www.conduction.nl/contact'
const DEFAULT_FOUNDER_NAME = 'Ruben van der Linde'
const DEFAULT_FOUNDER_TITLE = 'a founder of Conduction'

export default {
	name: 'CnFeaturesAndRoadmapView',

	components: {
		NcButton,
		NcEmptyContent,
		NcNoteCard,
		FormatListBulleted,
		LockOutline,
		Plus,
		RoadVariant,
		CnFeaturesTab,
		CnRoadmapTab,
		CnSuggestFeatureModal,
		CnSupportDialog,
	},

	inject: {
		/**
		 * Set to `true` by CnAppRoot so descendants know the host will
		 * mount a hoisted sidebar at NcContent level (see CnAppRoot.vue
		 * `cnHostsIndexSidebar: true`). When `false` (no CnAppRoot
		 * ancestor) the view skips publishing — there's no inline
		 * fallback for this surface.
		 */
		cnHostsIndexSidebar: { default: false },
		/**
		 * Reactive holder published by CnAppRoot that backs the
		 * hoisted-sidebar render in NcContent. Set value to
		 * `{component, props, listeners}` to mount; set to `null` to
		 * unmount. Same holder CnIndexPage uses.
		 */
		cnIndexSidebarConfig: { default: () => ({ value: null }) },
	},

	props: {
		/**
		 * `<owner>/<repo>` of the app's GitHub repository.
		 */
		repo: {
			type: String,
			required: true,
		},
		/**
		 * Build-time feature manifest (alphabetical list rendered by CnFeaturesTab).
		 * @type {Array<{slug: string, title: string, summary: string, docsUrl: string}>}
		 */
		features: {
			type: Array,
			required: true,
			default: () => [],
		},
		/**
		 * Admin opt-out flag — when true the entire view collapses to a
		 * single "disabled by admin" empty state.
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Override the OpenBuilt sidebar CTA target. Pass an absolute URL or
		 * a Nextcloud-relative path. When unset, defaults to the in-instance
		 * OpenBuilt route at `/apps/openbuilt` (resolved via `generateUrl`).
		 * @type {string}
		 */
		openbuiltUrl: {
			type: String,
			default: '',
		},
		/**
		 * Override the LLM-skills sidebar CTA target. Defaults to
		 * `https://docs.conduction.nl/ai-skills`.
		 * @type {string}
		 */
		llmSkillsUrl: {
			type: String,
			default: '',
		},
		/**
		 * Optional override for the Suggest CTA inside the sidebar. When
		 * set the CTA renders as an anchor pointing at this URL —
		 * appropriate when the app routes feature suggestions through a
		 * public form, a Discord channel, or any non-GitHub target. When
		 * empty (default) the CTA stays a button that opens the
		 * SuggestFeatureModal + posts to the GitHub-issues proxy.
		 * @type {string}
		 */
		suggestUrl: {
			type: String,
			default: '',
		},
		/**
		 * Optional URL of the app's public documentation site. When set,
		 * an info banner is rendered above the card grid pointing users at
		 * `<docs>` for full technical + user docs. Per-app — pipelinq
		 * passes `https://pipelinq.conduction.nl`, decidesk passes its
		 * own, etc. When empty (default) no banner renders.
		 * @type {string}
		 */
		documentationUrl: {
			type: String,
			default: '',
		},
		/**
		 * Display name of the host app, used as the title of the bundled
		 * `CnSupportDialog` and interpolated into its body copy. When
		 * empty (default) the View derives a humanised label from `repo`
		 * — `ConductionNL/openregister` becomes `Openregister` — which is
		 * fine for stock apps and overridable for camelCased names.
		 * @type {string}
		 */
		appName: {
			type: String,
			default: '',
		},
		/**
		 * Kebab-case host-app id passed to `CnSupportDialog` (its
		 * localStorage namespace). When empty (default) the View derives
		 * it from `repo` — second segment lower-cased.
		 * @type {string}
		 */
		appSlug: {
			type: String,
			default: '',
		},
		/**
		 * Nextcloud App Store listing URL for the host app, threaded
		 * through to `CnSupportDialog`. When empty (default) the View
		 * derives `https://apps.nextcloud.com/apps/{appSlug}`.
		 * @type {string}
		 */
		appStoreUrl: {
			type: String,
			default: '',
		},
		/**
		 * URL the "Suggest a feature" CTA inside `CnSupportDialog` opens.
		 * When empty (default) the View derives
		 * `https://github.com/{repo}/issues/new`. This is intentionally
		 * separate from the prop-of-the-same-name on the sidebar's
		 * Suggest CTA — that one opens the modal-driven flow; this one
		 * is the "open in GitHub" fallback used by the support dialog,
		 * which is meant for the casual visitor rather than the existing
		 * suggest-feature loop.
		 * @type {string}
		 */
		featureRequestUrl: {
			type: String,
			default: '',
		},
		/**
		 * Donate-CTA URL passed to `CnSupportDialog`. Defaults to
		 * ConductionNL's GitHub Sponsors page.
		 * @type {string}
		 */
		donateUrl: {
			type: String,
			default: DEFAULT_DONATE_URL,
		},
		/**
		 * Business-support CTA URL passed to `CnSupportDialog`. Defaults
		 * to the Conduction contact page.
		 * @type {string}
		 */
		supportUrl: {
			type: String,
			default: DEFAULT_SUPPORT_URL,
		},
		/**
		 * Name rendered in the handwritten signature of `CnSupportDialog`.
		 * Defaults to Ruben van der Linde.
		 * @type {string}
		 */
		founderName: {
			type: String,
			default: DEFAULT_FOUNDER_NAME,
		},
		/**
		 * Title shown after the handwritten signature in `CnSupportDialog`
		 * (e.g. "Founder", "Oprichter").
		 * @type {string}
		 */
		founderTitle: {
			type: String,
			default: DEFAULT_FOUNDER_TITLE,
		},
	},

	data() {
		return {
			activeView: 'features',
			showSuggestModal: false,
			suggestModalSpecRef: null,
			showSupportDialog: false,
		}
	},

	computed: {
		headerTitle() {
			return this.activeView === 'features'
				? t('nextcloud-vue', 'Features')
				: t('nextcloud-vue', 'Roadmap')
		},
		toggleLabel() {
			return this.activeView === 'features'
				? t('nextcloud-vue', 'Show roadmap')
				: t('nextcloud-vue', 'Show features')
		},
		suggestLabel() { return t('nextcloud-vue', 'Suggest feature') },
		disabledTitle() { return t('nextcloud-vue', 'This feature has been disabled by your administrator') },
		disabledDescription() { return t('nextcloud-vue', 'Contact your Nextcloud administrator to enable Features & Roadmap on this instance.') },

		resolvedOpenbuiltUrl() {
			if (this.openbuiltUrl) return this.openbuiltUrl
			return generateUrl(DEFAULT_OPENBUILT_PATH)
		},
		resolvedLlmSkillsUrl() {
			return this.llmSkillsUrl || DEFAULT_LLM_SKILLS_URL
		},
		resolvedDocumentationUrl() {
			return this.documentationUrl || ''
		},
		repoSlug() {
			if (!this.repo || !this.repo.includes('/')) return ''
			return this.repo.split('/')[1].toLowerCase()
		},
		resolvedAppSlug() {
			return this.appSlug || this.repoSlug
		},
		resolvedAppName() {
			if (this.appName) return this.appName
			const slug = this.repoSlug
			if (!slug) return ''
			return slug.charAt(0).toUpperCase() + slug.slice(1)
		},
		resolvedAppStoreUrl() {
			return this.appStoreUrl || (this.resolvedAppSlug
				? `https://apps.nextcloud.com/apps/${this.resolvedAppSlug}`
				: '')
		},
		resolvedFeatureRequestUrl() {
			return this.featureRequestUrl || (this.repo
				? `https://github.com/${this.repo}/issues/new`
				: '')
		},
		documentationUrlIsExternal() {
			return /^https?:\/\//i.test(this.resolvedDocumentationUrl)
		},
		docsNoteLeading() { return t('nextcloud-vue', 'Looking for documentation? Visit') },
		docsNoteLinkLabel() {
			// Strip protocol for a cleaner inline link label.
			return this.resolvedDocumentationUrl.replace(/^https?:\/\//i, '')
		},
		docsNoteTrailing() { return t('nextcloud-vue', 'for all technical and user documentation.') },
	},

	mounted() {
		this.publishHoistedSidebar()
	},

	beforeDestroy() {
		// Clear the holder so the hoisted sidebar disappears when the
		// user navigates away from this route. Mirrors CnIndexPage.
		if (this.cnHostsIndexSidebar && this.cnIndexSidebarConfig) {
			this.cnIndexSidebarConfig.value = null
		}
	},

	methods: {
		toggleView() {
			this.activeView = this.activeView === 'features' ? 'roadmap' : 'features'
		},
		openSuggestModal() {
			this.suggestModalSpecRef = useSpecRef(this)
			this.showSuggestModal = true
		},
		openSupportDialog() {
			this.showSupportDialog = true
		},
		onSubmitted(payload) {
			this.showSuggestModal = false
			/**
			 * Re-emitted when a feature suggestion was successfully filed from this view.
			 * Carries the sanitized GitHub issue payload returned by the OpenRegister proxy
			 * (`{number, title, html_url, ...}`). Host apps may use it to show a toast.
			 *
			 * @event submitted
			 * @type {object}
			 */
			this.$emit('submitted', payload)
			// Switch to the Roadmap view so the user sees their submission appear.
			this.activeView = 'roadmap'
		},
		/**
		 * Publish the hoisted-sidebar config to `cnIndexSidebarConfig`
		 * (same holder CnIndexPage uses) so CnAppRoot mounts the
		 * CnFeaturesAndRoadmapSidebar at NcContent level. The sidebar
		 * emits `suggest` when the user clicks the Suggest CTA inside
		 * it; the view forwards that to `openSuggestModal()`. No-op
		 * when there's no CnAppRoot ancestor.
		 */
		publishHoistedSidebar() {
			if (!this.cnHostsIndexSidebar || !this.cnIndexSidebarConfig) return
			if (this.disabled) {
				this.cnIndexSidebarConfig.value = null
				return
			}
			this.cnIndexSidebarConfig.value = {
				component: CnFeaturesAndRoadmapSidebar,
				props: {
					openbuiltUrl: this.resolvedOpenbuiltUrl,
					llmSkillsUrl: this.resolvedLlmSkillsUrl,
					suggestUrl: this.suggestUrl,
				},
				listeners: {
					suggest: () => this.openSuggestModal(),
					support: () => this.openSupportDialog(),
				},
			}
		},
	},
}
</script>

<style scoped>
.cn-features-and-roadmap-view {
	max-width: 1200px;
	margin: 0 auto;
	padding: 24px 16px;
}

.cn-features-and-roadmap-view__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 24px;
	flex-wrap: wrap;
	/* Clear the Nextcloud navigation toggle button (44px wide, absolutely
	   positioned at the left edge of .app-content) plus 12px breathing
	   room. Only the HEADER shifts right — the panel below keeps full width. */
	padding-inline-start: 56px;
}

.cn-features-and-roadmap-view__title {
	font-size: 1.4em;
	margin: 0;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-view__actions {
	display: flex;
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
}

.cn-features-and-roadmap-view__panel {
	min-height: 320px;
}

/* Underline the inline docs URL so it reads as a link inside the note
   body — NcNoteCard's default link styling drops the underline by
   inheriting from the host theme. */
.cn-features-and-roadmap-view__docs-note :deep(a) {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-features-and-roadmap-view__docs-note :deep(a:hover) {
	text-decoration: underline;
	opacity: 0.85;
}
</style>
