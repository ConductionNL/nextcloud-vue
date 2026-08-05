export {
	integrations,
	createIntegrationRegistry,
	installIntegrationRegistry,
	registerIntegration,
	getSharedRegistry,
	sharedRegistryIfInstalled,
	VALID_SURFACES,
} from './registry.js'

export {
	builtinIntegrations,
	registerBuiltinIntegrations,
	filesIntegration,
	notesIntegration,
	tagsIntegration,
	tasksIntegration,
	auditTrailIntegration,
	talkIntegration,
} from './builtin/index.js'

// Leaves: 18 NC-native + external integrations whose PHP providers
// live in `openregister/lib/Service/Integration/Providers/`. Generic
// CnIntegrationTab + CnIntegrationCard drive every leaf until any
// individual one needs a bespoke component, at which point the
// registration's `tab` / `widget` is repointed without touching
// consumers. Register the whole set via `registerLeafIntegrations()`.
export { leafIntegrations, registerLeafIntegrations } from './builtin/leaves.js'

// Field-inspection leaf (offline field data-collection) + its descriptor's
// default config. A consuming app overrides `offlineConfig` to point the leaf
// at its own checklist/planning schemas.
export { fieldInspectionIntegration, DEFAULT_FIELD_INSPECTION_CONFIG } from './builtin/field-inspection.js'

// Generic offline data-collection core, namespaced as a single object so the
// whole reusable surface (IndexedDB cache + mutation queue, pure sync-queue
// engine, replay-on-reconnect, planning-fetch contract, sync-state/checklist
// helpers) is one public export. Individual helpers stay importable from the
// `integrations/offline` subpath for tree-shaking. Extracted from procest's
// mobiel-inspectie-offline so any app reusing the leaf gets offline sync free.
export * as offlineCollection from './offline/index.js'

// Integration icon set — registers every descriptor's MDI glyph with
// CnIcon so the tabbed widget renders per-app icons (not the generic
// fallback) regardless of the host app's registerIcons() call.
export { registerIntegrationIcons, INTEGRATION_ICON_COMPONENTS } from './icons.js'
