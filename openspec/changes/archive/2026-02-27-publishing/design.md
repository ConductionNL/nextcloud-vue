# Publishing — Design

## Pipeline
- **semantic-release** with @semantic-release/npm plugin handles version bumping and npm publish
- **prepare script** in package.json runs the build step before publish
- **.releaserc.json** configures plugins: commit-analyzer, release-notes-generator, npm, github
- **release.yml** GitHub Actions workflow triggers on push to main, runs build + semantic-release
