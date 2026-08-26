param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label = 'current',
    [string]$Renderer = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    [ValidatePattern('^[a-z0-9-]+$')][string[]]$CaseId
)

$ErrorActionPreference = 'Stop'
$auditRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$auditDirectory = Join-Path $auditRoot "tmp\departure-print-audit\$Label"
$auditFixtures = Get-Content -Raw -LiteralPath (Join-Path $auditDirectory 'manifest.json') | ConvertFrom-Json
if ($CaseId) {
    $auditFixtures = @($auditFixtures | Where-Object { $_.id -in $CaseId })
    if ($auditFixtures.Count -ne $CaseId.Count) { throw '未登録または重複した検証条件が指定されています。' }
}
$renderRunId = [Guid]::NewGuid().ToString('N')

foreach ($fixture in $auditFixtures) {
    if ($fixture.id -notmatch '^[a-z0-9-]+$') { throw '不正な検証条件名です。' }
    $htmlPath = [IO.Path]::GetFullPath($fixture.html)
    $pdfPath = [IO.Path]::GetFullPath($fixture.pdf)
    $allowedPrefix = [IO.Path]::GetFullPath($auditDirectory) + [IO.Path]::DirectorySeparatorChar
    if (!$htmlPath.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        !$pdfPath.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw '検証用領域外への読み書きは拒否しました。'
    }
    if (!(Test-Path -LiteralPath $htmlPath -PathType Leaf)) { throw "HTMLがありません: $htmlPath" }

    # 通常のブラウザと完全に分離した一時プロファイルで、ローカルHTMLだけをPDF化する。
    $profilePath = Join-Path $auditDirectory ("profile-" + $renderRunId + '-' + $fixture.id)
    if (!(Test-Path -LiteralPath $profilePath)) {
        New-Item -ItemType Directory -Path $profilePath | Out-Null
    }
    $renderArguments = @(
        '--headless', '--no-pdf-header-footer', '--no-first-run', '--no-default-browser-check',
        '--disable-extensions', '--disable-background-networking', '--timeout=10000', '--virtual-time-budget=5000',
        "--user-data-dir=`"$profilePath`"", "--print-to-pdf=`"$pdfPath`"",
        ([Uri]::new($htmlPath).AbsoluteUri)
    )
    $renderStartedAt = [DateTime]::UtcNow
    $errorLog = Join-Path $auditDirectory ("render-" + $fixture.id + '.log')
    $renderProcess = Start-Process -FilePath $Renderer -ArgumentList $renderArguments -WindowStyle Hidden -RedirectStandardError $errorLog -PassThru
    if (!$renderProcess.WaitForExit(30000)) {
        throw "PDF生成が制限時間を超えました。検証専用プロセスID: $($renderProcess.Id)"
    }
    if ($renderProcess.ExitCode -ne 0) {
        throw "PDF生成に失敗しました: $($fixture.id) / 終了値: $($renderProcess.ExitCode) / 詳細: $errorLog"
    }
    # Edgeは起動用プロセスが先に終了するため、今回のPDFの書き込み完了も待つ。
    $isNewPdf = $false
    do {
        if (Test-Path -LiteralPath $pdfPath -PathType Leaf) {
            $generatedPdf = Get-Item -LiteralPath $pdfPath
            if ($generatedPdf.Length -gt 0 -and $generatedPdf.LastWriteTimeUtc -ge $renderStartedAt) {
                try {
                    $pdfStream = [IO.File]::Open($pdfPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
                    $pdfStream.Dispose()
                    $isNewPdf = $true
                } catch [IO.IOException] { }
            }
        }
        if (!$isNewPdf) { Start-Sleep -Milliseconds 200 }
    } while (!$isNewPdf -and [DateTime]::UtcNow -lt $renderStartedAt.AddSeconds(30))
    if (!$isNewPdf) {
        throw "今回の検証で生成されたPDFではありません: $($fixture.id)"
    }
    Write-Output "PDF生成: $($fixture.id)"
}
