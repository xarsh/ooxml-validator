# ooxml-validator

Fast, zero-dependency validator for Office Open XML files (docx/xlsx/pptx).
Runs as a standalone executable — no .NET installation required.
A compact platform-specific binary is downloaded automatically during installation.

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

### As a CLI

```bash
# Validate a file
npx @xarsh/ooxml-validator document.docx

# Specify Office version
npx @xarsh/ooxml-validator slides.pptx --office-version Office2019
```

The CLI always prints a single JSON object to stdout:

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

This structured output is easy to consume from scripts and CI pipelines.
For example, you can pipe it to jq to filter errors or fail the build when ok is false.

```bash
# Fail if any file is invalid
ooxml-validator file.pptx \
  | jq -e 'select(.ok == false)' > /dev/null && echo "invalid" && exit 1
```

## Options

### Office Versions

- `Office2007`
- `Office2010`
- `Office2013`
- `Office2016`
- `Office2019`
- `Office2021`
- `Microsoft365` (default)

## Environment Variables

If the automatic binary download fails, you can manually specify the validator CLI path:

```bash
export OOXML_VALIDATOR_CLI="/path/to/ooxml-validator"
```

## Requirements

The package automatically downloads platform-specific binaries during installation. Supported platforms:
- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (arm64, x64)

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Third-Party Notices

This project includes the Open XML SDK, © Microsoft Corporation and contributors.
Licensed under the MIT License. See THIRD-PARTY-NOTICES.md for details.
