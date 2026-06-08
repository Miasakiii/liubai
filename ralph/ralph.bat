@echo off
REM Ralph — Autonomous PRD Executor (Windows)
REM Iterates through prd.json user stories, spawning a fresh AI agent per story.

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PRD_FILE=%SCRIPT_DIR%prd.json
set PROGRESS_FILE=%SCRIPT_DIR%progress.txt

REM Check dependencies
where jq >nul 2>&1 || (echo [ERROR] jq is required. Install: winget install jqlang.jq & exit /b 1)
where claude >nul 2>&1 || (echo [ERROR] claude CLI not found. Install Claude Code first. & exit /b 1)

if not exist "%PRD_FILE%" (
    echo [ERROR] prd.json not found at %PRD_FILE%
    exit /b 1
)

REM Parse PRD
for /f "tokens=*" %%a in ('jq -r ".project" "%PRD_FILE%"') do set PROJECT=%%a
for /f "tokens=*" %%a in ('jq -r ".branchName" "%PRD_FILE%"') do set BRANCH=%%a
for /f "tokens=*" %%a in ('jq -r ".userStories | length" "%PRD_FILE%"') do set STORY_COUNT=%%a

echo [ralph] Project: %PROJECT%
echo [ralph] Branch:  %BRANCH%
echo [ralph] Stories: %STORY_COUNT%
echo.

REM Git branch
cd /d "%SCRIPT_DIR%\.."
git checkout "%BRANCH%" 2>nul || git checkout -b "%BRANCH%"

REM Run stories
set PASSED=0
set FAILED=0

for /l %%i in (0,1,%STORY_COUNT%) do (
    if %%i LSS %STORY_COUNT% (
        for /f "tokens=*" %%a in ('jq -r ".userStories[%%i].id" "%PRD_FILE%"') do set ID=%%a
        for /f "tokens=*" %%a in ('jq -r ".userStories[%%i].title" "%PRD_FILE%"') do set TITLE=%%a
        for /f "tokens=*" %%a in ('jq -r ".userStories[%%i].passes" "%PRD_FILE%"') do set PASSES=%%a

        echo.
        echo ================================================================
        echo [ralph] [%%i/%STORY_COUNT%] !ID!: !TITLE!
        echo ================================================================

        if "!PASSES!"=="true" (
            echo [SKIP] !ID! already passed.
        ) else (
            echo [ralph] Spawning Claude agent...

            for /f "tokens=*" %%a in ('jq -r ".userStories[%%i].description" "%PRD_FILE%"') do set DESC=%%a
            for /f "tokens=*" %%a in ('jq -r ".userStories[%%i].acceptanceCriteria | join(\"\\n- \")" "%PRD_FILE%"') do set CRITERIA=%%a

            claude -p "You are implementing a user story for the project '%PROJECT%'. !ID!: !TITLE! — !DESC!. Acceptance Criteria: -!CRITERIA!. Read the codebase, implement the changes, meet all criteria. Project root: %CD%" --allowedTools "Edit,Write,Bash,Read,Glob,Grep"

            if !errorlevel! equ 0 (
                echo [OK] !ID! completed.
                jq ".userStories[%%i].passes = true" "%PRD_FILE%" > "%PRD_FILE%.tmp" && move /y "%PRD_FILE%.tmp" "%PRD_FILE%" >nul
                git add -A && git commit -m "feat(!ID!): !TITLE!"
                set /a PASSED+=1
            ) else (
                echo [FAIL] !ID! failed.
                set /a FAILED+=1
            )
        )
    )
)

echo.
echo ================================================================
echo [ralph] COMPLETE
echo ================================================================
echo [OK] Passed: %PASSED%
echo [FAIL] Failed: %FAILED%
echo.
if %FAILED%==0 (
    echo All stories passed! Branch '%BRANCH%' is ready.
) else (
    echo %FAILED% story/stories failed. Check progress.txt.
)

endlocal
