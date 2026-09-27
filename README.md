# ooxml-validator

Fast, zero-dependency validator for Office Open XML files (docx/xlsx/pptx).
Runs as a standalone executable — no .NET installation required.
A compact platform-specific binary is installed automatically via optional dependencies.

Supports validation of:

- Word: .docx, .docm, .dotx, .dotm
- Excel: .xlsx, .xlsm, .xltx, .xltm, .xlam
- PowerPoint: .pptx, .pptm, .ppsx, .ppsm, .potx, .potm

## Installation

```bash
npm install @xarsh/ooxml-validator
```

## Usage

### As a Library

This package is ESM-only.

```javascript
import { validateFile, isValid } from '@xarsh/ooxml-validator'

// Simple validation
const valid = await isValid('document.docx')
console.log(valid) // true or false

// Detailed validation
const result = await validateFile('document.docx', {
  officeVersion: 'Office2019'
})

console.log(result.ok) // true or false
console.log(result.errors) // Array of validation errors
```

Both functions reject if the validator cannot be run at all (no binary for this platform, an
unknown `officeVersion`, unparsable output). A file that exists but cannot be opened is *not* a
rejection — see [Error types](#error-types).

### As a CLI

```bash
# Validate a file
npx @xarsh/ooxml-validator document.docx

# Specify Office version
npx @xarsh/ooxml-validator slides.pptx --officeVersion Office2019
```

The CLI takes exactly one file. On a validation run it prints a single JSON object to stdout and
nothing else; diagnostics go to stderr.

```json
{
  "file": "path/to/valid.pptx",
  "ok": true,
  "errors": []
}
```

```jsonc
{
  "file": "path/to/invalid.pptx",
  "ok": false,
  "errors": [
    {
      "description": "The element has unexpected child element 'http://schemas.openxmlformats.org/presentationml/2006/main:notesMasterIdLst'. List of possible elements expected: <http://schemas.openxmlformats.org/presentationml/2006/main:notesSz>.",
      "path": "/ppt/presentation.xml",
      "xPath": "/p:presentation[1]",
      "id": "Sch_UnexpectedElementContentExpectingComplex",
      "errorType": "Schema"
    },
    {
      "description": "The attribute 'x' has invalid value 'NaN'. The string 'NaN' is not a valid 'Int64' value.",
      "path": "/ppt/slides/slide3.xml",
      "xPath": "/p:sld[1]/p:cSld[1]/p:spTree[1]/p:sp[2]/p:spPr[1]/a:xfrm[1]/a:off[1]",
      "id": "Sch_AttributeValueDataTypeDetailed",
      "errorType": "Schema"
    },
    /* More errors ... */
  ]
}
```

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | The file is valid. |
| `1`  | The file is invalid, or could not be opened. |
| `2`  | Usage error, or the validator could not be run. |

So in CI you can just let a non-zero exit fail the step — no need to parse the JSON:

```bash
ooxml-validator file.pptx
```

Pipe it to jq when you want to inspect the errors:

```bash
ooxml-validator file.pptx | jq '.errors[].description'
```

### Error types

Every entry in `errors` has an `errorType`. `Schema`, `Semantic`, `Package`, and
`MarkupCompatibility` come from the Open XML SDK and describe a problem *inside* the document.
`Exception` means the file could not be validated at all — it is missing, corrupt, or has an
extension this tool does not handle — and its `path`, `xPath`, and `id` are `null`. Both cases
report `ok: false` and exit `1`, so check `errorType` if you need to tell them apart.

## Options

### Office Versions

- `Office2007`
- `Office2010`
- `Office2013`
- `Office2016`
- `Office2019`
- `Office2021`
- `Microsoft365` (default)

Names are matched exactly. Anything else is rejected rather than being quietly read as
`Microsoft365`.

## Environment Variables

If the optional dependency for your platform fails to install (e.g. `--no-optional`, unsupported platform), you can manually specify the validator CLI path:

```bash
export OOXML_VALIDATOR_CLI="/path/to/ooxml-validator"
```

The value is used verbatim as the executable path; it may contain spaces and takes no arguments.

## Requirements

The package ships platform-specific binaries via `optionalDependencies`; your package manager installs only the one matching your `os`/`cpu`. Supported platforms:
- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (arm64, x64)

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Third-Party Notices

This project includes the Open XML SDK, © Microsoft Corporation and contributors.
Licensed under the MIT License. See THIRD-PARTY-NOTICES.md for details.
