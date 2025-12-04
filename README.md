# ooxml-validator

Node.js wrapper for OOXML (Office Open XML) file validation. Validates .docx, .xlsx, .pptx files against Office standards.

## Installation

```bash
npm install ooxml-validator
```

## Usage

### As a Library

```javascript
import { validateFile, isValid } from 'ooxml-validator'

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
ooxml-validate document.docx

# Specify Office version
ooxml-validate document.docx --office-version Office2019

# JSON output
ooxml-validate document.docx --json
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
export OOXML_VALIDATOR_CLI="dotnet /path/to/OOXMLValidatorCLI.dll"
```

## Requirements

The package automatically downloads platform-specific binaries during installation. Supported platforms:
- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (arm64, x64)

## License

MIT
