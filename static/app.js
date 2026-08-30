const canvas = document.querySelector('#chart');
const ctx = canvas.getContext('2d');
const loading = document.querySelector('#loading');
const errorBox = document.querySelector('#error');
let candles = [];
let timeframe = '5m';

const money = value => Number(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const tickClock = () => document.querySelector('#clock').textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
tickClock(); setInterval(tickClock, 1000);

async function loadData(showLoader = false) {
  if (showLoader) loading.classList.remove('hidden');
  errorBox.classList.add('hidden');
  try {
    const response = await fetch(`/api/candles?timeframe=${timeframe}`, {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Respuesta no válida');
    candles = data.candles;
    updateQuote(); draw();
    loading.classList.add('hidden');
  } catch (error) {
    loading.classList.add('hidden');
    errorBox.textContent = `${error.message}. Reintentaremos automáticamente.`;
    errorBox.classList.remove('hidden');
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
  const w = rect.width, h = rect.height, pad = {top: 18, right: 72, bottom: 30, left: 16};
  const visible = candles.slice(-Math.min(120, Math.floor((w - pad.right) / 7)));
  let min = Math.min(...visible.map(c => c.low)), max = Math.max(...visible.map(c => c.high));
  const range = max - min || 1; min -= range * .06; max += range * .06;
  const y = value => pad.top + (max - value) / (max - min) * (h - pad.top - pad.bottom);
  ctx.clearRect(0, 0, w, h); ctx.font = '10px ui-monospace, monospace';
  for (let i = 0; i <= 5; i++) { const py = pad.top + i * (h-pad.top-pad.bottom)/5; ctx.strokeStyle='#202631'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,py+.5);ctx.lineTo(w,py+.5);ctx.stroke(); ctx.fillStyle='#626d80';ctx.fillText(money(max-i*(max-min)/5),w-pad.right+10,py+3); }
  const step=(w-pad.right-pad.left)/visible.length, body=Math.max(2,Math.min(8,step*.62));
  visible.forEach((c,i)=>{const x=pad.left+i*step+step/2, color=c.close>=c.open?'#21c58e':'#ef5b63';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y(c.high));ctx.lineTo(x,y(c.low));ctx.stroke();const top=Math.min(y(c.open),y(c.close)),height=Math.max(1,Math.abs(y(c.close)-y(c.open)));ctx.fillRect(x-body/2,top,body,height);});
  const last=visible.at(-1), py=y(last.close);ctx.strokeStyle=last.close>=last.open?'#21c58e88':'#ef5b6388';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(w-pad.right,py);ctx.stroke();ctx.setLineDash([]);
  const label=money(last.close), color=last.close>=last.open?'#21c58e':'#ef5b63';ctx.fillStyle=color;ctx.fillRect(w-pad.right,py-10,69,20);ctx.fillStyle='#07110e';ctx.fillText(label,w-pad.right+6,py+3);
  const marks=5; for(let i=0;i<marks;i++){const index=Math.round(i*(visible.length-1)/(marks-1)),d=new Date(visible[index].time*1000),text=timeframe==='1d'?d.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}):d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});ctx.fillStyle='#596477';ctx.fillText(text,pad.left+index*step,h-9);}
}

document.querySelectorAll('[data-timeframe]').forEach(button => button.addEventListener('click', () => {document.querySelector('.timeframes .active').classList.remove('active');button.classList.add('active');timeframe=button.dataset.timeframe;loadData(true);}));
window.addEventListener('resize', draw);
loadData(true); setInterval(() => loadData(false), 15000);
