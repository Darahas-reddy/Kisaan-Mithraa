import os
import io
import uuid
import time
import json
import base64
import requests
import numpy as np
import cv2
import joblib
from flask import Flask, render_template_string, request, jsonify, send_file, abort, Response
from gtts import gTTS

# new imports for training
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
import traceback
from typing import Optional
from queue import Queue, Empty
import threading

# ----------------------
# Configuration
# ----------------------
MODEL_PATH = os.path.join('model', 'plant_model.pkl')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8 MB
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE = os.getenv("OPENAI_BASE", "https://api.openai.com/v1").rstrip("/")
OPENAI_MODEL_VISION = os.getenv("OPENAI_MODEL_VISION", "gpt-4o-mini")
OPENAI_MODEL_TEXT = os.getenv("OPENAI_MODEL_TEXT", "gpt-4o-mini")
MANDI_API_URL = os.getenv("MANDI_API_URL", "").strip()
MANDI_API_KEY = os.getenv("MANDI_API_KEY", "").strip()

USE_OPENAI = bool(OPENAI_API_KEY)  # <--- Add this flag

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# enable CORS for API endpoints (dynamically import to avoid linter errors if package missing)
try:
    import importlib
    _flask_cors = importlib.import_module('flask_cors')
    if hasattr(_flask_cors, 'CORS'):
        _flask_cors.CORS(app, resources={r"/api/*": {"origins": "*"}})
except Exception:
    # flask_cors not installed or import failed — continue without CORS
    pass

# ----------------------
# Load model (fallback)
# ----------------------
if os.path.exists(MODEL_PATH):
    try:
        model, categories = joblib.load(MODEL_PATH)
        print("Loaded model and categories:", categories)
    except Exception as e:
        print("Error loading model:", e)
        model, categories = None, []
else:
    print("Model file not found at", MODEL_PATH)
    model, categories = None, []

# Fallback categories if model not present
if not categories:
    categories = [
        "Healthy",
        "Leaf_Spot",
        "Leaf_Blight",
        "Potato___Late_blight",
        "Tomato_Late_blight",
        "Pepper__bell___Bacterial_spot",
    ]

# ----------------------
# Telugu label/treatment mappings (clean, no disease-name repetition)
# ----------------------
telugu_names = {
    "Healthy": "ఆరోగ్యమైన మొక్క",
    "Leaf_Spot": "ఆకు మచ్చ",
    "Leaf_Blight": "ఆకు ఎండిపోవడం",
    "Potato___Late_blight": "బంగాళాదుంప - లేట్ బ్లైట్",
    "Tomato_Late_blight": "టమోటా - లేట్ బ్లైట్",
    "Pepper__bell___Bacterial_spot": "మిరప - బాక్టీరియా మచ్చ",
}
treatments_telugu = {
    "Healthy": "ప్రత్యేక చికిత్స అవసరం లేదు. సాధారణ సంరక్షణ కొనసాగించండి.",
    "Leaf_Spot": "తగిన ఫంగిసైడ్‌ను ప్యాకేజి సూచనల ప్రకారం పిచికారీ చేయండి. సంక్రమిత ఆకులను తొలగించండి.",
    "Leaf_Blight": "కాపర్ ఆధారిత లేదా సిఫారసు చేసిన ఫంగిసైడ్లను వాడండి. మంచి గాలి ప్రసరణ ఉండేలా చూడండి.",
    "Potato___Late_blight": "మెటలాక్సిల్/మాంకోజేబ్ వంటి ఫంగిసైడ్లు వాడండి. నీటి నిల్వలు లేకుండా చూసుకోండి.",
    "Tomato_Late_blight": "కాపర్ ఆధారిత ఫంగిసైడ్లు పిచికారీ చేయండి. సంక్రమిత భాగాలను తొలగించండి.",
    "Pepper__bell___Bacterial_spot": "కాపర్ ఆధారిత బాక్టీరిసైడ్లు వాడండి. సంక్రమిత ఆకులను తొలగించండి. నీటి చిమ్మురులు తగ్గించండి.",
}
english_to_telugu_crop = {
    "Tomato": "టమోటా",
    "Potato": "బంగాళాదుంప",
    "Pepper": "మిరప",
    "Pepper__bell": "మిరప",
}

# ----------------------
# Mock Mandi data (fallback)
# ----------------------
MOCK_MANDI = {
    "paddy": [
        {"market": "మండి A", "price": 2400, "unit": "క్వింటాల్", "date": "2025-10-15"},
        {"market": "మండి B", "price": 2350, "unit": "క్వింటాల్", "date": "2025-10-15"}
    ],
    "maize": [
        {"market": "మండి A", "price": 1800, "unit": "క్వింటాల్", "date": "2025-10-15"}
    ]
}

# ----------------------
# Utilities
# ----------------------
def allowed_file(filename: Optional[str]) -> bool:
    # Accept None (some Werkzeug FileStorage may have filename=None)
    if not filename:
        return False
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_features_from_image_bytes(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    img = cv2.resize(img, (64, 64))
    feat = img.flatten().astype(np.float32)
    return feat

def guess_telugu_label(label: str) -> str:
    if label in telugu_names:
        return telugu_names[label]
    pretty = label
    for eng, tel in english_to_telugu_crop.items():
        if eng in pretty:
            pretty = pretty.replace(eng, tel)
    pretty = pretty.replace("___", " - ").replace("__", " - ").replace("_", " ")
    return pretty

def build_telugu_text(label: str) -> str:
    tl_label = guess_telugu_label(label)
    treatment = treatments_telugu.get(label, "చికిత్స సమాచారం అందుబాటులో లేదు.")
    return f"వ్యాధి: {tl_label}. చికిత్స: {treatment}"

def predict_local(image_bytes: bytes):
    if model is None:
        return {"error": "Local model not available"}
    feat = extract_features_from_image_bytes(image_bytes)
    pred_idx = int(model.predict([feat])[0])
    proba = None
    if hasattr(model, 'predict_proba'):
        proba = float(np.max(model.predict_proba([feat])))
    label = categories[pred_idx] if 0 <= pred_idx < len(categories) else str(pred_idx)
    return {"label": label, "label_telugu": guess_telugu_label(label), "confidence": proba}

def openai_classify_image(image_bytes: bytes, category_list):
    if not OPENAI_API_KEY:
        return {"error": "OPENAI_API_KEY not set"}
    try:
        b64 = base64.b64encode(image_bytes).decode('utf-8')
        url = f"{OPENAI_BASE}/chat/completions"
        sys_msg = "You are an expert plant disease classifier."
        user_instruction = (
            "Classify the plant disease in this image. "
            "Choose the best matching label from this exact list only:\n" +
            "\n".join(f"- {c}" for c in category_list) +
            "\nReturn a compact JSON object with keys: label (one of the list) and confidence (0..1)."
        )
        payload = {
            "model": OPENAI_MODEL_VISION,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": sys_msg},
                {"role": "user", "content": [
                    {"type": "text", "text": user_instruction},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                ]}
            ],
            "temperature": 0.2
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        resp = requests.post(url, headers=headers, json=payload, timeout=45)
        if not resp.ok:
            return {"error": f"OpenAI error: {resp.status_code} {resp.text[:200]}"}
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        # Robust JSON parsing (handles any stray text)
        try:
            parsed = json.loads(content)
        except Exception:
            s = content
            start = s.find("{")
            end = s.rfind("}")
            if start != -1 and end != -1 and end > start:
                parsed = json.loads(s[start:end+1])
            else:
                return {"error": "Invalid JSON from OpenAI"}
        label = parsed.get("label")
        conf = parsed.get("confidence", None)
        if label not in category_list:
            return {"error": "Model returned label outside allowed list"}
        return {"label": label, "label_telugu": guess_telugu_label(label), "confidence": conf}
    except Exception as e:
        return {"error": str(e)}

def detect(image_bytes: bytes):
    # Prefer OpenAI, else local model
    if USE_OPENAI:
        res = openai_classify_image(image_bytes, categories)
        if "error" not in res:
            return res
        # If OpenAI fails, continue to local fallback
    if model is not None:
        return predict_local(image_bytes)
    return {"error": "AI offline. Set OPENAI_API_KEY or provide local model."}

def tts_bytes_io(text: str, lang: str = 'en') -> io.BytesIO:
    mp3_fp = io.BytesIO()
    # gTTS supports many languages; caller should pass a validated language code
    gTTS(text=text, lang=lang).write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    return mp3_fp

def mandi_telugu_text(crop_code: str, prices: list) -> str:
    crop_map = {"paddy": "వరి", "maize": "మొక్కజొన్న"}
    crop_te = crop_map.get(crop_code.lower(), crop_code)
    if not prices:
        return f"{crop_te} ధరల సమాచారం అందుబాటులో లేదు."
    parts = []
    for p in prices:
        m = p.get("market", "")
        price = p.get("price", "")
        unit = p.get("unit", "")
        date = p.get("date", "")
        parts.append(f"{m}: రూ. {price} / {unit} ({date})")
    return f"{crop_te} తాజా ధరలు - " + " | ".join(parts)

def fetch_mandi_realtime(crop: str):
    # Plug your real API; fallback to mock
    if MANDI_API_URL:
        try:
            headers = {"Authorization": f"Bearer {MANDI_API_KEY}"} if MANDI_API_KEY else {}
            r = requests.get(f"{MANDI_API_URL}?crop={crop}", headers=headers, timeout=10)
            if r.ok:
                return r.json()
        except Exception:
            pass
    return {"crop": crop, "prices": MOCK_MANDI.get(crop, [])}

def openai_summarize_mandi(prices: list, crop_code: str) -> str:
    # Use OpenAI to generate a natural Telugu sentence for prices
    if not OPENAI_API_KEY:
        return mandi_telugu_text(crop_code, prices)
    try:
        url = f"{OPENAI_BASE}/chat/completions"
        crop_map = {"paddy": "వరి", "maize": "మొక్కజొన్న"}
        crop_te = crop_map.get(crop_code.lower(), crop_code)
        raw_txt = json.dumps({"crop": crop_te, "prices": prices}, ensure_ascii=False)
        prompt = (
            "Summarize these mandi prices in one clear Telugu sentence with numbers preserved. "
            "Avoid extra commentary or emojis."
        )
        payload = {
            "model": OPENAI_MODEL_TEXT,
            "messages": [
                {"role": "system", "content": "You are a concise Telugu assistant."},
                {"role": "user", "content": f"{prompt}\n\nData:\n{raw_txt}"}
            ],
            "temperature": 0.2
        }
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        if resp.ok:
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        pass
    return mandi_telugu_text(crop_code, prices)

# ----------------------
# Shared Styles/Header and Pages (no grammar UI)
# ----------------------
BASE_STYLES = """
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --g1:#0ea5e9; --g2:#8b5cf6; --g3:#ef4444;
    --glass: rgba(255,255,255,0.16);
    --glass-border: rgba(255,255,255,0.25);
    --brand-dark:#0b1324;
    --ok:#22c55e; --ok2:#16a34a;
  }
  html,body{height:100%;}
  body{font-family:'Poppins',Arial,sans-serif; background:linear-gradient(120deg,var(--g1),var(--g2),var(--g3)); background-size:300% 300%; animation:grad 12s ease infinite; color:var(--brand-dark);}
  @keyframes grad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  .app-header{backdrop-filter: blur(8px); background:rgba(255,255,255,0.55); border-bottom:1px solid var(--glass-border);}
  .brand{display:flex; align-items:center; gap:.6rem; font-weight:700;}
  .brand svg{width:28px;height:28px}
  .brand-name{font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing:.3px;}
  .card{background:var(--glass); border:1px solid var(--glass-border); border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.1);}
  .card-title{font-weight:700;}
  .btn-gradient{background-image:linear-gradient(135deg,var(--ok),var(--ok2)); color:#fff; border:none;}
  .btn-gradient:hover{filter:brightness(0.95);}
  .btn-outline-gradient{border:2px solid var(--ok); color:#065f46; background:rgba(255,255,255,0.5);}
  .alert-telugu{background:rgba(255,255,255,0.9); border-left:6px solid var(--ok); border-radius:10px;}
  .dropzone{border:2px dashed rgba(255,255,255,0.7); border-radius:12px; padding:22px; text-align:center; background:rgba(255,255,255,0.35); transition:all .2s;}
  .dropzone.dragover{background:rgba(255,255,255,0.6); transform:scale(1.01);}
  .hero{padding: 18px 0;}
  .section-title{scroll-margin-top: 90px;}
  video, img{max-width:100%}
</style>
"""

HEADER_HTML = """
<header class="app-header sticky-top">
  <div class="container d-flex justify-content-between align-items-center py-2">
    <a href="/" class="text-decoration-none text-dark">
      <div class="brand">
        <svg viewBox="0 0 64 64" fill="none">
          <path d="M22 50c6-8 8-18 8-28" stroke="#16a34a" stroke-width="3" stroke-linecap="round"/>
          <path d="M30 22c6 2 10 6 12 12" stroke="#15803d" stroke-width="3" stroke-linecap="round"/>
          <path d="M18 46c4-4 6-10 6-16" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
          <circle cx="38" cy="20" r="3" fill="#22c55e"/><circle cx="44" cy="30" r="3" fill="#16a34a"/><circle cx="34" cy="30" r="3" fill="#16a34a"/>
        </svg>
        <div class="brand-name">KrishiNetra</div>
      </div>
    </a>
    <div class="d-flex align-items-center gap-2">
      <span id="aiStatus" class="badge bg-secondary">AI: Checking...</span>
      <div class="d-none d-md-flex gap-2">
        <a href="/" class="btn btn-sm btn-outline-gradient">Home</a>
        <a href="/app" class="btn btn-sm btn-outline-gradient">App</a>
        <a href="/profile" class="btn btn-sm btn-outline-gradient">Profile</a>
      </div>
    </div>
  </div>
</header>
"""

# Home page: Only Mandi live card + quick links (no grammar)
HOME_HTML = """
<!doctype html>
<html lang="te">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KrishiNetra - Home</title>
""" + BASE_STYLES + """
</head>
<body>
""" + HEADER_HTML + """
  <section class="hero">
    <div class="container">
      <div class="row g-3 align-items-center">
        <div class="col-12 col-lg-8">
          <h2 class="mb-1 text-dark">AI for Farmers: Disease, Prices, Telugu Voice</h2>
          <p class="mb-3">Realtime mandi updates with Telugu voice and AI disease detection.</p>
          <div class="d-flex gap-2 flex-wrap">
            <a href="/app" class="btn btn-gradient">Open App</a>
            <a href="/profile" class="btn btn-outline-gradient">Profile</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="container pb-4">
    <div class="row g-4">
      <div class="col-12">
        <div class="card p-3">
          <h5 class="card-title">Live Mandi Prices (Telugu)</h5>
          <div class="d-flex gap-2 align-items-center">
            <select id="cropSelect" class="form-select" style="max-width:220px">
              <option value="paddy">Paddy</option>
              <option value="maize">Maize</option>
            </select>
            <button id="btnStartMandi" class="btn btn-gradient">Start Live</button>
            <button id="btnStopMandi" class="btn btn-outline-gradient">Stop</button>
          </div>
          <div id="mandiText" class="alert alert-telugu d-none mt-3"></div>
          <audio id="mandiAudio" controls class="w-100 d-none mt-2"></audio>
        </div>
      </div>
    </div>
  </div>

<script>
let mandiEvt = null;

document.getElementById('btnStartMandi').addEventListener('click', ()=>{
  const crop = document.getElementById('cropSelect').value;
  if (mandiEvt) mandiEvt.close();
  mandiEvt = new EventSource('/api/mandi/stream?crop=' + encodeURIComponent(crop));
  const textEl = document.getElementById('mandiText');
  const audEl = document.getElementById('mandiAudio');
  textEl.classList.remove('d-none');
  mandiEvt.onmessage = async (e)=>{
    try{
      const j = JSON.parse(e.data);
      const txt = j.telugu_text || '';
      textEl.textContent = txt;
      const r = await fetch('/api/voice?text='+encodeURIComponent(txt));
      if(r.ok){
        const b = await r.blob();
        const url = URL.createObjectURL(b);
        audEl.src = url; audEl.classList.remove('d-none'); audEl.play().catch(()=>{});
      }
    }catch(_){}
  };
});
document.getElementById('btnStopMandi').addEventListener('click', ()=>{
  if (mandiEvt){ mandiEvt.close(); mandiEvt = null; }
});
</script>
</body>
</html>
"""

# App page: file/webcam prediction (unchanged UI, backend now can use OpenAI)
APP_HTML = """
<!doctype html>
<html lang="te">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KrishiNetra - App</title>
""" + BASE_STYLES + """
</head>
<body>
""" + HEADER_HTML + """
  <div class="container py-4">
    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <div class="card p-3">
          <h5 class="card-title">ఫైల్ ద్వారా సూచన</h5>
          <div id="drop" class="dropzone mb-3">ఇక్కడ చిత్రాన్ని డ్రాప్ చేయండి లేదా క్లిక్ చేసి ఎంచుకోండి</div>
          <input class="form-control" type="file" id="fileInput" accept="image/*" hidden>
          <div class="d-flex align-items-start gap-3">
            <img id="preview" src="" alt="" class="d-none" />
            <div class="flex-grow-1">
              <button id="btnUpload" class="btn btn-gradient me-2" disabled>Upload & Predict</button>
              <div id="spinnerFile" class="spinner-border text-success d-none" role="status"></div>
            </div>
          </div>
          <hr>
          <div>
            <div id="fileDetected" class="mb-2 fw-semibold"></div>
            <div id="fileAccuracy" class="mb-2"></div>
            <div id="fileTelugu" class="alert alert-telugu d-none" role="alert"></div>
            <audio id="fileAudio" controls class="w-100 d-none mt-2"></audio>
          </div>
        </div>

        <div class="card p-3 mt-4">
          <h5 class="card-title">వెబ్‌క్యామ్ సూచన</h5>
          <video id="video" class="w-100 rounded border" autoplay playsinline></video>
          <div class="mt-2">
            <button id="btnCapture" class="btn btn-outline-gradient">Capture & Predict</button>
            <div id="spinnerCam" class="spinner-border text-success ms-2 d-none" role="status"></div>
          </div>
          <hr>
          <div>
            <div id="camDetected" class="mb-2 fw-semibold"></div>
            <div id="camAccuracy" class="mb-2"></div>
            <div id="camTelugu" class="alert alert-telugu d-none" role="alert"></div>
            <audio id="camAudio" controls class="w-100 d-none mt-2"></audio>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card p-3">
          <h5 class="card-title">వేగవంతమైన ఉపకరణాలు</h5>
          <p class="mb-2">లైవ్ మండి ధరలు మరియు తెలుగు వాయిస్ కోసం Home పేజీకి వెళ్లండి.</p>
          <a href="/" class="btn btn-gradient">Go to Home</a>
        </div>
      </div>
    </div>
  </div>

<script>
const fileInput = document.getElementById('fileInput');
const drop = document.getElementById('drop');
const preview = document.getElementById('preview');
const btnUpload = document.getElementById('btnUpload');
const spinnerFile = document.getElementById('spinnerFile');
const fileDetected = document.getElementById('fileDetected');
const fileAccuracy = document.getElementById('fileAccuracy');
const fileAudio = document.getElementById('fileAudio');
const fileTelugu = document.getElementById('fileTelugu');

const video = document.getElementById('video');
const btnCapture = document.getElementById('btnCapture');
const spinnerCam = document.getElementById('spinnerCam');
const camDetected = document.getElementById('camDetected');
const camAccuracy = document.getElementById('camAccuracy');
const camAudio = document.getElementById('camAudio');
const camTelugu = document.getElementById('camTelugu');

// Drag & drop
drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
drop.addEventListener('drop', (e) => {
  e.preventDefault(); drop.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) setPreviewFile(f);
});
fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (f) setPreviewFile(f);
});
function setPreviewFile(file){
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.classList.remove('d-none');
  btnUpload.disabled = false;
}

// Webcam setup
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream; video.play();
  }).catch(() => console.log('No webcam or permission denied'));
}

btnUpload.addEventListener('click', () => {
  if (!fileInput.files || fileInput.files.length === 0) { alert('Choose a file'); return; }
  const fd = new FormData();
  fd.append('image', fileInput.files[0]);
  spinnerFile.classList.remove('d-none');
  fetch('/api/predict_file', { method:'POST', body: fd })
    .then(r=>r.json())
    .then(j=>{
      spinnerFile.classList.add('d-none');
      showResult(j, fileDetected, fileAccuracy, fileAudio, fileTelugu);
    })
    .catch(e=>{ spinnerFile.classList.add('d-none'); alert('Error '+e); });
});

btnCapture.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  spinnerCam.classList.remove('d-none');
  canvas.toBlob(blob => {
    const fd = new FormData();
    fd.append('image', blob, 'capture.jpg');
    fetch('/api/predict_file', { method:'POST', body: fd })
      .then(r=>r.json())
      .then(j=>{
        spinnerCam.classList.add('d-none');
        showResult(j, camDetected, camAccuracy, camAudio, camTelugu);
      })
      .catch(e=>{ spinnerCam.classList.add('d-none'); alert('Error '+e); });
  }, 'image/jpeg');
});

function showResult(j, detectedEl, accEl, audioEl, teluguEl){
  if (j.error){
    detectedEl.innerHTML = '<span class="badge bg-danger">పొరపాటు</span>';
    audioEl.classList.add('d-none'); teluguEl.classList.add('d-none'); accEl.textContent = '';
    return;
  }
  detectedEl.innerHTML = '<span class="badge bg-success">వ్యాధి గుర్తింపు</span> ' + (j.label_telugu || '');
  if (j.accuracy != null) accEl.textContent = 'ఖచ్చితత్వం: ' + j.accuracy + '%';
  else if (j.confidence != null) accEl.textContent = 'ఖచ్చితత్వం: ' + Math.round(j.confidence*100) + '%';
  else accEl.textContent = '';

  if (j.telugu_text){
    teluguEl.textContent = j.telugu_text;
    teluguEl.classList.remove('d-none');
    fetch('/api/voice?text=' + encodeURIComponent(j.telugu_text))
      .then(r=>r.ok ? r.blob() : null)
      .then(b=>{
        if(!b) return;
        const url = URL.createObjectURL(b);
        audioEl.src = url;
        audioEl.classList.remove('d-none');
        audioEl.play().catch(()=>{});
      });
  } else {
    teluguEl.classList.add('d-none');
    audioEl.classList.add('d-none');
  }
}
</script>
</body>
</html>
"""

# Profile page (clean, no grammar)
PROFILE_HTML = """
<!doctype html>
<html lang="te">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KrishiNetra - Profile</title>
""" + BASE_STYLES + """
</head>
<body>
""" + HEADER_HTML + """
  <div class="container py-4">
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title">User Profile</h5>
          <p class="mb-1">పేరు: రైతు</p>
          <p class="mb-1">ప్రాంతం: ఆంధ్రప్రదేశ్</p>
          <p class="mb-0 text-muted">మీ వివరాలను ఇక్కడ చూపించండి.</p>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title">Settings</h5>
          <p class="mb-2 small text-muted">OpenAI ఇంటిగ్రేషన్ కోసం OPENAI_API_KEY సెట్ చేయండి.</p>
          <p class="mb-0 small text-muted">లైవ్ ధరల కోసం MANDI_API_URL (+MANDI_API_KEY) సెట్ చేయండి.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"""

# ----------------------
# Routes (Pages)
# ----------------------
@app.route('/')
def home_page():
    return render_template_string(HOME_HTML)

@app.route('/app')
def app_page():
    return render_template_string(APP_HTML)

@app.route('/profile')
def profile_page():
    return render_template_string(PROFILE_HTML)

# ----------------------
# API: Prediction (uses OpenAI if available; fallback to local)
# ----------------------
@app.route('/api/predict_file', methods=['POST'])
def api_predict_file():
    if 'image' not in request.files:
        return jsonify({"error": "no file"}), 400
    f = request.files['image']
    if f.filename == '' or not allowed_file(f.filename):
        return jsonify({"error": "invalid file"}), 400
    data = f.read()
    try:
        res = detect(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    if 'error' in res:
        return jsonify(res), 500
    telugu_text = build_telugu_text(res['label'])
    accuracy = None
    if res.get('confidence') is not None:
        try:
            accuracy = int(round(float(res['confidence']) * 100))
        except Exception:
            accuracy = None
    return jsonify({
        "label_telugu": res.get("label_telugu"),
        "accuracy": accuracy,
        "telugu_text": telugu_text
    })

# ----------------------
# API: Voice (gTTS)
# ----------------------
@app.route('/api/voice')
def api_voice():
    text = request.args.get('text', '').strip()
    lang = request.args.get('lang', '').strip() or 'en'
    if not text:
        return abort(400)
    try:
        mp3_fp = tts_bytes_io(text, lang=lang)
        return send_file(mp3_fp, mimetype='audio/mpeg',
                         download_name=f"voice_{uuid.uuid4().hex}.mp3")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------
# API: Mandi (SSE realtime with OpenAI summary if available)
# ----------------------
@app.route('/api/mandi/stream')
def api_mandi_stream():
    crop = (request.args.get('crop', 'paddy') or 'paddy').lower()

    def gen():
        while True:
            try:
                raw = fetch_mandi_realtime(crop)
                prices = raw.get("prices", [])
                if OPENAI_API_KEY:
                    text = openai_summarize_mandi(prices, crop)
                else:
                    text = mandi_telugu_text(crop, prices)
                payload = json.dumps({"telugu_text": text}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
            except Exception:
                yield f"data: {json.dumps({'telugu_text':'ధరల సమాచారం అందుబాటులో లేదు.'}, ensure_ascii=False)}\n\n"
            time.sleep(10)
    resp = Response(gen(), mimetype='text/event-stream')
    resp.headers['Cache-Control'] = 'no-cache'
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Connection'] = 'keep-alive'
    return resp

# ----------------------
# New: AI status endpoint
@app.route('/api/ai/status')
def api_ai_status():
    openai_online = False
    if OPENAI_API_KEY:
        try:
            # lightweight ping using models list or a tiny completion
            url = f"{OPENAI_BASE}/models"
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
            r = requests.get(url, headers=headers, timeout=10)
            openai_online = r.ok
        except Exception:
            openai_online = False
    return jsonify({
        "openai_configured": bool(OPENAI_API_KEY),
        "openai_online": openai_online,
        "model_vision": OPENAI_MODEL_VISION if OPENAI_API_KEY else None,
        "local_model": bool(model is not None)
    })

# ----------------------
# --- New: training utilities and route ---
def train_model_from_dataset(data_dir: str = 'dataset/PlantVillage', model_path: str = MODEL_PATH, img_size=(64, 64), test_size: float = 0.2):
    """Train an SVM on images found in data_dir where each subfolder is a class.
    Returns dict with accuracy and categories or {error: ..} on failure."""
    if not os.path.exists(data_dir):
        return {"error": f"Data directory not found: {data_dir}"}

    categories_local = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
    if not categories_local:
        return {"error": f"No category subfolders found in {data_dir}"}

    data_list, labels_list = [], []
    counts = {}
    for i, cat in enumerate(categories_local):
        folder = os.path.join(data_dir, cat)
        counts[cat] = 0
        for fname in os.listdir(folder):
            path = os.path.join(folder, fname)
            try:
                img = cv2.imread(path)
                if img is None:
                    continue
                img = cv2.resize(img, img_size)
                data_list.append(img.flatten())
                labels_list.append(i)
                counts[cat] += 1
            except Exception:
                continue

    if not data_list:
        return {"error": "No images loaded from dataset. Check files and permissions."}

    X = np.array(data_list)
    y = np.array(labels_list)

    try:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, stratify=y)
    except Exception:
        # fallback if stratify fails (e.g., very small classes)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size)

    clf = SVC(kernel='linear', probability=True)
    clf.fit(X_train, y_train)
    accuracy = float(clf.score(X_test, y_test))

    os.makedirs(os.path.dirname(model_path) or 'model', exist_ok=True)
    try:
        joblib.dump((clf, categories_local), model_path)
    except Exception as e:
        return {"error": f"Failed saving model: {e}"}

    return {"accuracy": accuracy, "categories": categories_local, "counts": counts, "model_path": model_path}


@app.route('/api/train', methods=['POST'])
def api_train():
    """Trigger training on the server. Protect with TRAIN_SECRET environment variable:
    set TRAIN_SECRET to a value and provide ?secret=<value> when calling this endpoint.
    """
    required = os.getenv('TRAIN_SECRET', '').strip()
    provided = (request.args.get('secret') or '').strip()
    if required and provided != required:
        return jsonify({"error": "unauthorized - missing or invalid secret"}), 403

    data_dir = request.form.get('data_dir') or request.args.get('data_dir') or 'dataset/PlantVillage'
    try:
        result = train_model_from_dataset(data_dir=data_dir)
    except Exception as e:
        return jsonify({"error": f"training failed: {str(e)}", "trace": traceback.format_exc()}), 500

    if 'error' in result:
        return jsonify(result), 500

    # reload into memory
    global model, categories
    try:
        model, categories = joblib.load(MODEL_PATH)
    except Exception as e:
        return jsonify({"error": "trained but failed to load model into memory", "detail": str(e)}), 500

    return jsonify({
        "status": "trained",
        "accuracy": result.get('accuracy'),
        "num_categories": len(categories),
        "categories": categories,
        "counts": result.get('counts', {})
    })

# ----------------------
# Simple in-memory Tool Rentals API (for dev/demo)
# ----------------------
TOOL_STORE = [
    {"id": "t1", "name": "Rotavator", "description": "Small rotavator for tilling", "available": True, "renter": None, "hourly_rate": 300.0, "daily_rate": 1800.0},
    {"id": "t2", "name": "Cultivator", "description": "Tractor-mounted cultivator for soil preparation", "available": True, "renter": None, "hourly_rate": 400.0, "daily_rate": 2400.0},
    {"id": "t3", "name": "Power Tiller", "description": "Two-wheel power tiller for small fields", "available": True, "renter": None, "hourly_rate": 200.0, "daily_rate": 1200.0},
    {"id": "t4", "name": "Seed Drill", "description": "Mechanical seed drill for uniform seeding", "available": True, "renter": None, "hourly_rate": 150.0, "daily_rate": 900.0},
    {"id": "t5", "name": "Sprayer", "description": "Battery sprayer for pesticides and fertilizers", "available": True, "renter": None, "hourly_rate": 80.0, "daily_rate": 480.0},
    {"id": "t6", "name": "Combine Harvester", "description": "Combine for harvesting cereals", "available": True, "renter": None, "hourly_rate": 1200.0, "daily_rate": 7200.0},
    {"id": "t7", "name": "Plough", "description": "Moldboard plough for primary tillage", "available": True, "renter": None, "hourly_rate": 100.0, "daily_rate": 600.0},
    {"id": "t8", "name": "Thresher", "description": "Small portable thresher", "available": True, "renter": None, "hourly_rate": 180.0, "daily_rate": 1080.0},
    {"id": "t9", "name": "Water Pump", "description": "Diesel/electric water pump for irrigation", "available": True, "renter": None, "hourly_rate": 90.0, "daily_rate": 540.0},
    {"id": "t10", "name": "Potato Planter", "description": "Planting machine for potato seedlings", "available": True, "renter": None, "hourly_rate": 250.0, "daily_rate": 1500.0},
    {"id": "t11", "name": "Transplanter", "description": "Rice transplanter for paddy fields", "available": True, "renter": None, "hourly_rate": 300.0, "daily_rate": 1800.0},
    {"id": "t12", "name": "Fertilizer Spreader", "description": "Broadcast spreader for granulated fertilizer", "available": True, "renter": None, "hourly_rate": 120.0, "daily_rate": 720.0},
    {"id": "t13", "name": "Mulcher", "description": "Mulcher for crop residue management", "available": True, "renter": None, "hourly_rate": 220.0, "daily_rate": 1320.0},
]
TOOL_LOCK = threading.Lock()
_EVENTS = Queue()

def _broadcast_tools():
    try:
        _EVENTS.put(json.dumps({"tools": TOOL_STORE}, ensure_ascii=False))
    except Exception:
        pass

@app.route('/api/tool-rentals')
def api_tool_rentals():
    return jsonify({"tools": TOOL_STORE})

@app.route('/api/tool-rentals/rent', methods=['POST'])
def api_tool_rentals_rent():
    try:
        body = request.get_json(force=True)
        toolId = body.get('toolId')
        userId = body.get('userId', 'guest')
        rentType = body.get('rentType', 'hourly')  # 'hourly' or 'daily'
        duration = int(body.get('duration', 1))
    except Exception:
        return jsonify({"error": "invalid json"}), 400

    if rentType not in ('hourly', 'daily'):
        return jsonify({"error": "invalid rentType"}), 400
    if duration <= 0:
        return jsonify({"error": "invalid duration"}), 400

    with TOOL_LOCK:
        for t in TOOL_STORE:
            if t['id'] == toolId:
                if not t['available']:
                    return jsonify({"error": "tool not available"}), 400
                # determine rate
                rate_key = 'hourly_rate' if rentType == 'hourly' else 'daily_rate'
                rate = float(t.get(rate_key, 0.0))
                total = round(rate * duration, 2)
                t['available'] = False
                t['renter'] = userId
                t['rent_type'] = rentType
                t['rent_duration'] = duration
                t['rent_rate'] = rate
                t['rent_total'] = total
                _broadcast_tools()
                return jsonify({"status": "rented", "tool": t, "total": total})
    return jsonify({"error": "tool not found"}), 404

@app.route('/api/tool-rentals/return', methods=['POST'])
def api_tool_rentals_return():
    try:
        body = request.get_json(force=True)
        toolId = body.get('toolId')
    except Exception:
        return jsonify({"error": "invalid json"}), 400

    with TOOL_LOCK:
        for t in TOOL_STORE:
            if t['id'] == toolId:
                if t['available']:
                    return jsonify({"error": "tool already available"}), 400
                # clear rental metadata
                t['available'] = True
                t['renter'] = None
                t.pop('rent_type', None)
                t.pop('rent_duration', None)
                t.pop('rent_rate', None)
                t.pop('rent_total', None)
                _broadcast_tools()
                return jsonify({"status": "returned", "tool": t})
    return jsonify({"error": "tool not found"}), 404

@app.route('/api/tool-rentals/stream')
def api_tool_rentals_stream():
    def gen():
        # initial snapshot
        initial = json.dumps({"tools": TOOL_STORE}, ensure_ascii=False)
        yield f"data: {initial}\n\n"
        while True:
            try:
                msg = _EVENTS.get(timeout=15)
                yield f"data: {msg}\n\n"
            except Empty:
                # heartbeat to keep connection alive
                hb = json.dumps({"heartbeat": True})
                yield f"data: {hb}\n\n"
    resp = Response(gen(), mimetype='text/event-stream')
    resp.headers['Cache-Control'] = 'no-cache'
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Connection'] = 'keep-alive'
    return resp

# ----------------------
# Run
# ----------------------
if __name__ == '__main__':
    os.makedirs('model', exist_ok=True)
    print("Starting Flask app on http://127.0.0.1:5000")
    app.run(debug=True)