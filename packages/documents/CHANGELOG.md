# @ponado-org/documents

## 0.4.0

### Minor Changes

- 0173295: Remove `/pdf-local` and the pdf-lib dependency. PDF merging is Gotenberg-only;
  the local engine was unused and kept 23 MB in the development install.

## 0.3.0

### Minor Changes

- 619590e: Stop declaring subpath libraries as peer dependencies. GitHub Packages strips
  `peerDependenciesMeta` from its metadata, so pnpm installed every heavy SDK as
  a required dependency. The libraries are now documented in
  `subpathDependencies` and installed only by consumers that use the subpath.

## 0.2.0

### Minor Changes

- 400fb80: Make `/pdf` a zero-dependency Gotenberg merge client and move the pdf-lib
  implementation (merge/split/SVG helpers) to `/pdf-local`, so apps with a
  Gotenberg sidecar no longer install a 23 MB PDF engine.
