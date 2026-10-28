# store-page: delta for store-publish-dialog

## ADDED Requirements

### Requirement: The store page publishes through a dialog

When the app is `publishable`, Publish MUST open a dialog. It MUST offer the app's kinds and, for the chosen kind, the local configuration the app lists. It MUST post the item and the chosen objects to the app's publish route, and say what to do when the publish does not succeed.

#### Scenario: publish a pipeline template

- GIVEN the pipeline "Woo-vragen" is listed for kind pipeline
- WHEN the user names the item "Pipeline voor Woo-vragen", ticks "Woo-vragen" and publishes
- THEN the app receives the item with slug "pipeline-voor-woo-vragen", kind pipeline and version 1.0.0, and the object it carries
- AND the page searches the store again

#### Scenario: no registry

- GIVEN the app has no store registry
- WHEN the user publishes
- THEN the dialog says that an administrator connects one under Administration settings
