function Invoke-Api {
  param([string]$Method,[string]$Path,[string]$Token,[string]$Body)
  $url = "http://localhost:5000$Path"
  $curlArgs = @('-s','-X',$Method,'-w',"`n%{http_code}")
  if ($Token) { $curlArgs += @('-H', "Authorization: Bearer $Token") }
  if ($Body) {
    $f = Join-Path $env:TEMP ("req_" + [guid]::NewGuid().ToString() + ".json")
    [IO.File]::WriteAllText($f, $Body, (New-Object Text.UTF8Encoding $false))
    $curlArgs += @('-H','Content-Type: application/json','-d',"@$f")
  }
  $curlArgs += $url
  $lines = @(& curl.exe @curlArgs)
  $code = [int]$lines[-1]
  $bodyText = if ($lines.Count -gt 1) { ($lines[0..($lines.Count-2)] -join "`n") } else { '' }
  $json = $null
  try { $json = $bodyText | ConvertFrom-Json } catch {}
  [pscustomobject]@{ Status=$code; Raw=$bodyText; Json=$json }
}
