using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

if (args.Length == 0)
{
  Console.Error.WriteLine("Usage: ooxml-validator-cli <file> [OfficeVersion]");
  return 1;
}

var file = args[0];
var versionArg = args.Length > 1 ? args[1] : "Microsoft365";

if (!Enum.TryParse<FileFormatVersions>(versionArg, out var ffVersion))
{
  ffVersion = FileFormatVersions.Microsoft365;
}

var result = new ValidationResultDto
{
  File = file,
  Errors = new List<ValidationErrorDto>()
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

  var json = JsonSerializer.Serialize(result);
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
  Console.WriteLine(JsonSerializer.Serialize(errorResult));
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
