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
