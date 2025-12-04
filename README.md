# ooxml-validator

A fast, zero-setup validator for Office Open XML files (docx/xlsx/pptx).
No .NET runtime, no extra tools required.
The validator binary for your platform is downloaded automatically during installation.

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
ooxml-validator document.docx

# Specify Office version
ooxml-validator slides.pptx --office-version Office2019
```

The CLI always prints a single JSON object to stdout:
```json
{
  "file": "path/to/file.pptx",
  "ok": false,
  "errors": [
    {
      "description": "Specified part does not exist in the package.",
      "path": "/ppt/presentation.xml",
      "xpath": "/p:presentation/...",
      "id": "SomeId",
      "errorType": "OpenXmlPackageException"
    }
  ]
}
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

MIT
