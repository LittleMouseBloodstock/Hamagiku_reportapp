param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('hamagiku', 'shinba')]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

$repoRoot = git rev-parse --show-toplevel
$configPath = Join-Path $repoRoot 'ops/production-boundaries.json'
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$currentBranch = (git branch --show-current).Trim()
$dirty = git status --porcelain

if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    throw 'Deployment refused: detached HEAD is not an allowed production source.'
}

if ($dirty) {
    throw 'Deployment refused: working tree is not clean. Commit the target product changes first.'
}

if ($Target -eq 'hamagiku') {
    $rule = $config.hamagiku
    if ($currentBranch -ne $rule.sourceBranch) {
        throw "Deployment refused: Hamagiku production only accepts branch '$($rule.sourceBranch)'; current branch is '$currentBranch'."
    }

    $originMain = (git rev-parse "origin/$($rule.sourceBranch)").Trim()
    $head = (git rev-parse HEAD).Trim()
    if ($head -ne $originMain) {
        throw "Deployment refused: Hamagiku source must equal origin/$($rule.sourceBranch) ($originMain); current HEAD is $head."
    }

    if ($rule.supabaseUrl -eq $config.shinba.supabaseUrl) {
        throw 'Deployment refused: Hamagiku and Shinba Supabase targets are identical.'
    }
}

if ($Target -eq 'shinba') {
    $rule = $config.shinba
    if ($currentBranch -ne $rule.sourceBranch) {
        throw "Deployment refused: Shinba production only accepts branch '$($rule.sourceBranch)'; current branch is '$currentBranch'."
    }

    if ($rule.supabaseUrl -eq $config.hamagiku.supabaseUrl) {
        throw 'Deployment refused: Shinba and Hamagiku Supabase targets are identical.'
    }
}

Write-Output "Production deployment guard passed for $Target ($currentBranch)."
Write-Output "Source: $((git rev-parse HEAD).Trim())"
Write-Output "Supabase: $($rule.supabaseUrl)"
