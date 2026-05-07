@echo off
echo ==============================
echo   AgriVision ML Server
echo ==============================
echo.

cd /d "%~dp0"

:: Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo Creating venv with Python 3.10...
    echo.
    "C:\Users\noura\AppData\Local\Programs\Python\Python310\python.exe" -m venv venv
    call venv\Scripts\activate
    echo Installing requirements...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo.
echo [INFO] Using Python: 
python --version
echo.

:: Run the Flask ML server
python app.py

pause
