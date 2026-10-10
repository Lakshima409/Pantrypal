$ProgressPreference='SilentlyContinue'
$headers = @{ Accept = 'application/json' }
try {
  $r = Invoke-WebRequest -Uri 'https://unsplash.com/napi/search/photos?query=calzone%20pizza%20pasta%20fries%20panini&per_page=24' -UseBasicParsing -TimeoutSec 30 -Headers $headers
  $j = $r.Content | ConvertFrom-Json
  $i = 0
  foreach ($p in $j.results) {
    $raw = $p.urls.raw
    if ($raw -match 'photo-([0-9a-zA-Z\-_]+)') {
      $id = $Matches[1]
      $alt = $p.alt_description
      if ($alt -eq $null) { $alt = '' }
      Write-Output ("{0} :: {1} :: {2}" -f $i, $id, $alt)
      $i++
    }
  }
} catch {
  Write-Output ("ERR " + $_.Exception.Message)
}
