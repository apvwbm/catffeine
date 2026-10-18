# Genera los iconos de CAtFFEINE: la "t" minúscula de Archivo 800 convertida en gato, con
# orejas arriba y el pie alargado en una cola que sube enroscándose.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/iconos.ps1
# Solo hace falta volver a ejecutarlo si cambia el diseño del icono.

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$fuente = Join-Path $raiz 'node_modules/@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf'
$coleccion = New-Object System.Drawing.Text.PrivateFontCollection
$coleccion.AddFontFile($fuente)
$familia = $coleccion.Families[0]

$acento = [System.Drawing.ColorTranslator]::FromHtml('#3B4A8C')
$acentoOscuro = [System.Drawing.ColorTranslator]::FromHtml('#A5B0F0')
$blanco = [System.Drawing.Color]::White
$P = { param($x, $y) New-Object System.Drawing.PointF $x, $y }

# Las piezas, en coordenadas de la "t" a 0.78 de un lienzo de 1024 y centrada por su caja:
# tronco x 433–564 con la cabeza en y = 235, travesaño y 358–453, pie hasta x 646 entre
# y 694 y 789. Cada pieza va en su propio trazado (si se solapan dentro de uno, lo
# solapado queda hueco) y se solapan unos píxeles (dos bordes que solo se tocan dejan una
# costura al suavizar).
function Piezas {
  $lado = 1024
  $t = New-Object System.Drawing.Drawing2D.GraphicsPath
  $t.AddString('t', $familia, 0, [single]($lado * 0.78), (& $P 0 0), [System.Drawing.StringFormat]::GenericTypographic)
  $caja = $t.GetBounds()
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.Translate(($lado - $caja.Width) / 2 - $caja.X, ($lado - $caja.Height) / 2 - $caja.Y)
  $t.Transform($m)

  # Cabeza: el tronco recto hasta arriba (la "t" lo corta en diagonal) y dos orejas
  # abiertas hacia fuera.
  $cabeza = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cabeza.AddRectangle((New-Object System.Drawing.RectangleF 433, 235, 131, 140))
  $orejaI = New-Object System.Drawing.Drawing2D.GraphicsPath
  $orejaI.AddPolygon(@((& $P 433 250), (& $P 424 169), (& $P 505 250)))
  $orejaD = New-Object System.Drawing.Drawing2D.GraphicsPath
  $orejaD.AddPolygon(@((& $P 492 250), (& $P 573 169), (& $P 564 250)))

  # Cola: una Bézier que sale del pie con su grosor (95) y se afina hasta 48 con la punta
  # redonda. Se dibuja como polígono, desplazando cada punto por la normal.
  $c0 = & $P 575 741.5; $c1 = & $P 730 745; $c2 = & $P 805 650; $c3 = & $P 752 572
  $punta = 48
  $izq = @(); $der = @(); $n = 64
  for ($i = 0; $i -le $n; $i++) {
    $u = $i / $n; $v = 1 - $u
    $x = $v*$v*$v*$c0.X + 3*$v*$v*$u*$c1.X + 3*$v*$u*$u*$c2.X + $u*$u*$u*$c3.X
    $y = $v*$v*$v*$c0.Y + 3*$v*$v*$u*$c1.Y + 3*$v*$u*$u*$c2.Y + $u*$u*$u*$c3.Y
    $dx = 3*$v*$v*($c1.X-$c0.X) + 6*$v*$u*($c2.X-$c1.X) + 3*$u*$u*($c3.X-$c2.X)
    $dy = 3*$v*$v*($c1.Y-$c0.Y) + 6*$v*$u*($c2.Y-$c1.Y) + 3*$u*$u*($c3.Y-$c2.Y)
    $l = [Math]::Sqrt($dx*$dx + $dy*$dy); $nx = -$dy / $l; $ny = $dx / $l
    $w = (95 + ($punta - 95) * $u) / 2
    $izq += & $P ($x + $nx*$w) ($y + $ny*$w); $der += & $P ($x - $nx*$w) ($y - $ny*$w)
  }
  [array]::Reverse($der)
  $cola = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cola.AddPolygon([System.Drawing.PointF[]]($izq + $der))
  $remate = New-Object System.Drawing.Drawing2D.GraphicsPath
  $remate.AddEllipse($c3.X - $punta / 2, $c3.Y - $punta / 2, $punta, $punta)

  , @($t, $cabeza, $orejaI, $orejaD, $cola, $remate)
}

# El gato centrado por su caja, con su lado mayor a `escala` del lienzo.
function Dibujar($archivo, $fondo, $tinta, $escala) {
  $lado = 1024
  $bmp = New-Object System.Drawing.Bitmap $lado, $lado
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear($fondo)
  $piezas = Piezas
  $u = $piezas[0].GetBounds()
  foreach ($p in $piezas) { $u = [System.Drawing.RectangleF]::Union($u, $p.GetBounds()) }
  $k = $lado * $escala / [Math]::Max($u.Width, $u.Height)
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.Translate($lado / 2, $lado / 2)
  $m.Scale($k, $k)
  $m.Translate(-($u.X + $u.Width / 2), -($u.Y + $u.Height / 2))
  $pincel = New-Object System.Drawing.SolidBrush $tinta
  foreach ($p in $piezas) { $p.Transform($m); $g.FillPath($pincel, $p) }
  $bmp.Save((Join-Path $raiz "assets/$archivo"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$transparente = [System.Drawing.Color]::Transparent
Dibujar 'icon.png' $acento $blanco 0.66
# Adaptativo de Android: el sistema recorta un círculo del 66 % central, el gato va más pequeño.
Dibujar 'android-icon-foreground.png' $transparente $blanco 0.42
Dibujar 'android-icon-monochrome.png' $transparente $blanco 0.42
Dibujar 'splash-icon.png' $transparente $acento 0.66
Dibujar 'splash-icon-dark.png' $transparente $acentoOscuro 0.66
