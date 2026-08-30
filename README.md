# Aurum · XAU/USD Live

Dashboard ligero en Python para seguir la cotización spot de **XAU/USD** mediante velas japonesas. Incluye intervalos de 1 minuto a 1 día, zoom, múltiples medias móviles simples y exponenciales configurables, RSI, ATR y actualización automática configurable entre 1 segundo y 1 minuto.

## Ejecutar

No requiere dependencias externas; basta Python 3.10 o posterior:

```bash
python app.py
```

Abre <http://localhost:8000>. Puedes cambiar el puerto con `PORT=9000 python app.py`.

## Notas

- La cotización procede del endpoint público de Yahoo Finance y es indicativa; puede sufrir retrasos o interrupciones.
- El intervalo de 4 horas se construye agregando velas de 1 hora.
- Las SMA, EMA, el RSI 14 y el ATR se calculan en el navegador con todo el histórico cargado. El desplegable **Indicadores** permite superponer hasta ocho medias de cada tipo y configurar de forma independiente su periodo (entre 2 y 200), color y grosor; el periodo del ATR también es configurable.
- Las señales, SL y TP se incorporarán en fases posteriores.

## Pruebas

```bash
python -m unittest discover -s tests -v
```
