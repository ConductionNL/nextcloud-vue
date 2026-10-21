<!--
  CnFeaturesAndRoadmapPage — Manifest-driven Features & Roadmap surface.

  v2 manifest page primitive for `type: "roadmap"`. Wraps
  `CnFeaturesAndRoadmapView` so consuming apps can declare
  `{ id: "FeaturesRoadmap", route: "/features-roadmap", type: "roadmap" }`
  in their manifest without writing a per-app wrapper that just
  unpacks initialState into the view's three props.

  Resolution order for each of the three values:

    1. Explicit `pages[].config.<key>` from the manifest.
    2. `loadState(appId, 'features_roadmap_<key>', <fallback>)`.
    3. Hardcoded fallback (`repo` → `ConductionNL/<appId>` on GitHub;
       `forge` → the `cnFeatureRequestForge` inject, else DEFAULT_FORGE).

  `appId` comes from the `cnAiContext` inject that CnAppRoot already
  provides; consumers can override it explicitly via the prop for tests.

  Spec: ConductionNL/nextcloud-vue#264.
-->
<template>
	<div v-if="compareHref" class="cn-features-and-roadmap-page">
		<p class="cn-features-and-roadmap-page__compare" data-testid="cn-roadmap-compare">
			<a :href="compareHref"
				class="cn-features-and-roadmap-page__compare-link"
				target="_blank"
				rel="noopener noreferrer"
				:aria-describedby="compareHintId">{{ compareText }}</a>
			<span :id="compareHintId" class="cn-features-and-roadmap-page__compare-hint">
				{{ t('nextcloud-vue', 'Opens {host} in a new tab.', { host: compareHost }) }}
			</span>
		</p>
		<CnFeaturesAndRoadmapView v-bind="viewProps" />
	</div>
	<CnFeaturesAndRoadmapView v-else v-bind="viewProps" />
</template>

<script>
// `@nextcloud/initial-state` is a DECLARED (non-optional) peer dependency, so
// it is imported statically — a lazy CommonJS resolution can never succeed from
// `dist/esm/**` (the package's `exports` map is import-only and the ESM build
// has no such function), which meant this helper used to return its fallback
// unconditionally.
import { loadState } from '@nextcloud/initial-state'
import { getLanguage, translate as t } from '@nextcloud/l10n'
import CnFeaturesAndRoadmapView from '../CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'
import { warnCapabilityComparisonDeprecated } from '../../utils/capabilityComparison.js'
import { DEFAULT_FORGE } from '../../utils/forge.js'
import { safeHref } from '../../utils/safeHref.js'

/**
 * Read a key from `@nextcloud/initial-state`, tolerating an unprovisioned
 * slot (mirrors resolveManifestSentinels.js).
 *
 * @param {string} appId Nextcloud app ID.
 * @param {string} key Initial-state key (full key, not prefixed).
 * @param {unknown} fallback Default value when no provisioned slot exists.
 * @return {unknown} Provisioned value or the fallback.
 */
function readInitialState(appId, key, fallback) {
	try {
		// `loadState` throws only when the `#initial-state-*` element is absent
		// AND no fallback is given; a fallback IS given here, so this catch
		// covers the parse-error case only. It is a runtime condition, never a
		// module-resolution failure.
		return loadState(appId, key, fallback)
	} catch {
		// Slot present but unparseable — fall back.
	}
	return fallback
}

export default {
	name: 'CnFeaturesAndRoadmapPage',

	components: {
		CnFeaturesAndRoadmapView,
	},

	inject: {
		cnAiContext: {
			default: () => ({ appId: 'unknown' }),
		},

		/**
		 * Forge config provided by CnAppRoot from `manifest.nav.forge`.
		 * Used as the fallback for `resolvedForge` so the whole app shares
		 * one forge setting. Defaults to Codeberg when no ancestor.
		 */
		cnFeatureRequestForge: {
			default: () => ({ ...DEFAULT_FORGE }),
		},

		/** The host app's translate (CnAppRoot `cnTranslate`). */
		cnTranslate: {
			default: () => (key) => key,
		},
	},

	props: {
		/**
		 * `<owner>/<repo>` of the app's repository on the forge. When
		 * omitted, falls back to the loadState value, then to
		 * `ConductionNL/<appId>` — the fleet convention on GitHub.
		 */
		repo: {
			type: String,
			default: '',
		},

		/**
		 * Target forge for the feature-request deep-link. Manifest config
		 * > initialState > the `cnFeatureRequestForge` inject (CnAppRoot)
		 * > Codeberg.
		 *
		 * @type {{type: 'codeberg'|'forgejo'|'gitea'|'github', baseUrl?: string}|null}
		 */
		forge: {
			type: Object,
			default: null,
		},

		/**
		 * Build-time feature manifest. When omitted, falls back to
		 * the loadState value, then to an empty array.
		 *
		 * @type {Array<{slug: string, title: string, summary: string, docsUrl: string}>}
		 */
		features: {
			type: Array,
			default: null,
		},

		/**
		 * Admin opt-out flag. When omitted, falls back to the
		 * loadState value, then to false.
		 *
		 * @type {boolean|null}
		 */
		disabled: {
			type: Boolean,
			default: null,
		},

		/**
		 * Override for the OpenBuilt sidebar CTA target. Manifest config
		 * > initialState > the view's own default (in-instance /apps/openbuilt).
		 */
		openbuiltUrl: {
			type: String,
			default: '',
		},

		/**
		 * Override for the LLM-skills sidebar CTA target. Manifest config
		 * > initialState > docs.conduction.nl/ai-skills.
		 */
		llmSkillsUrl: {
			type: String,
			default: '',
		},

		/**
		 * Override for the Suggest sidebar CTA. When set, the sidebar
		 * Suggest CTA renders as an anchor pointing here; when empty
		 * (default) the view derives the forge's feature-request issue
		 * form URL. Manifest config > initialState > '' (forge form).
		 */
		suggestUrl: {
			type: String,
			default: '',
		},

		/**
		 * URL of the app's public documentation site. When set, an info
		 * banner above the card grid points users at the docs. Manifest
		 * config > initialState > '' (no banner).
		 */
		documentationUrl: {
			type: String,
			default: '',
		},

		/**
		 * Optional capability comparison document, forwarded to the view.
		 * Manifest config > initialState (`features_roadmap_capabilities`) >
		 * null. When null the view renders its two stops as it always has.
		 *
		 * Deprecated: publish the comparison on the app's docs site and link to it (as dossiq #3312 and pipelinq #2195 did). Still rendered; removal waits for a major version. The same goes for the `features_roadmap_capabilities` initial
		 * state key. A development build warns once when either is set.
		 *
		 * @deprecated since 2.66.0, publish the comparison on the app's docs site and link to it.
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-the-in-app-capability-comparison-is-deprecated
		 * @type {object|null}
		 */
		capabilityComparison: {
			type: Object,
			default: null,
		},

		/**
		 * Feature category key to caption, for the board look's groups.
		 * Manifest `config.categories`.
		 *
		 * @type {object|null}
		 */
		categories: {
			type: Object,
			default: null,
		},

		/**
		 * Board look options (`layout`, `tabs`, `filter`, `statusLabels`,
		 * `next`, `issueLabels`, `subtitle`, `notice`, `documentationButton`,
		 * `suggestButton`). Manifest `config.board`; see CnFeaturesBoard.
		 *
		 * @type {object|null}
		 */
		board: {
			type: Object,
			default: null,
		},

		/**
		 * Page title, lifted from the manifest page's `title`. Shown in the
		 * board look.
		 */
		title: {
			type: String,
			default: '',
		},

		/**
		 * The app version for the board look's subtitle. Manifest config >
		 * initialState (`features_roadmap_app_version`) > ''.
		 */
		appVersion: {
			type: String,
			default: '',
		},

		/**
		 * The app's comparison with similar products on its public site,
		 * linked above the page in a new tab. A URL, or a map from language
		 * to URL with a `default` (`{ default, nl }`). Manifest `config.compareUrl`.
		 *
		 * @type {string|object}
		 */
		compareUrl: {
			type: [String, Object],
			default: '',
		},

		/**
		 * The compare link's text, through the app's translate. Manifest
		 * `config.compareLabel`; defaults to "How this app compares".
		 */
		compareLabel: {
			type: String,
			default: '',
		},

		/**
		 * Override for the appId used to namespace loadState lookups.
		 * Tests pass an explicit value; production reads it from the
		 * `cnAiContext` inject populated by CnAppRoot.
		 */
		appId: {
			type: String,
			default: '',
		},
	},

	computed: {
		/**
		 * The compare link for the reader's language, when it is a safe
		 * http(s) or same-origin address; '' otherwise.
		 *
		 * @spec openspec/changes/pl4-roadmap-flow/specs/pl4-roadmap-flow/spec.md#requirement-the-roadmap-page-links-to-the-app-comparison
		 * @return {string}
		 */
		compareHref() {
			let url = this.compareUrl
			if (url && typeof url === 'object') {
				const language = String(getLanguage() || '').toLowerCase()
				const key = Object.keys(url).find((k) => k !== 'default' && language.startsWith(k.toLowerCase()))
				url = key ? url[key] : url.default
			}
			if (typeof url !== 'string' || url === '' || url.startsWith('mailto:')) {
				return ''
			}
			const href = safeHref(url)
			return href === '#' ? '' : href
		},

		/**
		 * The compare link's text.
		 *
		 * @return {string}
		 */
		compareText() {
			return this.compareLabel ? this.cnTranslate(this.compareLabel) : t('nextcloud-vue', 'How this app compares')
		},

		/**
		 * The id tying the new-tab hint to the link, so a screen reader hears it.
		 *
		 * @return {string}
		 */
		compareHintId() {
			return `cn-roadmap-compare-hint-${this.$.uid}`
		},

		/**
		 * The host the compare link opens, for the hint beside it.
		 *
		 * @return {string}
		 */
		compareHost() {
			try {
				return new URL(this.compareHref, window.location.origin).host
			} catch {
				return this.compareHref
			}
		},

		/**
		 * The props handed to the view.
		 *
		 * @return {object}
		 */
		viewProps() {
			return {
				repo: this.resolvedRepo,
				forge: this.resolvedForge,
				features: this.resolvedFeatures,
				disabled: this.resolvedDisabled,
				openbuiltUrl: this.resolvedOpenbuiltUrl,
				llmSkillsUrl: this.resolvedLlmSkillsUrl,
				suggestUrl: this.resolvedSuggestUrl,
				documentationUrl: this.resolvedDocumentationUrl,
				capabilityComparison: this.resolvedCapabilityComparison,
				categories: this.categories || {},
				board: this.board || {},
				title: this.title,
				appVersion: this.resolvedAppVersion,
			}
		},

		/**
		 * Effective app id used to namespace `loadState` calls.
		 * Prop takes precedence over the cnAiContext inject so that
		 * unit tests can pass a known id without mocking the inject.
		 *
		 * @return {string}
		 */
		effectiveAppId() {
			return this.appId || this.cnAiContext?.appId || 'unknown'
		},

		/**
		 * Effective repo. Manifest config > initialState > fallback.
		 *
		 * @return {string}
		 */
		resolvedRepo() {
			if (this.repo) {
				return this.repo
			}
			return readInitialState(
				this.effectiveAppId,
				'features_roadmap_repo',
				`ConductionNL/${this.effectiveAppId}`,
			)
		},

		/**
		 * Effective forge. Manifest config > initialState >
		 * `cnFeatureRequestForge` inject (CnAppRoot) > DEFAULT_FORGE.
		 *
		 * @return {{type: string, baseUrl?: string}}
		 */
		resolvedForge() {
			if (this.forge) {
				return this.forge
			}
			return readInitialState(
				this.effectiveAppId,
				'features_roadmap_forge',
				this.cnFeatureRequestForge || { ...DEFAULT_FORGE },
			)
		},

		/**
		 * Effective features list. Manifest config > initialState > [].
		 *
		 * @return {Array}
		 */
		resolvedFeatures() {
			if (this.features !== null) {
				return this.features
			}
			return readInitialState(this.effectiveAppId, 'features_roadmap_features', [])
		},

		/**
		 * Effective disabled flag. Manifest config > initialState > false.
		 *
		 * @return {boolean}
		 */
		resolvedDisabled() {
			if (this.disabled !== null) {
				return this.disabled
			}
			return readInitialState(this.effectiveAppId, 'features_roadmap_disabled', false)
		},

		resolvedOpenbuiltUrl() {
			return this.openbuiltUrl
				|| readInitialState(this.effectiveAppId, 'features_roadmap_openbuilt_url', '')
		},

		resolvedLlmSkillsUrl() {
			return this.llmSkillsUrl
				|| readInitialState(this.effectiveAppId, 'features_roadmap_llm_skills_url', '')
		},

		resolvedSuggestUrl() {
			return this.suggestUrl
				|| readInitialState(this.effectiveAppId, 'features_roadmap_suggest_url', '')
		},

		resolvedAppVersion() {
			return this.appVersion
				|| readInitialState(this.effectiveAppId, 'features_roadmap_app_version', '')
		},

		resolvedDocumentationUrl() {
			return this.documentationUrl
				|| readInitialState(this.effectiveAppId, 'features_roadmap_documentation_url', '')
		},

		/**
		 * Effective capability comparison. Manifest config > initialState >
		 * null.
		 *
		 * `null` and not `{}`: an empty object would make the view believe a
		 * comparison exists and grow a third toggle stop over zero rows.
		 *
		 * @return {object|null}
		 */
		resolvedCapabilityComparison() {
			if (this.capabilityComparison !== null) {
				return this.capabilityComparison
			}
			return readInitialState(this.effectiveAppId, 'features_roadmap_capabilities', null)
		},
	},

	mounted() {
		if (this.resolvedCapabilityComparison) {
			warnCapabilityComparisonDeprecated('CnFeaturesAndRoadmapPage `capabilityComparison` / the `features_roadmap_capabilities` initial state')
		}
	},

	methods: {
		t,
	},
}
</script>

<style scoped>
.cn-features-and-roadmap-page__compare {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 4px 12px;
	margin: 0;
	padding: 12px 12px 0;
}

.cn-features-and-roadmap-page__compare-link {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-features-and-roadmap-page__compare-hint {
	color: var(--color-text-maxcontrast);
}
</style>
