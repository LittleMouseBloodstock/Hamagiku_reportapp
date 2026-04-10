param(
  [string]$OutputPath = ".\evals\results\report-eval-incremental.json",
  [int]$Offset = 0,
  [int]$Limit = 2
)

$resolvedOutput = Resolve-Path -LiteralPath (Split-Path -Parent $OutputPath) -ErrorAction SilentlyContinue
if (-not $resolvedOutput) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $OutputPath) -Force | Out-Null
}

$fullOutputPath = [System.IO.Path]::GetFullPath($OutputPath)

Write-Host "Running incremental eval..."
Write-Host "  Output: $fullOutputPath"
Write-Host "  Offset: $Offset"
Write-Host "  Limit : $Limit"

node .\run_report_eval.js --offset=$Offset --limit=$Limit --append-to=$fullOutputPath
