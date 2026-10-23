# Proposal: api-call-patch

## Why

Board DqSociaalDomein draws "Toestemming intrekken" under the consent facts.
Withdrawing a consent changes two fields of the consent object; OpenRegister's
objects API takes that as a PATCH, and an `api-call` action could only send
POST, PUT or GET. A PUT replaces the whole object.

## What changes

An `api-call` action may declare `method: "PATCH"`: the resolved payload is
sent as a PATCH, so only those fields change. Manifest schema 2.151.0 (the
integrator renumbers).
