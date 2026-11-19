# @ponado-org/documents

## 0.2.0

### Minor Changes

- 400fb80: Make `/pdf` a zero-dependency Gotenberg merge client and move the pdf-lib
  implementation (merge/split/SVG helpers) to `/pdf-local`, so apps with a
  Gotenberg sidecar no longer install a 23 MB PDF engine.
