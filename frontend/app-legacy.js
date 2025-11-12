/* ===== Base API ===== */
const API = (location.origin.includes("localhost") || location.origin.includes("127.0.0.1"))
  ? "http://127.0.0.1:8000"
  : location.origin.replace(/\/$/, "");

let token = null;
let salt_user_b64u = null;

/* ===== UI de sesión (muestra/oculta .protected por CSS) ===== */
function setAuthUI(isAuth){
  document.body.classList.toggle("auth-ok", isAuth);
  const btnLogout = document.querySelector("#btnLogout");
  if (btnLogout) btnLogout.style.display = isAuth ? "inline-block" : "none";

  if (!isAuth) {
    // Limpia vistas/indicadores
    const kmixInfo = document.querySelector("#kmixInfo");
    const entries = document.querySelector("#entries");
    if (kmixInfo) kmixInfo.textContent = "";
    if (entries) entries.innerHTML = "";
  }
}
document.addEventListener("DOMContentLoaded", () => setAuthUI(false));

/* ===== b64url helpers ===== */
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
const ub64u = (s) => Uint8Array.from(atob(s.replaceAll("-","+").replaceAll("_","/")), c => c.charCodeAt(0));

/* ===== KDFs ===== */
async function pbkdf2_sha256(password, salt, iterations=210000, dkLen=32){
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), {name:"PBKDF2"}, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2", hash:"SHA-256", salt, iterations}, keyMat, dkLen*8);
  return new Uint8Array(bits);
}
async function hkdf_sha256(ikm, salt, infoStr="k_mix", L=32){
  const key = await crypto.subtle.importKey("raw", ikm, {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt));
  let T = new Uint8Array(0), okm = new Uint8Array(0), c = 0;
  const info = new TextEncoder().encode(infoStr);
  while (okm.length < L){
    c += 1;
    const msg = new Uint8Array(T.length + info.length + 1);
    msg.set(T,0); msg.set(info,T.length); msg[msg.length-1] = c;
    const k2 = await crypto.subtle.importKey("raw", prk, {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
    T = new Uint8Array(await crypto.subtle.sign("HMAC", k2, msg));
    okm = new Uint8Array([...okm, ...T]);
  }
  return okm.slice(0, L);
}

/* ===== Device secret ===== */
function getOrCreateDeviceSecret(){
  let s = localStorage.getItem("device_secret_b64u");
  if (!s){
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    s = b64u(rnd);
    localStorage.setItem("device_secret_b64u", s);
  }
  return s;
}
function exportSecret(){
  const s = getOrCreateDeviceSecret();
  const blob = new Blob([s], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "device_secret.b64u.txt";
  a.click();
}
function importSecret(file){
  const reader = new FileReader();
  reader.onload = () => {
    const text = (reader.result || "").toString().trim();
    if (!text) return alert("Archivo vacío");
    localStorage.setItem("device_secret_b64u", text);
    alert("Secreto importado correctamente");
    computeKmix();
  };
  reader.readAsText(file);
}

async function scorePasswordViaApi(pwd) {
  const res = await fetch(`${API}/tools/score`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ password: pwd })
  });
  if (!res.ok) throw new Error("pwscore failed");
  return await res.json(); // {score: 1..5, label: "...", (opcional) suggestions: []}
}

async function computeKmix(){
  const mp = document.querySelector("#master")?.value;
  if (!token || !mp || !salt_user_b64u) {
    const kmixInfo = document.querySelector("#kmixInfo");
    if (kmixInfo) kmixInfo.textContent = "Falta login/MP/metadata";
    return null;
  }
  const salt_user = ub64u(salt_user_b64u);
  const K_user = await pbkdf2_sha256(mp, salt_user, 210000, 32);
  const dev_b64u = getOrCreateDeviceSecret();
  const K_mix = await hkdf_sha256(K_user, ub64u(dev_b64u), "k_mix", 32);
  const kmixB64u = b64u(K_mix);
  const kmixInfo = document.querySelector("#kmixInfo");
  if (kmixInfo) kmixInfo.innerHTML = `K_mix listo <span class="badge ok">${kmixB64u.slice(0,8)}…</span>`;
  return kmixB64u;
}

async function api(path, method="GET", body=null, useKmix=false){
  const headers = {"Content-Type":"application/json"};
  if (token) headers["Authorization"] = "Bearer " + token;
  if (useKmix){
    const kmix = await computeKmix();
    if (!kmix) throw new Error("K_mix no disponible");
    headers["X-Kmix-B64u"] = kmix;
  }
  const res = await fetch(`${API}${path}`, {method, headers, body: body ? JSON.stringify(body) : undefined});
  if (!res.ok){
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  }
  return res.json();
}

/* ===== Auth ===== */
document.querySelector("#btnRegister").onclick = async ()=>{
  try{
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const r = await api("/auth/register","POST",{email,password});
    token = r.access_token;
    const me = await api("/auth/me");
    salt_user_b64u = me.salt_user_b64u;
    document.querySelector("#authMsg").textContent = "Registrado y logueado ✅";
    setAuthUI(true);
  }catch(e){ alert(e); }
};

document.querySelector("#btnLogin").onclick = async ()=>{
  try{
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const r = await api("/auth/login","POST",{email,password});
    token = r.access_token;
    const me = await api("/auth/me");
    salt_user_b64u = me.salt_user_b64u;
    document.querySelector("#authMsg").textContent = "Sesión iniciada ✅";
    setAuthUI(true);
    loadEntries();
  }catch(e){ alert(e); }
};

document.querySelector("#btnLogout").onclick = () => {
  if (confirm("¿Seguro que deseas cerrar sesión?")) {
    token = null;
    salt_user_b64u = null;

    // limpiar formularios
    const ids = ["email","password","master","title","vuser","vurl","vnote","vsecret","genOut"];
    ids.forEach(id => { const el = document.querySelector("#"+id); if (el) el.value = ""; });

    const scoreOut = document.querySelector("#scoreOut");
    const vsecretStrength = document.querySelector("#vsecretStrength");
    if (scoreOut) scoreOut.textContent = "";
    if (vsecretStrength){ vsecretStrength.textContent = ""; vsecretStrength.className = "muted"; }

    // limpiar UI
    const authMsg = document.querySelector("#authMsg");
    if (authMsg) authMsg.textContent = "Sesión cerrada.";
    setAuthUI(false);
    alert("Sesión cerrada correctamente.");
  }
};

/* ===== Secreto dispositivo UI ===== */
const btnCreateSecret = document.querySelector("#btnCreateSecret");
if (btnCreateSecret) btnCreateSecret.onclick = ()=>{
  getOrCreateDeviceSecret();
  alert("Secreto creado (o ya existía).");
  computeKmix();
};
const btnExportSecret = document.querySelector("#btnExportSecret");
if (btnExportSecret) btnExportSecret.onclick = exportSecret;
const btnImportSecret = document.querySelector("#btnImportSecret");
if (btnImportSecret) btnImportSecret.onclick = ()=> document.querySelector("#secretFile").click();
const secretFile = document.querySelector("#secretFile");
if (secretFile) secretFile.onchange = (ev)=> importSecret(ev.target.files[0]);

/* ===== Generador ===== */
document.querySelector("#btnGen").onclick = async ()=>{
  const length = parseInt(document.querySelector("#genLen").value,10);
  const use_symbols = document.querySelector("#genSym").checked;
  const r = await api("/tools/generate","POST",{length, use_symbols});
  document.querySelector("#genOut").value = r.password || "";
  const scoreEl = document.querySelector("#scoreOut");
  if (scoreEl){
    scoreEl.textContent = `score: ${r.score} (${r.label})`;
    scoreEl.title = (r.suggestions && r.suggestions.length) ? r.suggestions.join("\n") : "";
  }
};
document.querySelector("#btnScore").onclick = async ()=>{
  const pw = document.querySelector("#genOut").value;
  const r = await api("/tools/score","POST",{password: pw});
  const scoreEl = document.querySelector("#scoreOut");
  if (scoreEl){
    scoreEl.textContent = `score: ${r.score} (${r.label})`;
    scoreEl.title = (r.suggestions && r.suggestions.length) ? r.suggestions.join("\n") : "";
  }
};

// Copiar al portapapeles
document.querySelector("#btnCopyGen").onclick = async ()=>{
  const val = document.querySelector("#genOut").value || "";
  if (!val) return alert("Nada que copiar");
  await navigator.clipboard.writeText(val);
  alert("Copiado ✅");
};



/* ===== Medidor de seguridad (usa backend zxcvbn) ===== */
let secretDebounce;
function updateVSecretStrength(pwd) {
  const el = document.querySelector("#vsecretStrength");
  if (!el) return;
  if (!pwd) { el.textContent = ""; el.title=""; return; }
  clearTimeout(secretDebounce);
  secretDebounce = setTimeout(async () => {
    try {
      const r = await scorePasswordViaApi(pwd);         // <- usa API/zxcvbn
      let text = `Seguridad: ${r.label} (score ${r.score})`;
      if (r.suggestions && r.suggestions.length) {
        text += `\n💡 ${r.suggestions.join("\n💡 ")}`;
      }
      el.textContent = text;
      el.title = ""; 
    } catch (e) {
      el.textContent = "No se pudo calificar";
      el.title = "";
    }
  }, 250);
}


document.querySelector("#vsecret").addEventListener("input", (e) => {
  updateVSecretStrength(e.target.value);
});

document.querySelector("#btnUseGen").onclick = ()=>{
  const val = document.querySelector("#genOut").value || "";
  if (!val) return alert("Primero genera una contraseña");
  const v = document.querySelector("#vsecret");
  v.value = val;
  updateVSecretStrength(val);                           // <- recalcula con zxcvbn
};

/* ===== Vault CRUD ===== */
document.querySelector("#btnCreate").onclick = async ()=> {
  try {
    const data = {
      title: document.querySelector("#title").value,
      username: document.querySelector("#vuser").value || null,
      url: document.querySelector("#vurl").value || null,
      note: document.querySelector("#vnote").value || null,
      secret_plain: document.querySelector("#vsecret").value
    };
    await api("/vault","POST",data,true);
    alert("Guardado ✅");
    loadEntries();

    // 🧹 Limpieza de campos del formulario
    const fields = ["title", "vuser", "vurl", "vnote", "vsecret"];
    fields.forEach(id => {
      const el = document.querySelector("#" + id);
      if (el) el.value = "";
    });

    // Limpia el medidor de fuerza
    updateVSecretStrength("");

  } catch(e){ alert(e); }
};

async function loadEntries(){
  if (!token) return;
  const rows = await api("/vault","GET");
  const box = document.querySelector("#entries");
  if (!box) return;
  box.innerHTML = "";
  rows.forEach(r=>{
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <div>
        <h3>${r.title}</h3>
        <small>${r.username || ""} ${r.url ? "· "+r.url : ""}</small>
      </div>
      <div class="actions">
        <button data-id="${r.id}" class="btnView">Ver</button>
        <button data-id="${r.id}" class="btnDel">Eliminar</button>
      </div>
    `;
    box.appendChild(div);
  });
  box.querySelectorAll(".btnView").forEach(b=>{
    b.onclick = async ()=>{
      try{
        const id = b.getAttribute("data-id");
        const r = await api(`/vault/${id}`,"GET",null,true);
        alert(`🔑 Password: ${r.secret_plain}`);
      }catch(e){ alert(e); }
    };
  });
  box.querySelectorAll(".btnDel").forEach(b=>{
    b.onclick = async ()=>{
      try{
        const id = b.getAttribute("data-id");
        if (confirm("¿Eliminar entrada?")){
          await api(`/vault/${id}`,"DELETE");
          loadEntries();
        }
      }catch(e){ alert(e); }
    };
  });
}
// refresco periódico solo con sesión
setInterval(()=>{ if (token) loadEntries(); }, 3000);

/* ===== 👁️ Mostrar/ocultar campos password ===== */
function attachEye(toggleId, inputId){
  const btn = document.querySelector(toggleId);
  const inp = document.querySelector(inputId);
  if (!btn || !inp) return;
  btn.onclick = () => {
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁️";
  };
}
attachEye("#toggleLoginPwd", "#password");
attachEye("#toggleGenOut", "#genOut");
attachEye("#toggleVSecret", "#vsecret");
