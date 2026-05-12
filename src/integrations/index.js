export {
	integrations,
	createIntegrationRegistry,
	installIntegrationRegistry,
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
} from './builtin/index.js'

// Leaf: XWiki ("Articles") — external, OpenConnector-backed. Not part
// of `builtinIntegrations`; register it explicitly via
// `registerXwikiIntegration()`.
export { xwikiIntegration, registerXwikiIntegration } from './builtin/xwiki.js'
