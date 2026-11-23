# Proposal: api-call-get-download

## Why

DqDoorlooptijd draws "Downloaden" in its header: the processing-time figures for the period and case type the page
shows, as CSV. dossiq serves them on `GET /api/doorlooptijd/metrics?format=csv`. A header action could download a file
(`api-call` with `download: true`) only through POST or PUT, and a `navigate` to an app path is a route, not a file.

## What changes

An `api-call` action may use `method: "GET"`: its resolved `params` go as the query string (an unresolved optional
token is dropped), and with `download: true` the answer is downloaded as a file named by its Content-Disposition.
The manifest schema moves to 2.135.0.
