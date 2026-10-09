# credentials-settings Delta: r4-object-lock-url-and-credentials-copy

## ADDED Requirements

### Requirement: The Credentials intro follows the Conduction voice

The intro text of `CnCredentials`, for the personal and the organisation scope,
SHALL contain no em-dash, SHALL keep each sentence under 16 words, and SHALL
have an English and a Dutch catalogue entry.

#### Scenario: A person opens Credentials in an app's user settings

- **GIVEN** the user settings dialog of pipelinq or dossiq
- **WHEN** the person opens Credentials
- **THEN** the intro reads "Apps sometimes act for you on an external service. You give the secret to Nextcloud once, and Keepiq keeps it in an encrypted vault. …" with no em-dash
- **AND** a Dutch user sees the Dutch text
