

' --------  Uninstall Dinkey Dongle --------------

Dim WshShell 
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.Run "setupdrv.exe /ufull", 1 , true

' -------- Now Please Reboot the System ----------

MsgBox( "Please restart Windows for changes to take place" )

