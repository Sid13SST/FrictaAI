# PowerShell Script to run granular Git commits for Phase 14 Part 4
$DebugPreference = "Continue"

Write-Host "🚀 Starting Phase 14 Part 4 Git Commits..." -ForegroundColor Cyan

# Ensure we are in the correct workspace directory
$workspace = "c:\Users\Siddhant\OneDrive\Desktop\FrictaAI"

# Helper function to run command in workspace
function Execute-Git {
    param([string]$arguments)
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = "git"
    $pinfo.Arguments = $arguments
    $pinfo.WorkingDirectory = $workspace
    $pinfo.UseShellExecute = $false
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $process = [System.Diagnostics.Process]::Start($pinfo)
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        Write-Host "Error running: git $arguments" -ForegroundColor Red
        Write-Host $stderr -ForegroundColor Red
    } else {
        Write-Host "Success: git $arguments" -ForegroundColor Green
        if ($stdout) { Write-Host $stdout }
    }
}

# Commit 1
Execute-Git "add packages/db/prisma/schema.prisma"
Execute-Git "commit -m `"Phase 14 Part 4: Add institutional wisdom and organizational principle models to schema.prisma`""

# Commit 2
Execute-Git "add packages/institutional-intelligence/package.json"
Execute-Git "commit -m `"Phase 14 Part 4: Create institutional-intelligence package manifest`""

# Commit 3
Execute-Git "add packages/institutional-intelligence/tsconfig.json"
Execute-Git "commit -m `"Phase 14 Part 4: Configure TypeScript compilation settings for institutional-intelligence package`""

# Commit 4
Execute-Git "add packages/institutional-intelligence/src/types/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Define TypeScript type specifications for wisdom records and snapshots`""

# Commit 5
Execute-Git "add packages/institutional-intelligence/src/wisdom/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement WisdomEngine core evaluation and snapshot execution cycle`""

# Commit 6
Execute-Git "add packages/institutional-intelligence/src/lessons/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement LessonSynthesizer to compile and update evidence-backed lessons`""

# Commit 7
Execute-Git "add packages/institutional-intelligence/src/principles/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement PrincipleDiscoverer for recurring organizational trends`""

# Commit 8
Execute-Git "add packages/institutional-intelligence/src/synthesis/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement MemorySynthesizer for cross-session knowledge consolidation`""

# Commit 9
Execute-Git "add packages/institutional-intelligence/src/evidence/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement WisdomEvidenceResolver for auditable trace chains`""

# Commit 10
Execute-Git "add packages/institutional-intelligence/src/history/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement HistoricalCaseSynthesizer to aggregate case stats and success rates`""

# Commit 11
Execute-Git "add packages/institutional-intelligence/src/outcomes/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement OutcomeWisdomAnalyzer to link strategic verdicts`""

# Commit 12
Execute-Git "add packages/institutional-intelligence/src/personas/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement PersonaWisdomLearner for persona completion intelligence`""

# Commit 13
Execute-Git "add packages/institutional-intelligence/src/governance/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement GovernanceWisdomAuditor for compliance audit verification`""

# Commit 14
Execute-Git "add packages/institutional-intelligence/src/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Export public submodules from institutional intelligence package barrel`""

# Commit 15
Execute-Git "add packages/realtime/src/types/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Register wisdom event types in RealtimeEventType union`""

# Commit 16
Execute-Git "add apps/backend/package.json"
Execute-Git "commit -m `"Phase 14 Part 4: Add @fricta/institutional-intelligence dependency to backend package`""

# Commit 17
Execute-Git "add apps/backend/src/routes/wisdom.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement Hono REST controllers for institutional wisdom endpoints`""

# Commit 18
Execute-Git "add apps/backend/src/index.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Mount wisdomRoutes under /api/wisdom in main Hono backend`""

# Commit 19
Execute-Git "add apps/frontend/src/pages/WisdomCenter.tsx"
Execute-Git "commit -m `"Phase 14 Part 4: Implement WisdomCenter console page with Obsidian dark styling`""

# Commit 20
Execute-Git "add apps/frontend/src/App.tsx"
Execute-Git "commit -m `"Phase 14 Part 4: Add route mapping for /app/institutional-wisdom in App.tsx`""

# Commit 21
Execute-Git "add apps/frontend/src/layouts/DashboardLayout.tsx"
Execute-Git "commit -m `"Phase 14 Part 4: Add sidebar navigation item for Wisdom Center in DashboardLayout`""

# Commit 22
Execute-Git "add packages/db/seed-wisdom.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement seed-wisdom script with project-workspace link verification`""

# Commit 23
Execute-Git "add scratch/test-wisdom-endpoints.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement REST integration test script for wisdom endpoints`""

# Commit 24
Execute-Git "add scratch/check-rbac.ts"
Execute-Git "commit -m `"Phase 14 Part 4: Implement RBAC diagnostics script for workspace project scope checks`""

# Commit 25
Execute-Git "add package-lock.json"
Execute-Git "commit -m `"Phase 14 Part 4: Update lockfile with newly linked workspace package`""

# Commit 26
Execute-Git "add scratch/make-commits-phase14-part4.ps1"
Execute-Git "commit -m `"Phase 14 Part 4: Add make-commits script helper for deployment automation`""

Write-Host "🏁 Finished committing 26 sequential git commits!" -ForegroundColor Green
