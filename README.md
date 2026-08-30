# Aurum · XAU/USD Live

Dashboard ligero en Python para seguir la cotización spot de **XAU/USD** mediante velas japonesas. Incluye intervalos de 1 minuto a 1 día, zoom, una media móvil simple de 20 periodos, RSI de 14 periodos y actualización automática configurable entre 1 segundo y 1 minuto.

## Ejecutar

No requiere dependencias externas; basta Python 3.10 o posterior:

```bash
python app.py
```

Abre <http://localhost:8000>. Puedes cambiar el puerto con `PORT=9000 python app.py`.

## Notas

- La cotización procede del endpoint público de Yahoo Finance y es indicativa; puede sufrir retrasos o interrupciones.
- El intervalo de 4 horas se construye agregando velas de 1 hora.
- La SMA 20 y el RSI 14 se calculan en el navegador con todo el histórico cargado y se pueden activar o desactivar desde la barra de la gráfica.
- Las señales, SL y TP se incorporarán en fases posteriores.

## Pruebas

```bash
python -m unittest discover -s tests -v
```
