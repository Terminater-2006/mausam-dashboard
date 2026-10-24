const CITIES = [
  {region:'North', list:[['Delhi',28.65,77.23],['Shimla',31.10,77.17],['Srinagar',34.08,74.80],['Jaipur',26.91,75.79],['Lucknow',26.85,80.95],['Amritsar',31.63,74.87]]},
  {region:'South', list:[['Chennai',13.08,80.27],['Bengaluru',12.97,77.59],['Hyderabad',17.38,78.49],['Kochi',9.93,76.26],['Madurai',9.92,78.13],['Mysuru',12.30,76.65]]},
  {region:'West', list:[['Mumbai',19.07,72.87],['Pune',18.52,73.86],['Ahmedabad',23.02,72.57],['Goa',15.49,73.83],['Surat',21.17,72.83]]},
  {region:'East', list:[['Kolkata',22.57,88.36],['Patna',25.59,85.14],['Bhubaneswar',20.30,85.82],['Guwahati',26.14,91.74]]},
  {region:'Central', list:[['Bhopal',23.26,77.41],['Indore',22.72,75.86],['Nagpur',21.15,79.09]]}
];
const $ = id => document.getElementById(id);
const geocodeUrl = q => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&country_code=IN`;
const forecastUrl = (lat,lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;
const aqiUrl = (lat,lon) => `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;

const MOCK = { latitude:28.65, longitude:77.23, current:{time:'2026-10-06T11:30',temperature_2m:31.8,relative_humidity_2m:55,apparent_temperature:36.9,weather_code:0,wind_speed_10m:4.9}, daily:{time:['2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12'],weather_code:[0,1,2,61,80,0,3],temperature_2m_max:[34,33,32,30,29,33,32],temperature_2m_min:[24,23,22,21,20,23,22],precipitation_probability_max:[0,10,20,70,80,5,15],sunrise:['2026-10-06T06:25','2026-10-07T06:26','2026-10-08T06:27','2026-10-09T06:28','2026-10-10T06:29','2026-10-11T06:30','2026-10-12T06:31'],sunset:['2026-10-06T17:55','2026-10-07T17:54','2026-10-08T17:53','2026-10-09T17:52','2026-10-10T17:51','2026-10-11T17:50','2026-10-12T17:49'],uv_index_max:[6,5,4,3,2,5,5]} };
MOCK.aqi = {current:{us_aqi:85}};

let reqSeq = 0;
let weatherAbort = null;

const CODE_MAP = {
  0:  {label:'Clear',        svg:'sun'},
  1:  {label:'Partly cloudy',svg:'cloud'},
  2:  {label:'Partly cloudy',svg:'cloud'},
  3:  {label:'Overcast',     svg:'cloud'},
  45: {label:'Fog',          svg:'cloud'},
  48: {label:'Fog',          svg:'cloud'},
  61: {label:'Rain',         svg:'rain'},
  71: {label:'Snow',         svg:'snow'},
  77: {label:'Snow',         svg:'snow'},
  80: {label:'Showers',      svg:'rain'},
  95: {label:'Thunderstorm', svg:'thunder'}
};
const ICONS = {
  sun:'<svg viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><g stroke="#fbbf24" stroke-width="2"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g></svg>',
  cloud:'<svg viewBox="0 0 24 24" fill="#94a3b8" aria-hidden="true"><path d="M6 18a4 4 0 1 1 .6-7.96A5 5 0 0 1 16.5 11 3.5 3.5 0 0 1 17 18z"/></svg>',
  rain:'<svg viewBox="0 0 24 24" fill="#60a5fa" aria-hidden="true"><path d="M6 15a4 4 0 1 1 .6-7.96A5 5 0 0 1 16.5 8 3.5 3.5 0 0 1 17 15z"/><g stroke="#60a5fa" stroke-width="2"><line x1="8" y1="17" x2="7" y2="20"/><line x1="13" y1="17" x2="12" y2="20"/><line x1="18" y1="17" x2="17" y2="20"/></g></svg>',
  snow:'<svg viewBox="0 0 24 24" fill="#e2e8f0" aria-hidden="true"><path d="M6 15a4 4 0 1 1 .6-7.96A5 5 0 0 1 16.5 8 3.5 3.5 0 0 1 17 15z"/><g fill="#e2e8f0"><circle cx="8" cy="19" r="1.5"/><circle cx="13" cy="21" r="1.5"/><circle cx="18" cy="19" r="1.5"/></g></svg>',
  thunder:'<svg viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true"><path d="M6 15a4 4 0 1 1 .6-7.96A5 5 0 0 1 16.5 8 3.5 3.5 0 0 1 17 15z"/><path d="M13 16l-3 4h3l-2 4 5-6h-3l2-2z"/></svg>'
};
function codeInfo(code){
  if(code in CODE_MAP) return CODE_MAP[code];
  if(code>=71&&code<=77) return CODE_MAP[71];
  if(code>=95) return CODE_MAP[95];
  if(code>=51&&code<=67) return CODE_MAP[61];
  if(code>=80&&code<=82) return CODE_MAP[80];
  return CODE_MAP[3];
}

async function searchCity(q){
  const box=$('suggestions'); box.style.display='none'; $('errorBox').classList.add('hidden');
  if(!q.trim() || q.trim().length<=2) return;
  try{
    const r = await fetch(geocodeUrl(q));
    if(!r.ok) throw new Error('geocode http '+r.status);
    const d = await r.json();
    const hits = (d.results||[]).filter(c=>c.country_code==='IN');
    if(!hits.length){
      $('errorBox').classList.remove('hidden');
      $('errorBox').textContent = d.results && d.results.length ? 'Only Indian cities are supported.' : 'City not found. Try Delhi, Kochi, Leh…';
      return;
    }
    if(hits.length===1) return pickCity(hits[0]);
    box.innerHTML=''; box.style.display='block';
    hits.forEach(c=>{
      const b=document.createElement('button'); b.type='button'; b.setAttribute('role','option');
      b.textContent=`${c.name}, ${c.admin1||c.country}`;
      b.onclick=()=>{ box.style.display='none'; pickCity(c); };
      box.appendChild(b);
    });
  }catch(e){ showOffline(); }
}
function pickCity(c){
  saveHistory({name:c.name, lat:c.latitude, lon:c.longitude});
  loadWeather(c.name, c.latitude, c.longitude);
}
async function loadWeather(name, lat, lon){
  const mySeq = ++reqSeq;
  if(weatherAbort) weatherAbort.abort();
  weatherAbort = new AbortController();
  $('skeleton').classList.remove('hidden'); $('errorBox').classList.add('hidden');
  try{
    const r = await fetch(forecastUrl(lat,lon), {signal: weatherAbort.signal});
    if(!r.ok) throw new Error('http '+r.status);
    const d = await r.json();
    if(!d || !d.current || !d.daily || !d.daily.time) throw new Error('bad shape');
    try{ const ar = await fetch(aqiUrl(lat,lon)); d.aqi = ar.ok ? await ar.json() : null; }catch(e){ d.aqi = null; }
    if(mySeq===reqSeq) renderAll(name, d, {lat, lon, persist:true});
  }catch(e){
    if(e.name==='AbortError') return;
    showOffline(name);
  }finally{
    if(mySeq===reqSeq) $('skeleton').classList.add('hidden');
  }
}
function showOffline(name){
  $('errorBox').classList.remove('hidden');
  $('errorBox').textContent = name ? `Offline — demo data shown for ${name}.` : 'Offline — demo data shown.';
  renderAll(name||'Delhi', MOCK, {lat:MOCK.latitude, lon:MOCK.longitude, persist:false});
}

function renderAll(name, d, opts){
  const c=d.current, day=d.daily, info=codeInfo(c.weather_code);
  $('heroCity').textContent=name; $('heroCountry').textContent='India';
  $('heroPill').textContent=info.label;
  $('heroTemp').textContent=Math.round(c.temperature_2m)+'°';
  $('reportDay').textContent=new Date(d.current.time).toLocaleDateString('en-IN',{weekday:'long'});
  $('reportTemp').textContent=Math.round(c.temperature_2m)+'°';
  $('reportFeels').textContent='Feels like '+Math.round(c.apparent_temperature)+'°';
  $('reportIcon').innerHTML=ICONS[info.svg];
  $('reportIcon').setAttribute('aria-label', info.label);
  $('cTemp').textContent=Math.round(c.temperature_2m)+'°';
  $('cHum').textContent=c.relative_humidity_2m+'%';
  $('cWind').textContent=c.wind_speed_10m+' km/h';
  $('cFeels').textContent=Math.round(c.apparent_temperature)+'°';
  $('cUv').textContent = day.uv_index_max && day.uv_index_max[0]!=null ? Math.round(day.uv_index_max[0]) : '--';
  $('cAqi').textContent = d.aqi && d.aqi.current ? d.aqi.current.us_aqi : '--';
  $('cSunrise').textContent = day.sunrise && day.sunrise[0] ? day.sunrise[0].slice(11,16) : '--';
  $('cSunset').textContent = day.sunset && day.sunset[0] ? day.sunset[0].slice(11,16) : '--';
  const box=$('days'); box.innerHTML='';
  day.time.forEach((dt,i)=>{
    const inf=codeInfo(day.weather_code[i]);
    const el=document.createElement('div'); el.className='day';
    const dEl=document.createElement('div'); dEl.className='d';
    dEl.textContent=new Date(dt+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short'});
    const hi=document.createElement('div'); hi.className='hi'; hi.textContent=Math.round(day.temperature_2m_max[i])+'°';
    const lo=document.createElement('div'); lo.className='lo'; lo.textContent=Math.round(day.temperature_2m_min[i])+'°';
    el.appendChild(dEl); el.insertAdjacentHTML('beforeend', ICONS[inf.svg]); el.appendChild(hi); el.appendChild(lo);
    const rp=document.createElement('div'); rp.className='lo';
    const pp = day.precipitation_probability_max && day.precipitation_probability_max[i]!=null ? day.precipitation_probability_max[i] : 0;
    rp.textContent = pp + '% rain';
    el.appendChild(rp);
    box.appendChild(el);
  });
  const bars=$('rainBars'); bars.innerHTML='';
  (day.precipitation_probability_max||[]).forEach((pp,i)=>{
    const b=document.createElement('div'); b.className='bar';
    const h=Math.max(pp,4);
    b.innerHTML=`<div class="fill" style="height:${h}%"></div><span>${pp}%</span>`;
    bars.appendChild(b);
  });
  if(opts && opts.persist){
    try{ localStorage.setItem('wd_last', JSON.stringify({name, lat:opts.lat, lon:opts.lon})); }catch(e){}
  }
  markActive(name);
}

function saveHistory(c){
  try{
    let h=getHistory(); h=h.filter(x=>x && x.name!==c.name); h.unshift(c); h=h.slice(0,8);
    localStorage.setItem('wd_history', JSON.stringify(h));
  }catch(e){}
  renderRecent();
}
function getHistory(){
  try{
    const h=JSON.parse(localStorage.getItem('wd_history'));
    return Array.isArray(h) ? h.filter(x=>x && typeof x.name==='string' && typeof x.lat==='number' && typeof x.lon==='number') : [];
  }catch{ return []; }
}
function renderRecent(){
  const box=$('recent'); box.innerHTML='';
  getHistory().forEach(c=>{
    const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=c.name;
    b.onclick=()=>loadWeather(c.name,c.lat,c.lon);
    box.appendChild(b);
  });
}
function markActive(name){
  document.querySelectorAll('.cities button').forEach(b=>{
    const on = b.textContent===name;
    b.classList.toggle('active', on);
    if(on) b.setAttribute('aria-current','true'); else b.removeAttribute('aria-current');
  });
}
function renderCityList(){
  const nav=$('cities'); nav.innerHTML='';
  CITIES.forEach(rg=>{
    const h=document.createElement('h3'); h.textContent=rg.region; nav.appendChild(h);
    rg.list.forEach(([n,lat,lon])=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=n;
      b.onclick=()=>{ saveHistory({name:n,lat,lon}); loadWeather(n,lat,lon); };
      nav.appendChild(b);
    });
  });
}

let debounceTimer=null;
$('searchBtn').onclick=()=>searchCity($('searchInput').value);
$('searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter') searchCity(e.target.value); });
$('searchInput').addEventListener('input',e=>{
  clearTimeout(debounceTimer);
  const v=e.target.value;
  if(v.trim().length<=2){ $('suggestions').style.display='none'; $('errorBox').classList.add('hidden'); return; }
  debounceTimer=setTimeout(()=>searchCity(v), 250);
});

renderCityList(); renderRecent();
function initMap(){
  if(typeof L==='undefined'){ $('map').innerHTML='Map needs internet.'; return; }
  const m=L.map('map').setView([22.5,82],4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(m);
  CITIES.forEach(rg=>rg.list.forEach(([n,lat,lon])=>{
    L.circleMarker([lat,lon],{radius:7,fillColor:'#60a5fa',color:'#fff',weight:2,fillOpacity:0.9})
      .addTo(m).bindPopup(`<b>${n}</b>`)
      .on('click',()=>{ saveHistory({name:n,lat,lon}); loadWeather(n,lat,lon); });
  }));
}
initMap();
(function init(){
  let last=null;
  try{ last=JSON.parse(localStorage.getItem('wd_last')); }catch(e){}
  if(last && typeof last.name==='string' && typeof last.lat==='number') loadWeather(last.name,last.lat,last.lon);
  else loadWeather('Delhi',28.65,77.23);
})();
