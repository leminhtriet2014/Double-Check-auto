$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $file = (Get-ChildItem -Path "c:\Users\1221390\Desktop\Agent double check new item" -Filter "*leadtime*.xlsx")[0].FullName
    $wb = $excel.Workbooks.Open($file)
    $ws = $wb.Worksheets.Item(1)
    $usedRange = $ws.UsedRange
    $rows = $usedRange.Rows.Count
    $list = @()
    for ($r = 2; $r -le $rows; $r++) {
        $type = [string]$ws.Cells.Item($r, 1).Text
        $code = [string]$ws.Cells.Item($r, 2).Text
        $proc = [string]$ws.Cells.Item($r, 3).Text
        $desc = [string]$ws.Cells.Item($r, 4).Text
        $ltStr = [string]$ws.Cells.Item($r, 5).Text
        $remark = [string]$ws.Cells.Item($r, 6).Text
        if ($code -ne "" -or $proc -ne "") {
            $lt = 0
            if ($ltStr -ne "") {
                [double]::TryParse($ltStr, [ref]$lt) | Out-Null
            }
            $list += [PSCustomObject]@{
                category = $type.Trim()
                code = $code.Trim()
                process = $proc.Trim()
                description = $desc.Trim()
                leadtime = $lt
                remark = $remark.Trim()
            }
        }
    }
    $json = $list | ConvertTo-Json -Depth 5
    Set-Content -Path "c:\Users\1221390\Desktop\Agent double check new item\double_check_tool\config\leadtime_rules.json" -Value $json -Encoding UTF8
    Write-Host "Exported $($list.Count) leadtime rules to leadtime_rules.json"
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}

