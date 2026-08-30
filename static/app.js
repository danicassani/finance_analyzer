const canvas = document.querySelector('#chart');
const ctx = canvas.getContext('2d');
const loading = document.querySelector('#loading');
const errorBox = document.querySelector('#error');
let candles = [];
let timeframe = '5m';
let visibleCandleCount = 120;
let viewEndIndex = null;
let isDragging = false;
let dragStartX = 0;
let dragStartEndIndex = 0;
let loadingHistory = false;
let refreshTimer;
let refreshInterval = 15000;
const MIN_VISIBLE_CANDLES = 20;
const MAX_VISIBLE_CANDLES = 400;
const indicatorVisibility = {rsi: true};
const smaSettings = [{id: 1, period: 20, color: '#e7b95c', width: 2}];
const smaColors = ['#e7b95c', '#55b9f3', '#f17ca8', '#70d6a8', '#c792ea'];
let nextSmaId = 2;
const {simpleMovingAverage, relativeStrengthIndex, normalizePeriod, normalizeLineWidth} = AurumIndicators;

const money = value => Number(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const tickClock = () => document.querySelector('#clock').textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
tickClock(); setInterval(tickClock, 1000);

async function loadData(showLoader = false) {
  const requestedTimeframe = timeframe;
  if (showLoader) loading.classList.remove('hidden');
  errorBox.classList.add('hidden');
  try {
    const response = await fetch(`/api/candles?timeframe=${timeframe}`, {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Respuesta no válida');
    if (requestedTimeframe !== timeframe) return;
    const wasAtLatest = viewEndIndex === null || viewEndIndex >= candles.length;
    candles = mergeCandles(candles, data.candles);
    if (wasAtLatest) viewEndIndex = candles.length;
    updateQuote(); draw();
    loading.classList.add('hidden');
  } catch (error) {
    loading.classList.add('hidden');
    errorBox.textContent = `${error.message}. Reintentaremos automáticamente.`;
    errorBox.classList.remove('hidden');
  }
}

function mergeCandles(current, incoming) {
  return [...new Map([...current, ...incoming].map(candle => [candle.time, candle])).values()]
    .sort((a, b) => a.time - b.time);
}

async function loadOlderCandles() {
  if (loadingHistory || !candles.length) return;
  loadingHistory = true;
  const requestedTimeframe = timeframe;
  try {
    const oldLength = candles.length;
    const response = await fetch(`/api/candles?timeframe=${timeframe}&before=${candles[0].time}`, {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar el histórico');
    if (requestedTimeframe !== timeframe) return;
    candles = mergeCandles(candles, data.candles);
    viewEndIndex += candles.length - oldLength;
    draw();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('hidden');
  } finally {
    loadingHistory = false;
  }
}

function updateQuote() {
  const first = candles[0], last = candles.at(-1);
  const delta = last.close - first.open, percent = delta / first.open * 100;
  document.querySelector('#last-price').textContent = money(last.close);
  const change = document.querySelector('#price-change');
  change.textContent = `${delta >= 0 ? '+' : ''}${money(delta)}  (${delta >= 0 ? '+' : ''}${percent.toFixed(2)}%)`;
  change.className = `change ${delta >= 0 ? 'up' : 'down'}`;
  document.querySelector('#ohlc').innerHTML = `<span>O ${money(last.open)}</span><span>H ${money(last.high)}</span><span>L ${money(last.low)}</span><span>C ${money(last.close)}</span>`;
}

function draw() {
  if (!candles.length) return;
  const ratio = window.devicePixelRatio || 1, rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const w = rect.width, h = rect.height, rsiHeight = indicatorVisibility.rsi ? Math.min(120, h * .24) : 0;
  const pad = {top: 18, right: 72, bottom: 30 + rsiHeight, left: 16};
  const end = Math.min(viewEndIndex ?? candles.length, candles.length);
  const start = Math.max(0, end - visibleCandleCount);
  const visible = candles.slice(start, end);
  if (!visible.length) return;
  const closes = candles.map(c => c.close);
  const smaSeries = smaSettings.map(settings => ({
    settings,
    values: simpleMovingAverage(closes, settings.period).slice(start, end),
  }));
  const rsi = relativeStrengthIndex(closes, 14).slice(start, end);
  let min = Math.min(...visible.map(c => c.low)), max = Math.max(...visible.map(c => c.high));
  smaSeries.forEach(({values}) => {
    const availableSma = values.filter(value => value !== null);
    if (availableSma.length) { min = Math.min(min, ...availableSma); max = Math.max(max, ...availableSma); }
  });
  const range = max - min || 1; min -= range * .06; max += range * .06;
  const y = value => pad.top + (max - value) / (max - min) * (h - pad.top - pad.bottom);
  ctx.clearRect(0, 0, w, h); ctx.font = '10px ui-monospace, monospace';
  for (let i = 0; i <= 5; i++) { const py = pad.top + i * (h-pad.top-pad.bottom)/5; ctx.strokeStyle='#202631'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,py+.5);ctx.lineTo(w,py+.5);ctx.stroke(); ctx.fillStyle='#626d80';ctx.fillText(money(max-i*(max-min)/5),w-pad.right+10,py+3); }
  const step=(w-pad.right-pad.left)/visible.length, body=Math.max(2,Math.min(8,step*.62));
  visible.forEach((c,i)=>{const x=pad.left+i*step+step/2, color=c.close>=c.open?'#21c58e':'#ef5b63';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y(c.high));ctx.lineTo(x,y(c.low));ctx.stroke();const top=Math.min(y(c.open),y(c.close)),height=Math.max(1,Math.abs(y(c.close)-y(c.open)));ctx.fillRect(x-body/2,top,body,height);});
  smaSeries.forEach(({settings, values}, index) => {
    drawLine(values, value => y(value), step, pad.left, settings.color, settings.width);
    const currentSma = [...values].reverse().find(value => value !== null);
    ctx.fillStyle = settings.color; ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(`SMA ${settings.period}${currentSma === undefined ? '' : `  ${money(currentSma)}`}`, pad.left, pad.top + 8 + index * 13);
  });
  const last=visible.at(-1), py=y(last.close);ctx.strokeStyle=last.close>=last.open?'#21c58e88':'#ef5b6388';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w-pad.right,py);ctx.stroke();ctx.setLineDash([]);
  const label=money(last.close), color=last.close>=last.open?'#21c58e':'#ef5b63';ctx.fillStyle=color;ctx.fillRect(w-pad.right,py-10,69,20);ctx.fillStyle='#07110e';ctx.fillText(label,w-pad.right+6,py+3);
  if (indicatorVisibility.rsi) drawRsi(rsi, step, pad, w, h);
  const marks=5, timeY=indicatorVisibility.rsi ? h-rsiHeight-9 : h-9; for(let i=0;i<marks;i++){const index=Math.round(i*(visible.length-1)/(marks-1)),d=new Date(visible[index].time*1000),text=timeframe==='1d'?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}):d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});ctx.fillStyle='#596477';ctx.fillText(text,pad.left+index*step,timeY);}
}

function drawLine(values, y, step, left, color, width) {
  ctx.beginPath(); let started = false;
  values.forEach((value, index) => {
    if (value === null) { started = false; return; }
    const x = left + index * step + step / 2;
    if (!started) ctx.moveTo(x, y(value)); else ctx.lineTo(x, y(value));
    started = true;
  });
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.lineWidth = 1;
}

function drawRsi(values, step, pad, w, h) {
  const top = h - (pad.bottom - 30) + 8, bottom = h - 20;
  const rsiY = value => top + (100 - value) / 100 * (bottom - top);
  ctx.fillStyle = '#0b0f16'; ctx.fillRect(0, top - 8, w - pad.right, bottom - top + 16);
  ctx.font = '9px ui-monospace, monospace'; ctx.fillStyle = '#7e6c47'; ctx.fillText('RSI 14', pad.left, top + 8);
  [70, 30].forEach(level => {
    const py = rsiY(level); ctx.strokeStyle = '#55472e'; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w-pad.right, py); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#776b55'; ctx.fillText(String(level), w-pad.right+10, py+3);
  });
  drawLine(values, rsiY, step, pad.left, '#9a7de8', 1.5);
  const current = [...values].reverse().find(value => value !== null);
  if (current !== undefined) { ctx.fillStyle='#9a7de8'; ctx.fillText(current.toFixed(1), w-pad.right+30, rsiY(current)+3); }
}

function updateZoom(delta) {
  visibleCandleCount = Math.max(MIN_VISIBLE_CANDLES, Math.min(MAX_VISIBLE_CANDLES, visibleCandleCount + delta));
  document.querySelector('#zoom-level').textContent = `${Math.round(120 / visibleCandleCount * 100)}%`;
  document.querySelector('#zoom-in').disabled = visibleCandleCount === MIN_VISIBLE_CANDLES;
  document.querySelector('#zoom-out').disabled = visibleCandleCount === MAX_VISIBLE_CANDLES;
  draw();
}

function panTo(endIndex) {
  viewEndIndex = Math.max(1, Math.min(candles.length, endIndex));
  draw();
  if (viewEndIndex - visibleCandleCount < 30) loadOlderCandles();
}

function scheduleRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => loadData(false), refreshInterval);
}

document.querySelectorAll('[data-timeframe]').forEach(button => button.addEventListener('click', () => {document.querySelector('.timeframes .active').classList.remove('active');button.classList.add('active');timeframe=button.dataset.timeframe;candles=[];viewEndIndex=null;loadData(true);}));
document.querySelector('#zoom-in').addEventListener('click', () => updateZoom(-20));
document.querySelector('#zoom-out').addEventListener('click', () => updateZoom(20));
document.querySelectorAll('[data-indicator="rsi"]').forEach(input => input.addEventListener('change', () => {
  indicatorVisibility[input.dataset.indicator] = input.checked;
  draw();
}));
const smaList = document.querySelector('#sma-list');

function renderSmaControls() {
  smaList.innerHTML = smaSettings.map((settings, index) => `
    <div class="sma-config" data-sma-id="${settings.id}">
      <div class="sma-config-title"><span><i style="background:${settings.color}"></i>SMA ${index + 1}</span><button class="remove-sma" type="button" aria-label="Eliminar SMA ${index + 1}">×</button></div>
      <div class="sma-fields">
        <label>Periodo <input data-field="period" type="number" value="${settings.period}" min="2" max="200" step="1" inputmode="numeric"></label>
        <label>Color <input data-field="color" type="color" value="${settings.color}"></label>
        <label class="width-field">Grosor <input data-field="width" type="range" value="${settings.width}" min="1" max="5" step="0.5"><output>${settings.width} px</output></label>
      </div>
    </div>`).join('');
  document.querySelector('#add-sma').disabled = smaSettings.length >= 8;
}

document.querySelector('#add-sma').addEventListener('click', () => {
  if (smaSettings.length >= 8) return;
  const index = smaSettings.length;
  smaSettings.push({id: nextSmaId++, period: 20 + index * 30, color: smaColors[index % smaColors.length], width: 2});
  renderSmaControls(); draw();
});
smaList.addEventListener('click', event => {
  const button = event.target.closest('.remove-sma');
  if (!button) return;
  const id = Number(button.closest('[data-sma-id]').dataset.smaId);
  smaSettings.splice(smaSettings.findIndex(settings => settings.id === id), 1);
  renderSmaControls(); draw();
});
smaList.addEventListener('input', event => {
  const field = event.target.dataset.field;
  if (!field) return;
  const settings = smaSettings.find(item => item.id === Number(event.target.closest('[data-sma-id]').dataset.smaId));
  if (field === 'color') settings.color = event.target.value;
  if (field === 'width') {
    settings.width = normalizeLineWidth(event.target.value);
    event.target.nextElementSibling.value = `${settings.width} px`;
  }
  draw();
});
smaList.addEventListener('change', event => {
  if (event.target.dataset.field !== 'period') return;
  const settings = smaSettings.find(item => item.id === Number(event.target.closest('[data-sma-id]').dataset.smaId));
  settings.period = normalizePeriod(event.target.value);
  event.target.value = settings.period;
  draw();
});
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  updateZoom(event.deltaY > 0 ? 20 : -20);
}, {passive: false});
canvas.addEventListener('mousedown', event => {
  if (!candles.length || event.button !== 0) return;
  isDragging = true; dragStartX = event.clientX; dragStartEndIndex = viewEndIndex ?? candles.length;
  canvas.classList.add('dragging');
});
window.addEventListener('mousemove', event => {
  if (!isDragging) return;
  const chartWidth = Math.max(1, canvas.getBoundingClientRect().width - 88);
  const candleDelta = Math.round((event.clientX - dragStartX) / chartWidth * visibleCandleCount);
  panTo(dragStartEndIndex - candleDelta);
});
window.addEventListener('mouseup', () => { isDragging = false; canvas.classList.remove('dragging'); });
document.querySelector('#refresh-interval').addEventListener('change', event => {
  refreshInterval = Number(event.target.value);
  scheduleRefresh();
});
window.addEventListener('resize', draw);
renderSmaControls();
loadData(true); scheduleRefresh();
