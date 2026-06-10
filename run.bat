@echo off
setlocal enabledelayedexpansion

set TOOLS_DIR=tools
set GODOT_EXE=%TOOLS_DIR%\godot.exe

echo [1/4] Checking tools folder ...
if not exist "%TOOLS_DIR%" (
    mkdir "%TOOLS_DIR%"
    echo   Created tools folder
) else (
    echo   OK
)

echo [2/4] Checking Godot executable ...
if not exist "%GODOT_EXE%" (
    echo   Not found. Downloading Godot 4.3 ...
    echo.
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_win64.exe.zip' -OutFile '%TOOLS_DIR%\godot.zip' -UseBasicParsing"
    if errorlevel 1 (
        echo   FAILED to download. Try manual download:
        echo     https://godotengine.org/download
        echo.
        echo   Place the exe in "%CD%\%TOOLS_DIR%\" and rename to godot.exe
        echo.
        pause
        exit /b
    )
    echo   Extracting ...
    powershell -Command "Expand-Archive -Path '%TOOLS_DIR%\godot.zip' -DestinationPath '%TOOLS_DIR%' -Force"
    del "%TOOLS_DIR%\godot.zip"
    for %%f in ("%TOOLS_DIR%\Godot_*.exe") do ren "%%f" godot.exe
    if not exist "%GODOT_EXE%" (
        echo   FAILED to extract. Manual download required.
        pause
        exit /b
    )
    echo   Download complete.
) else (
    echo   OK
)

echo [3/4] Launching Godot ...
start "" "%GODOT_EXE%" --path "." --
if errorlevel 1 (
    echo   FAILED to launch Godot.
    pause
    exit /b
)

echo [4/4] Game running. Close Godot window to stop.
echo.
