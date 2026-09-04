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
	<CnFeaturesAndRoadmapView
		:repo="resolvedRepo"
		:forge="resolvedForge"
		:features="resolvedFeatures"
		:disabled="resolvedDisabled"
		:openbuilt-url="resolvedOpenbuiltUrl"
		:llm-skills-url="resolvedLlmSkillsUrl"
		:suggest-url="resolvedSuggestUrl"
		:documentation-url="resolvedDocumentationUrl" />
</template>

<script>
// `@nextcloud/initial-state` is a DECLARED (non-optional) peer dependency, so
// it is imported statically — a lazy CommonJS resolution can never succeed from
// `dist/esm/**` (the package's `exports` map is import-only and the ESM build
// has no such function), which meant this helper used to return its fallback
// unconditionally.
import { loadState } from '@nextcloud/initial-state'
import CnFeaturesAndRoadmapView from '../CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'
import { DEFAULT_FORGE } from '../../utils/forge.js'

/**
 * Read a key from `@nextcloud/initial-state`, tolerating an unprovisioned
 * slot (mirrors resolveManifestSentinels.js).
 *
 * @param {string} appId Nextcloud app ID.
 * @param {string} key Initial-state key (full key, not prefixed).
 * @param {*} fallback Default value when no provisioned slot exists.
 * @return {*} Provisioned value or the fallback.
 */
function readInitialState(appId, key, fallback) {
	try {
		// `loadState` throws only when the `#initial-state-*` element is absent
		// AND no fallback is given; a fallback IS given here, so this catch
		// covers the parse-error case only. It is a runtime condition, never a
		// module-resolution failure.
		return loadState(appId, key, fallback)
	} catch (e) {
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
		resolvedDocumentationUrl() {
			return this.documentationUrl
				|| readInitialState(this.effectiveAppId, 'features_roadmap_documentation_url', '')
		},
	},
}
</script>
