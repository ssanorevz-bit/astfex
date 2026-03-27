$cfg = "C:\ProgramData\ssh\sshd_config"
"Port 22" | Set-Content $cfg
"PasswordAuthentication yes" | Add-Content $cfg
"PubkeyAuthentication yes" | Add-Content $cfg
"AuthorizedKeysFile .ssh/authorized_keys" | Add-Content $cfg
"Subsystem sftp C:/OpenSSH/OpenSSH-Win64/sftp-server.exe" | Add-Content $cfg
"" | Add-Content $cfg
"Match Group administrators" | Add-Content $cfg
"    AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys" | Add-Content $cfg
Start-Service sshd
Write-Host "sshd: $((Get-Service sshd).Status)" -ForegroundColor Green
Get-Content $cfg
