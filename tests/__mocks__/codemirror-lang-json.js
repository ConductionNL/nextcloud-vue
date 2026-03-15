/**
 * Mock for @codemirror/lang-json — provides no-op extensions for tests.
 */
export function json() {
	return {}
}

export function jsonParseLinter() {
	return () => []
}
