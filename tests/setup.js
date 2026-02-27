/**
 * Jest test setup — provides Nextcloud global mocks.
 */

// Mock the global OC object that Nextcloud provides
global.OC = {
	requestToken: 'test-token-12345',
	webroot: '',
	config: {
		session_lifetime: 86400,
	},
}

// Mock window.fetch if not available in jsdom
if (!global.fetch) {
	global.fetch = jest.fn()
}
