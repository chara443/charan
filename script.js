/* =========================
   Weather App: script.js
   - Uses WeatherAPI forecast endpoint (5 days)
   - Swaps background videos depending on condition
   - Adds dark/light toggle and unit toggle (C/F)
   ========================= */

/* ========== CONFIG ========== */
const API_KEY = "a6ee420ade384f94b86101744252310";
const BASE_CURRENT = "http://api.weatherapi.com/v1/current.json";
const BASE_FORECAST = "http://api.weatherapi.com/v1/forecast.json";

/* NOTE:
   Place your background videos (mp4 or webm) in ./assets/
   Filenames used below — change as desired:
   - assets/clear.mp4
   - assets/clouds.mp4
   - assets/rain.mp4
   - assets/snow.mp4
   - assets/thunder.mp4
   - assets/mist.mp4
   You can also use .webm for better compression on some browsers.
*/

/* ========== DOM ========== */
const form = document.getElementById("searchForm");
const input = document.getElementById("locationInput");
const statusEl = document.getElementById("status");

const place = document.getElementById("place");
const timeEl = document.getElementById("time");
const icon = document.getElementById("icon");
const tempEl = document.getElementById("temp");
const cond = document.getElementById("cond");
const hum = document.getElementById("hum");
const wind = document.getElementById("wind");
const feels = document.getElementById("feels");
const uv = document.getElementById("uv");

const forecastEl = document.getElementById("forecast");
const forecastSummary = document.getElementById("forecastSummary");

const aqiValue = document.getElementById("aqiValue");
const aqiMsg = document.getElementById("aqiMsg");

const bgVideos = {
  clear: document.getElementById("bg-clear"),
  cloud: document.getElementById("bg-cloud"),
  rain: document.getElementById("bg-rain"),
  snow: document.getElementById("bg-snow"),
  thunder: document.getElementById("bg-thunder"),
  mist: document.getElementById("bg-mist"),
};
const bgFallback = document.getElementById("bg-fallback");
const particleCanvas = document.getElementById("particle-canvas");

const themeToggle = document.getElementById("themeToggle");
const unitC = document.getElementById("unitC");
const unitF = document.getElementById("unitF");

/* state */
let unit = "C"; // 'C' or 'F'

/* ========== INITIALIZE VIDEO SOURCES (local files) ========== */
function initVideoSources(){
  // point videos to local assets (change paths if needed)
  const mapping = {
    clear: "assets/clear.mp4",
    cloud: "assets/clouds.mp4",
    rain: "assets/rain.mp4",
    snow: "assets/snow.mp4",
    thunder: "assets/thunder.mp4",
    mist: "assets/mist.mp4",
  };
  Object.keys(mapping).forEach(key=>{
    const el = bgVideos[key];
    if(!el) return;
    // set source and try to load — if file missing, browser will quietly fail and we hide it later
    el.src = mapping[key];
    el.load();
  });
}

/* ========== UTIL ========== */
function setStatus(text, isError=false){
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#ffb4b4" : "";
}

function chooseBgByCondition(text){
  if(!text) return "clear";
  const t = text.toLowerCase();
  if(/thunder|thundery|storm/.test(t)) return "thunder";
  if(/snow|sleet|blizzard|ice/.test(t)) return "snow";
  if(/rain|drizzle|shower|showering/.test(t)) return "rain";
  if(/mist|fog|haze|smoke|ash/.test(t)) return "mist";
  if(/cloud|overcast|partly cloudy/.test(t)) return "cloud";
  if(/clear|sunny|sun/.test(t)) return "clear";
  return "cloud";
}

function hideAllVideos(){
  Object.values(bgVideos).forEach(v=>{
    v.pause();
    v.classList.add("hidden");
    v.removeAttribute("aria-hidden");
  });
  bgFallback.classList.add("hidden");
}

/* Activate selected video; if video can't play, fallback to CSS background */
async function setBackground(kind){
  hideAllVideos();
  const vid = bgVideos[kind];
  if(!vid) {
    bgFallback.classList.remove("hidden");
    return;
  }

  // try to play; some browsers block autoplay if not muted — we set muted and playsinline
  vid.classList.remove("hidden");
  try{
    await vid.play();
    // pause other videos if any are playing
    Object.values(bgVideos).forEach(v=>{ if(v!==vid){ v.pause(); v.classList.add("hidden"); }});
  }catch(err){
    // fallback: hide videos and show fallback gradient or static image
    console.warn("Video playback failed:", err);
    hideAllVideos();
    bgFallback.style.background = "linear-gradient(180deg,#022031,#05233a)";
    bgFallback.classList.remove("hidden");
  }
}

/* Format date -> e.g., Tue 14 */
function formatDay(dateStr){
  const d = new Date(dateStr);
  const opts = { weekday: 'short', day: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
}

/* Interpret AQI if numeric index present */
function interpretAQI(idx){
  if(idx === undefined || idx === null) return ["--","AQI not available"];
  if(idx <= 50) return [idx, "Good"];
  if(idx <= 100) return [idx, "Moderate"];
  if(idx <= 150) return [idx, "Unhealthy for Sensitive"];
  if(idx <= 200) return [idx, "Unhealthy"];
  if(idx <= 300) return [idx, "Very Unhealthy"];
  return [idx, "Hazardous"];
}

/* ========== FETCH & RENDER ========== */
async function fetchWeather(location){
  try{
    setStatus("Loading...");
    // call forecast endpoint for 5 days
    const url = `${BASE_FORECAST}?key=${API_KEY}&q=${encodeURIComponent(location)}&days=5&aqi=yes&alerts=no`;
    const res = await fetch(url);
    if(!res.ok){
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    const data = await res.json();
    renderAll(data);
    setStatus("Last updated: " + new Date().toLocaleString());
  }catch(err){
    console.error(err);
    setStatus("Could not load weather for that location. Try another query.", true);
  }
}

function renderAll(data){
  if(!data || !data.location || !data.current || !data.forecast) return;
  const loc = data.location;
  const cur = data.current;
  const forcast = data.forecast;

  // Current
  place.textContent = `${loc.name}${loc.region ? ', ' + loc.region : ''}, ${loc.country}`;
  timeEl.textContent = `Local: ${loc.localtime}`;
  icon.src = cur.condition.icon.replace('//','https://');
  icon.alt = cur.condition.text;
  tempEl.textContent = unit === "C" ? `${Math.round(cur.temp_c)}°C` : `${Math.round(cur.temp_f)}°F`;
  cond.textContent = cur.condition.text;
  hum.textContent = `${cur.humidity}%`;
  wind.textContent = `${cur.wind_kph} kph`;
  feels.textContent = unit === "C" ? `${Math.round(cur.feelslike_c)}°C` : `${Math.round(cur.feelslike_f)}°F`;
  uv.textContent = cur.uv ?? "--";

  // Forecast (day by day)
  forecastEl.innerHTML = "";
  const days = forcast.forecastday || [];
  days.forEach(day=>{
    const d = day.date;
    const m = day.day;
    const el = document.createElement("div");
    el.className = "text-center text-white/90 p-3 rounded-md bg-white/6";
    el.innerHTML = `
      <div class="text-xs">${formatDay(d)}</div>
      <img src="${m.condition.icon.replace('//','https://')}" alt="${m.condition.text}" class="mx-auto my-1" />
      <div class="text-sm font-semibold">${m.condition.text}</div>
      <div class="text-sm mt-1">${unit==='C'?Math.round(m.avgtemp_c)+'°C':Math.round(m.avgtemp_f)+'°F'}</div>
      <div class="text-xs text-white/70 mt-1">H:${unit==='C'?Math.round(m.maxtemp_c)+'°':Math.round(m.maxtemp_f)+'°'} L:${unit==='C'?Math.round(m.mintemp_c)+'°':Math.round(m.mintemp_f)+'°'}</div>
    `;
    forecastEl.appendChild(el);
  });

  // Forecast summary
  forecastSummary.textContent = `${days.length}-day forecast`;

  // AQI
  if(cur.air_quality){
    // WeatherAPI returns pollutant concentrations; it may return "us-epa-index" on some plans
    const idx = cur.air_quality["us-epa-index"];
    const [val,msg] = interpretAQI(idx ?? null);
    aqiValue.textContent = val;
    aqiMsg.textContent = msg;
  } else {
    aqiValue.textContent = "--";
    aqiMsg.textContent = "Not available";
  }

  // Set background video by current condition
  const kind = chooseBgByCondition(cur.condition.text);
  setBackground(kind);
}

/* ========== THEME & UNITS ========== */
themeToggle.addEventListener("click", ()=>{
  document.documentElement.classList.toggle("dark");
  document.body.classList.toggle("dark");
});

unitC.addEventListener("click", ()=>{
  unit = "C";
  unitC.classList.add("font-semibold"); unitF.classList.remove("font-semibold");
  // re-fetch current displayed (or re-render) — easiest is to trigger a fetch using current input
  const q = input.value.trim();
  if(q) fetchWeather(q);
});
unitF.addEventListener("click", ()=>{
  unit = "F";
  unitF.classList.add("font-semibold"); unitC.classList.remove("font-semibold");
  const q = input.value.trim();
  if(q) fetchWeather(q);
});

/* ========== PARTICLE / RAIN OVERLAY (simple) ========== */
function initParticles(){
  if(!particleCanvas) return;
  const ctx = particleCanvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  function resize(){
    particleCanvas.width = particleCanvas.clientWidth * DPR;
    particleCanvas.height = particleCanvas.clientHeight * DPR;
  }
  resize();
  window.addEventListener('resize', resize);

  const drops = [];
  for(let i=0;i<120;i++){
    drops.push({
      x: Math.random()*particleCanvas.width,
      y: Math.random()*particleCanvas.height,
      len: 8 + Math.random()*20,
      speed: 2 + Math.random()*4,
      alpha: 0.05 + Math.random()*0.25
    });
  }
  function step(){
    ctx.clearRect(0,0,particleCanvas.width,particleCanvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1 * DPR;
    drops.forEach(d=>{
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.len);
      ctx.stroke();
      d.y += d.speed;
      if(d.y > particleCanvas.height){
        d.y = -20;
        d.x = Math.random()*particleCanvas.width;
      }
    });
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ========== EVENTS ========== */
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = input.value.trim();
  if(!q) return setStatus("Please enter a location", true);
  fetchWeather(q);
});

/* ========== BOOT ========== */
initVideoSources();
initParticles();

// Prefill and load for initial value
window.addEventListener("load", ()=>{
  // initial unit UI
  unitC.classList.add("font-semibold");
  const q = input.value.trim();
  if(q) fetchWeather(q);
});
