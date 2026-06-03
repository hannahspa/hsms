@echo off
REM ============================================================
REM  Hannah Spa - Cai dat in hoa don THANG (khong hop thoai)
REM  Chay 1 LAN tren may Le Tan -> tao icon "Hannah Spa POS"
REM ============================================================

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo [LOI] Khong tim thay Google Chrome. Hay cai Chrome truoc.
  pause
  exit /b
)

set "URL=https://hannahspa.vn/pos/danh-sach"

powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell; $l=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Hannah Spa POS.lnk'); $l.TargetPath='%CHROME%'; $l.Arguments='--kiosk-printing --new-window %URL%'; $l.IconLocation='%CHROME%,0'; $l.Save()"

echo.
echo [XONG] Da tao icon "Hannah Spa POS" tren Desktop.
echo Le Tan LUON mo HSMS bang icon nay de in thang (khong mo Chrome thuong).
echo Nho: dat may in nhiet la may in MAC DINH + kho giay 80mm.
echo.
pause
