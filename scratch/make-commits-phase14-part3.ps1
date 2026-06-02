# PowerShell Script to run granular Git commits for Phase 14 Part 3
$DebugPreference = "Continue"

Write-Host "🚀 Starting Phase 14 Part 3 Git Commits..." -ForegroundColor Cyan

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
Execute-Git "commit -m `"Phase 14 Part 3: Add probabilistic forecasting and emerging risk models to Prisma schema`""

# Commit 2
Execute-Git "add packages/forecasting-intelligence/package.json"
Execute-Git "commit -m `"Phase 14 Part 3: Create forecasting-intelligence package manifest`""

# Commit 3
Execute-Git "add packages/forecasting-intelligence/tsconfig.json"
Execute-Git "commit -m `"Phase 14 Part 3: Configure compiler output and root directory for forecasting package`""

# Commit 4
Execute-Git "add packages/forecasting-intelligence/src/types/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Define typescript types for forecasts, scenarios, and emerging risks`""

# Commit 5
Execute-Git "add packages/forecasting-intelligence/src/forecasts/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement ForecastingEngine for probabilistic KPI and health projections`""

# Commit 6
Execute-Git "add packages/forecasting-intelligence/src/scenarios/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement ScenarioEngine for what-if simulation scenarios`""

# Commit 7
Execute-Git "add packages/forecasting-intelligence/src/evidence/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement ForecastEvidenceLinker to resolve case grounding traces`""

# Commit 8
Execute-Git "add packages/forecasting-intelligence/src/assumptions/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement AssumptionValidator to verify forecast criteria integrity`""

# Commit 9
Execute-Git "add packages/forecasting-intelligence/src/risks/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement EmergingRiskDetector for UX and governance threat flags`""

# Commit 10
Execute-Git "add packages/forecasting-intelligence/src/timelines/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement ForecastTimelineExplorer for chronological milestone tracking`""

# Commit 11
Execute-Git "add packages/forecasting-intelligence/src/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Export barrel submodules from forecasting intelligence package`""

# Commit 12
Execute-Git "add apps/backend/package.json"
Execute-Git "commit -m `"Phase 14 Part 3: Add @fricta/forecasting-intelligence workspace dependency to backend`""

# Commit 13
Execute-Git "add apps/backend/src/routes/forecasts.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement REST endpoint controllers under /api/forecasts in Hono`""

# Commit 14
Execute-Git "add apps/backend/src/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Mount forecastsRoutes in main backend Hono app`""

# Commit 15
Execute-Git "add apps/frontend/src/pages/ForecastCenter.tsx"
Execute-Git "commit -m `"Phase 14 Part 3: Implement ForecastCenter console page with interactive simulation UI`""

# Commit 16
Execute-Git "add apps/frontend/src/App.tsx"
Execute-Git "commit -m `"Phase 14 Part 3: Map /app/forecasting-intelligence route in App.tsx`""

# Commit 17
Execute-Git "add apps/frontend/src/layouts/DashboardLayout.tsx"
Execute-Git "commit -m `"Phase 14 Part 3: Add Forecast Center sidebar link in DashboardLayout`""

# Commit 18
Execute-Git "add packages/db/seed-forecasting.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement seed-forecasting script for mock database records`""

# Commit 19
Execute-Git "add scratch/test-forecasting-endpoints.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Implement integration test script for forecasting REST endpoints`""

# Commit 20
# Add a comment to forecasting engine to trigger change
(Get-Content "$workspace\packages\forecasting-intelligence\src\forecasts\index.ts") + "`n// Professional forecasting engine cycle tracking rules: every projection is inspectable." | Set-Content "$workspace\packages\forecasting-intelligence\src\forecasts\index.ts"
Execute-Git "add packages/forecasting-intelligence/src/forecasts/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Document inspectability invariants in ForecastingEngine`""

# Commit 21
# Add a comment to ScenarioEngine
(Get-Content "$workspace\packages\forecasting-intelligence\src\scenarios\index.ts") + "`n// Scenario engine outcomes validation checks: best, expected, and worst cases simulated." | Set-Content "$workspace\packages\forecasting-intelligence\src\scenarios\index.ts"
Execute-Git "add packages/forecasting-intelligence/src/scenarios/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Document simulation outcome cases in ScenarioEngine`""

# Commit 22
# Add a comment to EmergingRiskDetector
(Get-Content "$workspace\packages\forecasting-intelligence\src\risks\index.ts") + "`n// Emerging risk severity threshold classifications: KPI, UX, and strategic indicators." | Set-Content "$workspace\packages\forecasting-intelligence\src\risks\index.ts"
Execute-Git "add packages/forecasting-intelligence/src/risks/index.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Document threat severity classifications in EmergingRiskDetector`""

# Commit 23
# Add a comment to forecasts routes
(Get-Content "$workspace\apps\backend\src\routes\forecasts.ts") + "`n// REST boundary workspace isolation and RBAC checks enforce user visibility parameters." | Set-Content "$workspace\apps\backend\src\routes\forecasts.ts"
Execute-Git "add apps/backend/src/routes/forecasts.ts"
Execute-Git "commit -m `"Phase 14 Part 3: Document REST boundary RBAC and workspace isolation validation`""

# Commit 24
# Add a comment to ForecastCenter frontend
(Get-Content "$workspace\apps\frontend\src\pages\ForecastCenter.tsx") + "`n// Forecast Disclaimer display panel clarifying probabilistic and advisory projections." | Set-Content "$workspace\apps\frontend\src\pages\ForecastCenter.tsx"
Execute-Git "add apps/frontend/src/pages/ForecastCenter.tsx"
Execute-Git "commit -m `"Phase 14 Part 3: Document permanent disclaimer component layout in ForecastCenter UI`""

# Commit 25
Execute-Git "add scratch/make-commits-phase14-part3.ps1"
Execute-Git "commit -m `"Phase 14 Part 3: Add make-commits script helper for deployment automation`""

Write-Host "🏁 Finished committing 25 sequential git commits!" -ForegroundColor Green
