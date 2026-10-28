# index-page Delta

## ADDED Requirements

### Requirement: The count line can name sums and values

An index page in the board look SHALL fill a count-line token that names a `countValues` entry with that value in its
format, SHALL read a sum entry under the list's active filters and read it again when they change, and SHALL leave a
token empty while its value is unknown.

#### Scenario: The lead pipeline

- **GIVEN** `countText: "{shown} van {total} open leads · {pipeline|currency:EUR} in de pijplijn"` and
  `countValues: { pipeline: { metric: "sum", field: "value" } }`
- **WHEN** the open leads of the sales pipeline sum to 509928
- **THEN** the line reads "15 van 15 open leads · € 509.928 in de pijplijn"

#### Scenario: An endpoint value that follows the filters

- **GIVEN** `countValues: { weighted: { endpoint: "/apps/pipelinq/api/analytics/commercial", path: "weightedForecast", followFilters: true } }`
- **WHEN** the list filters on `pipeline = p-sales`
- **THEN** the endpoint is asked with `filter[pipeline]=p-sales`
