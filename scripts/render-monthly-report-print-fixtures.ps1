param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label = 'current',
    [Parameter(Mandatory = $false)][string]$Renderer = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    [ValidatePattern('^[a-z0-9-]+$')][string[]]$CaseId
)

$ErrorActionPreference = 'Stop'
$auditRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$auditDirectory = [IO.Path]::GetFullPath((Join-Path $auditRoot "tmp\monthly-report-print-audit\$Label"))
$allowedPrefix = $auditDirectory.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$rendererPath = [IO.Path]::GetFullPath($Renderer)
if (!(Test-Path -LiteralPath $rendererPath -PathType Leaf)) { throw "Chrome/Edge実行ファイルがありません: $rendererPath" }
if (!(Test-Path -LiteralPath $auditDirectory -PathType Container)) { throw "先にfixture生成を実行してください: $auditDirectory" }

$manifestPath = Join-Path $auditDirectory 'manifest.json'
$auditFixtures = @(Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json)
if ($CaseId) {
    $auditFixtures = @($auditFixtures | Where-Object { $_.id -in $CaseId })
    if ($auditFixtures.Count -ne $CaseId.Count) { throw '未登録または重複した検証条件が指定されています。' }
}
$renderRunId = [Guid]::NewGuid().ToString('N')

foreach ($fixture in $auditFixtures) {
    if ($fixture.id -notmatch '^[a-z0-9-]+$') { throw '不正な検証条件名です。' }
    $htmlPath = [IO.Path]::GetFullPath([string]$fixture.html)
    $pdfPath = [IO.Path]::GetFullPath([string]$fixture.pdf)
    if (!$htmlPath.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        !$pdfPath.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw '検証用領域外への読み書きは拒否しました。'
    }
    if (!(Test-Path -LiteralPath $htmlPath -PathType Leaf)) { throw "HTMLがありません: $htmlPath" }

    # 通常のブラウザと完全に分離した一時プロファイルで、ローカルHTMLだけをPDF化する。
    $profilePath = Join-Path $auditDirectory ("profile-" + $renderRunId + '-' + $fixture.id)
    $resolvedProfilePath = [IO.Path]::GetFullPath($profilePath)
    if (!$resolvedProfilePath.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw '検証用領域外のブラウザプロファイルは作成しません。'
    }
    try {
        New-Item -ItemType Directory -Path $resolvedProfilePath -Force | Out-Null
        $renderArguments = @(
            '--headless', '--no-pdf-header-footer', '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking', '--disable-sync', '--timeout=10000', '--virtual-time-budget=5000',
            "--user-data-dir=$resolvedProfilePath", "--print-to-pdf=$pdfPath", ([Uri]::new($htmlPath).AbsoluteUri)
        )
        $renderStartedAt = [DateTime]::UtcNow
        $errorLog = Join-Path $auditDirectory ("render-" + $fixture.id + '.log')
        $renderProcess = Start-Process -FilePath $rendererPath -ArgumentList $renderArguments -WindowStyle Hidden -RedirectStandardError $errorLog -PassThru
        if (!$renderProcess.WaitForExit(30000)) {
            $renderProcess.Kill($true)
            $renderProcess.WaitForExit()
            throw "PDF生成が制限時間を超えました。検証専用プロセスID: $($renderProcess.Id)"
        }
        if ($renderProcess.ExitCode -ne 0) {
            throw "PDF生成に失敗しました: $($fixture.id) / 終了値: $($renderProcess.ExitCode) / 詳細: $errorLog"
        }
        # Edgeは起動用プロセスが先に終了することがあるため、PDFの書き込み完了も待つ。
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
        if (!$isNewPdf) { throw "今回の検証で生成されたPDFではありません: $($fixture.id)" }
        Write-Output "PDF生成: $($fixture.id) ($([IO.Path]::GetFileName($rendererPath)))"
    } finally {
        # このスクリプトが作った検証専用プロファイルだけを後始末する。
        for ($attempt = 0; $attempt -lt 5 -and (Test-Path -LiteralPath $resolvedProfilePath); $attempt++) {
            try { Remove-Item -LiteralPath $resolvedProfilePath -Recurse -Force -ErrorAction Stop }
            catch {
                if ($attempt -eq 4) { Write-Warning "検証用プロファイルを削除できませんでした: $resolvedProfilePath" }
                else { Start-Sleep -Milliseconds 300 }
            }
        }
    }
}
