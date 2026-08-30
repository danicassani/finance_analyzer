# Aurum · XAU/USD Live

Dashboard ligero en Python para seguir la cotización spot de **XAU/USD** mediante velas japonesas. Incluye intervalos de 1 minuto a 1 día y actualización automática cada 15 segundos.

## Ejecutar

No requiere dependencias externas; basta Python 3.10 o posterior:

```bash
python app.py
```

Abre <http://localhost:8000>. Puedes cambiar el puerto con `PORT=9000 python app.py`.

## Notas

- La cotización procede del endpoint público de Yahoo Finance y es indicativa; puede sufrir retrasos o interrupciones.
- El intervalo de 4 horas se construye agregando velas de 1 hora.
- Esta primera versión es exclusivamente visual. Las señales, SL y TP se incorporarán en fases posteriores.

## Pruebas

```bash
python -m unittest discover -s tests -v
```
