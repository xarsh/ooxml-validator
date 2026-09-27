using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

// Only the exact names below are accepted. Enum.TryParse would also accept different casing,
// numeric values ("16"), and flag combinations ("Office2007,Office2010"), and would fall back to
// Microsoft365 for anything else -- reporting a file as valid against a schema version the caller
// never asked for.
static FileFormatVersions? ParseOfficeVersion(string value) => value switch
{
  "Office2007" => FileFormatVersions.Office2007,
  "Office2010" => FileFormatVersions.Office2010,
  "Office2013" => FileFormatVersions.Office2013,
  "Office2016" => FileFormatVersions.Office2016,
  "Office2019" => FileFormatVersions.Office2019,
  "Office2021" => FileFormatVersions.Office2021,
  "Microsoft365" => FileFormatVersions.Microsoft365,
  _ => null
};

const string Usage = "Usage: ooxml-validator <file> [Office2007|Office2010|Office2013|Office2016|Office2019|Office2021|Microsoft365]";

if (args.Length is 0 or > 2)
{
  Console.Error.WriteLine(Usage);
  return 2;
}

var file = args[0];
var versionArg = args.Length > 1 ? args[1] : "Microsoft365";

if (ParseOfficeVersion(versionArg) is not { } ffVersion)
{
  Console.Error.WriteLine($"Invalid Office version '{versionArg}'.");
  Console.Error.WriteLine(Usage);
  return 2;
}

var result = new ValidationResultDto
{
  File = file,
  Errors = new List<ValidationErrorDto>()
};

var jsonOptions = new JsonSerializerOptions
{
  PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
  DictionaryKeyPolicy = JsonNamingPolicy.CamelCase,
  WriteIndented = true
};

try
{
  using var doc = OpenPackage(file);
  var validator = new OpenXmlValidator(ffVersion);

  foreach (var error in validator.Validate(doc))
  {
    result.Errors.Add(new ValidationErrorDto
    {
      Description = error.Description,
      Path = error.Part?.Uri.ToString(),
      XPath = error.Path?.XPath,
      ErrorType = error.ErrorType.ToString(),
      Id = error.Id
    });
  }

  result.Ok = result.Errors.Count == 0;

  var json = JsonSerializer.Serialize(result, jsonOptions);
  Console.WriteLine(json);
  return 0;
}
catch (Exception ex)
{
  var errorResult = new ValidationResultDto
  {
    File = file,
    Ok = false,
    Errors = new List<ValidationErrorDto>
        {
            new ValidationErrorDto
            {
                Description = ex.Message,
                ErrorType = "Exception"
            }
        }
  };
  Console.WriteLine(JsonSerializer.Serialize(errorResult, jsonOptions));
  return 0;
}

// ----- helper / DTO -----

static OpenXmlPackage OpenPackage(string path)
{
  var ext = Path.GetExtension(path).ToLowerInvariant();
  return ext switch
  {
    ".docx" or ".docm" or ".dotx" or ".dotm"
        => WordprocessingDocument.Open(path, false),
    ".pptx" or ".pptm" or ".potx" or ".potm" or ".ppsx" or ".ppsm"
        => PresentationDocument.Open(path, false),
    ".xlsx" or ".xlsm" or ".xltx" or ".xltm" or ".xlam"
        => SpreadsheetDocument.Open(path, false),
    _ => throw new InvalidOperationException($"Unsupported extension: {ext}")
  };
}

public sealed class ValidationResultDto
{
  public string File { get; set; } = "";
  public bool Ok { get; set; }
  public List<ValidationErrorDto> Errors { get; set; } = new();
}

public sealed class ValidationErrorDto
{
  public string? Description { get; set; }
  public string? Path { get; set; }
  public string? XPath { get; set; }
  public string? Id { get; set; }
  public string? ErrorType { get; set; }
}
