# @ponado-org/integrations

## 0.2.0

### Minor Changes

- 619590e: Stop declaring subpath libraries as peer dependencies. GitHub Packages strips
  `peerDependenciesMeta` from its metadata, so pnpm installed every heavy SDK as
  a required dependency. The libraries are now documented in
  `subpathDependencies` and installed only by consumers that use the subpath.
