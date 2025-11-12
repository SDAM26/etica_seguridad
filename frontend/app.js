/* =================== PASSWORD MANAGER SPA - MODERN VERSION =================== */

/* ===== Configuration ===== */
const API = (location.origin.includes("localhost") || location.origin.includes("127.0.0.1"))
  ? "http://127.0.0.1:8000"
  : location.origin.replace(/\/$/, "");

let token = null;
let salt_user_b64u = null;
let generatedPassword = ""; // Para "Usar en Vault"

/* ===== View Management (SPA Routing) ===== */
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');
}

function setAuthUI(isAuth) {
    document.body.classList.toggle("auth-ok", isAuth);
    if (isAuth) {
        showView('view-master');
    } else {
        showView('view-login');
        const kmixInfo = document.querySelector("#kmix-info");
        const entriesList = document.querySelector("#entries-list");
        if (kmixInfo) kmixInfo.innerHTML = "";
        if (entriesList) entriesList.innerHTML = "";
    }
}

/* ===== Base64 URL Helpers ===== */
const b64u = (bytes) => btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const ub64u = (s) => Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), c => c.charCodeAt(0));

/* ===== Cryptographic Functions ===== */
async function pbkdf2_sha256(password, salt, iterations = 210000, dkLen = 32) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, keyMat, dkLen * 8);
    return new Uint8Array(bits);
}

async function hkdf_sha256(ikm, salt, infoStr = "k_mix", L = 32) {
    const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt));
    let T = new Uint8Array(0), okm = new Uint8Array(0), c = 0;
    const info = new TextEncoder().encode(infoStr);
    while (okm.length < L) {
        c += 1;
        const msg = new Uint8Array(T.length + info.length + 1);
        msg.set(T, 0); msg.set(info, T.length); msg[msg.length - 1] = c;
        const k2 = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        T = new Uint8Array(await crypto.subtle.sign("HMAC", k2, msg));
        okm = new Uint8Array([...okm, ...T]);
    }
    return okm.slice(0, L);
}

/* ===== Device Secret Management ===== */
function getOrCreateDeviceSecret() {
    let s = localStorage.getItem("device_secret_b64u");
    if (!s) {
        const rnd = crypto.getRandomValues(new Uint8Array(16));
        s = b64u(rnd);
        localStorage.setItem("device_secret_b64u", s);
    }
    return s;
}

function exportSecret() {
    const s = getOrCreateDeviceSecret();
    const blob = new Blob([s], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "device_secret.key";
    a.click();
}

function importSecret(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const text = (reader.result || "").toString().trim();
        if (!text) return showToast("Archivo vacío", "error");
        localStorage.setItem("device_secret_b64u", text);
        showToast("Secreto importado correctamente", "success");
        computeKmix();
    };
    reader.readAsText(file);
}

/* ===== K_mix Computation ===== */
async function computeKmix() {
    const mp = document.querySelector("#master")?.value;
    if (!token || !mp || !salt_user_b64u) {
        const kmixInfo = document.querySelector("#kmix-info");
        if (kmixInfo) kmixInfo.innerHTML = '<p class="text-text-secondary-dark text-sm">Ingresa tu contraseña maestra</p>';
        return null;
    }
    const salt_user = ub64u(salt_user_b64u);
    const K_user = await pbkdf2_sha256(mp, salt_user, 210000, 32);
    const dev_b64u = getOrCreateDeviceSecret();
    const K_mix = await hkdf_sha256(K_user, ub64u(dev_b64u), "k_mix", 32);
    const kmixB64u = b64u(K_mix);
    const kmixInfo = document.querySelector("#kmix-info");
    if (kmixInfo) {
        kmixInfo.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="size-2.5 rounded-full bg-success"></div>
                <p class="text-sm font-medium text-white">K_mix listo: ${kmixB64u.slice(0, 12)}...</p>
            </div>
        `;
    }
    return kmixB64u;
}

/* ===== API Communication ===== */
async function api(path, method = "GET", body = null, useKmix = false) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    if (useKmix) {
        const kmix = await computeKmix();
        if (!kmix) throw new Error("K_mix no disponible");
        headers["X-Kmix-B64u"] = kmix;
    }
    const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${t}`);
    }
    return res.json();
}

/* ===== UI Helpers - Toast Notifications ===== */
function showToast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
        success: "check_circle",
        error: "error",
        warning: "warning",
        info: "info"
    };

    const colors = {
        success: "text-success",
        error: "text-error",
        warning: "text-warning",
        info: "text-primary"
    };

    toast.innerHTML = `
        <span class="material-symbols-outlined ${colors[type]}">${icons[type]}</span>
        <p class="text-white text-sm flex-1">${message}</p>
        <button class="toast-close text-text-secondary-dark hover:text-white transition-colors">
            <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
        </button>
    `;

    container.appendChild(toast);

    // Close button
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.onclick = () => removeToast(toast);

    // Auto remove
    setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
}

function showMessage(text, type = "info") {
    const authMsg = document.querySelector("#auth-message");
    if (authMsg) {
        const colorClass = type === "error" ? "text-error" : type === "success" ? "text-success" : "text-text-primary-dark";
        authMsg.innerHTML = `<p class="${colorClass}">${text}</p>`;
    }
}

/* ===== Modal System ===== */
function showModal(title, content, buttons = []) {
    // Remove existing modal
    const existingModal = document.querySelector(".modal-overlay");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay";

    let buttonsHTML = '';
    if (buttons.length === 0) {
        buttonsHTML = `
            <button class="modal-close flex-1 h-10 px-4 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                Cerrar
            </button>
        `;
    } else {
        buttonsHTML = buttons.map(btn => `
            <button class="modal-btn-${btn.action} flex-1 h-10 px-4 ${btn.style || 'bg-primary text-white'} rounded-lg font-medium hover:opacity-90 transition-opacity">
                ${btn.text}
            </button>
        `).join('');
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-white text-xl font-bold">${title}</h2>
                <button class="modal-close text-text-secondary-dark hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="modal-body text-text-primary-dark mb-6">
                ${content}
            </div>
            <div class="flex gap-3">
                ${buttonsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    modal.querySelectorAll(".modal-close").forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            closeModal();
        };
    });

    // Custom button handlers
    buttons.forEach(btn => {
        const btnEl = modal.querySelector(`.modal-btn-${btn.action}`);
        if (btnEl && btn.handler) {
            btnEl.onclick = () => {
                btn.handler();
                closeModal();
            };
        }
    });

    return modal;
}

function showConfirm(title, message, onConfirm) {
    showModal(title, `<p>${message}</p>`, [
        {
            text: "Cancelar",
            action: "cancel",
            style: "bg-surface-dark border border-border-dark text-white"
        },
        {
            text: "Confirmar",
            action: "confirm",
            style: "bg-primary text-white",
            handler: onConfirm
        }
    ]);
}

/* ===== Password Visibility Toggle ===== */
function setupPasswordToggle(toggleBtnId, inputId) {
    const btn = document.getElementById(toggleBtnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.onclick = () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = isPassword ? "visibility" : "visibility_off";
    };
}

/* ===== Authentication ===== */
document.getElementById("btn-register").onclick = async () => {
    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        if (!email || !password) return showMessage("Por favor completa los campos", "error");

        const r = await api("/auth/register", "POST", { email, password });
        token = r.access_token;
        const me = await api("/auth/me");
        salt_user_b64u = me.salt_user_b64u;
        showMessage("Registrado y logueado exitosamente ✅", "success");
        setTimeout(() => setAuthUI(true), 1000);
    } catch (e) {
        showMessage("Error: " + e.message, "error");
    }
};

document.getElementById("btn-login").onclick = async () => {
    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        if (!email || !password) return showMessage("Por favor completa los campos", "error");

        const r = await api("/auth/login", "POST", { email, password });
        token = r.access_token;
        const me = await api("/auth/me");
        salt_user_b64u = me.salt_user_b64u;
        showMessage("Sesión iniciada exitosamente ✅", "success");
        setTimeout(() => setAuthUI(true), 1000);
    } catch (e) {
        showMessage("Error: " + e.message, "error");
    }
};

document.getElementById("btn-logout").onclick = () => {
    showConfirm(
        "Cerrar sesión",
        "¿Seguro que deseas cerrar sesión?",
        () => {
            token = null;
            salt_user_b64u = null;

            // Clear all form inputs
            ["email", "password", "master", "vault-title", "vault-username", "vault-url", "vault-secret", "vault-note", "gen-output"].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });

            setAuthUI(false);
            showMessage("Sesión cerrada correctamente", "success");
            showToast("Sesión cerrada correctamente", "success");
        }
    );
};

/* ===== Master Password & Device Secret ===== */
document.getElementById("btn-create-secret").onclick = () => {
    getOrCreateDeviceSecret();
    showToast("Secreto creado (o ya existía).", "success");
    computeKmix();
};

document.getElementById("btn-export-secret").onclick = exportSecret;

document.getElementById("btn-import-secret").onclick = () => {
    document.getElementById("secret-file").click();
};

document.getElementById("secret-file").onchange = (ev) => {
    if (ev.target.files[0]) importSecret(ev.target.files[0]);
};

// Auto-compute K_mix when master password changes
document.getElementById("master")?.addEventListener("input", () => {
    computeKmix();
});

/* ===== Navigation Buttons ===== */
document.getElementById("btn-goto-generator").onclick = () => showView('view-generator');
document.getElementById("btn-goto-vault").onclick = () => {
    showView('view-vault');
    loadEntries();
};
document.getElementById("btn-back-from-gen").onclick = () => showView('view-master');
document.getElementById("btn-back-from-vault").onclick = () => showView('view-master');

/* ===== Password Generator ===== */
// Sync slider and number input
const genLengthRange = document.getElementById("gen-length-range");
const genLengthInput = document.getElementById("gen-length");

genLengthRange.oninput = () => {
    genLengthInput.value = genLengthRange.value;
};

genLengthInput.oninput = () => {
    genLengthRange.value = genLengthInput.value;
};

document.getElementById("btn-generate").onclick = async () => {
    try {
        const length = parseInt(genLengthInput.value, 10);
        const use_symbols = document.getElementById("gen-symbols").checked;
        const r = await api("/tools/generate", "POST", { length, use_symbols });

        generatedPassword = r.password || "";
        document.getElementById("gen-output").value = generatedPassword;

        // Update score display
        const scoreLabel = document.getElementById("score-label");
        if (scoreLabel) {
            const colors = { weak: "text-error", medium: "text-warning", strong: "text-success" };
            const colorClass = r.score >= 4 ? colors.strong : r.score >= 2 ? colors.medium : colors.weak;
            scoreLabel.className = colorClass;
            scoreLabel.textContent = r.label || "N/A";
        }
        showToast("Contraseña generada exitosamente", "success");
    } catch (e) {
        showToast("Error: " + e.message, "error");
    }
};

document.getElementById("btn-copy-gen").onclick = async () => {
    const val = document.getElementById("gen-output").value || "";
    if (!val) return showToast("Nada que copiar", "warning");
    await navigator.clipboard.writeText(val);
    showToast("Copiado al portapapeles ✅", "success");
};

document.getElementById("btn-use-gen").onclick = () => {
    const val = document.getElementById("gen-output").value || "";
    if (!val) return showToast("Primero genera una contraseña", "warning");
    showView('view-vault');
    document.getElementById("vault-secret").value = val;
    updateVaultSecretStrength(val);
    showToast("Contraseña copiada al formulario", "success");
};

/* ===== Vault - Password Strength Monitor ===== */
let secretDebounce;
async function updateVaultSecretStrength(pwd) {
    const el = document.getElementById("vault-strength");
    if (!el) return;
    if (!pwd) {
        el.textContent = "";
        return;
    }

    clearTimeout(secretDebounce);
    secretDebounce = setTimeout(async () => {
        try {
            const r = await api("/tools/score", "POST", { password: pwd });
            const colors = { weak: "text-error", medium: "text-warning", strong: "text-success" };
            const colorClass = r.score >= 4 ? colors.strong : r.score >= 2 ? colors.medium : colors.weak;
            let text = `Fortaleza: <span class="${colorClass}">${r.label}</span> (score ${r.score})`;
            if (r.suggestions && r.suggestions.length) {
                text += `<br><span class="text-text-secondary-dark text-xs">💡 ${r.suggestions.join(" • ")}</span>`;
            }
            el.innerHTML = text;
        } catch (e) {
            el.textContent = "No se pudo calificar";
        }
    }, 300);
}

document.getElementById("vault-secret")?.addEventListener("input", (e) => {
    updateVaultSecretStrength(e.target.value);
});

/* ===== Vault - Cancel Edit ===== */
document.getElementById("btn-cancel-edit").onclick = () => {
    // Clear form
    ["vault-title", "vault-username", "vault-url", "vault-secret", "vault-note"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    updateVaultSecretStrength("");

    // Reset button state
    const saveBtn = document.getElementById("btn-save-entry");
    const cancelBtn = document.getElementById("btn-cancel-edit");
    saveBtn.querySelector("span").textContent = "Guardar";
    delete saveBtn.dataset.editId;
    cancelBtn.classList.add("hidden");
    cancelBtn.classList.remove("flex");

    showToast("Edición cancelada", "info");
};

/* ===== Vault - Create/Update Entry ===== */
document.getElementById("btn-save-entry").onclick = async () => {
    try {
        const saveBtn = document.getElementById("btn-save-entry");
        const editId = saveBtn.dataset.editId;
        const isEditing = !!editId;

        const data = {
            title: document.getElementById("vault-title").value,
            username: document.getElementById("vault-username").value || null,
            url: document.getElementById("vault-url").value || null,
            note: document.getElementById("vault-note").value || null,
            secret_plain: document.getElementById("vault-secret").value
        };

        if (!data.title || !data.secret_plain) {
            return showToast("Título y contraseña son obligatorios", "warning");
        }

        if (isEditing) {
            // Update existing entry
            await api(`/vault/${editId}`, "PUT", data, true);
            showToast("Entrada actualizada exitosamente ✅", "success");
            // Reset button state
            saveBtn.querySelector("span").textContent = "Guardar";
            delete saveBtn.dataset.editId;
            const cancelBtn = document.getElementById("btn-cancel-edit");
            cancelBtn.classList.add("hidden");
            cancelBtn.classList.remove("flex");
        } else {
            // Create new entry
            await api("/vault", "POST", data, true);
            showToast("Entrada guardada exitosamente ✅", "success");
        }

        loadEntries();

        // Clear form
        ["vault-title", "vault-username", "vault-url", "vault-secret", "vault-note"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        updateVaultSecretStrength("");
    } catch (e) {
        showToast("Error: " + e.message, "error");
    }
};

/* ===== Vault - Load Entries ===== */
async function loadEntries() {
    if (!token) return;
    try {
        const rows = await api("/vault", "GET");
        const box = document.getElementById("entries-list");
        if (!box) return;

        if (rows.length === 0) {
            box.innerHTML = `
                <div class="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-border-dark rounded-lg">
                    <span class="material-symbols-outlined text-5xl text-text-secondary-dark">lock</span>
                    <p class="mt-4 text-white font-medium">No tienes entradas guardadas</p>
                    <p class="text-sm text-text-secondary-dark">Crea una nueva entrada para empezar.</p>
                </div>
            `;
            return;
        }

        box.innerHTML = "";
        rows.forEach(r => {
            const div = document.createElement("div");
            div.className = "flex items-center p-4 rounded-lg bg-background-dark";
            div.innerHTML = `
                <div class="flex-grow">
                    <p class="text-white text-base font-medium">${r.title}</p>
                    <p class="text-text-secondary-dark text-sm">${r.username || ""}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button data-id="${r.id}" class="btn-view p-2 rounded-full hover:bg-white/10 text-text-secondary-dark hover:text-primary transition-colors" title="Ver detalles">
                        <span class="material-symbols-outlined text-xl">visibility</span>
                    </button>
                    <button data-id="${r.id}" class="btn-edit p-2 rounded-full hover:bg-white/10 text-text-secondary-dark hover:text-primary transition-colors" title="Editar">
                        <span class="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button data-id="${r.id}" class="btn-delete p-2 rounded-full hover:bg-white/10 text-text-secondary-dark hover:text-error transition-colors" title="Eliminar">
                        <span class="material-symbols-outlined text-xl">delete</span>
                    </button>
                </div>
            `;
            box.appendChild(div);
        });

        // Attach event listeners
        box.querySelectorAll(".btn-view").forEach(btn => {
            btn.onclick = async () => {
                try {
                    const id = btn.getAttribute("data-id");
                    const r = await api(`/vault/${id}`, "GET", null, true);

                    // Create modal content with password toggle
                    const passwordId = `pwd-${id}`;
                    const content = `
                        <div class="space-y-4">
                            <div class="bg-background-dark p-4 rounded-lg border border-border-dark">
                                <p class="text-text-secondary-dark text-xs mb-2">CONTRASEÑA</p>
                                <div class="flex items-center gap-2">
                                    <p id="${passwordId}" class="text-white text-lg font-mono flex-1 break-all">••••••••••••</p>
                                    <button onclick="
                                        const el = document.getElementById('${passwordId}');
                                        const btn = this;
                                        const icon = btn.querySelector('.material-symbols-outlined');
                                        if (el.textContent === '••••••••••••') {
                                            el.textContent = '${r.secret_plain.replace(/'/g, "\\'")}';
                                            icon.textContent = 'visibility_off';
                                        } else {
                                            el.textContent = '••••••••••••';
                                            icon.textContent = 'visibility';
                                        }
                                    " class="p-2 rounded-lg bg-surface-dark border border-border-dark text-text-secondary-dark hover:text-white transition-colors">
                                        <span class="material-symbols-outlined" style="font-size: 20px;">visibility</span>
                                    </button>
                                    <button onclick="navigator.clipboard.writeText('${r.secret_plain.replace(/'/g, "\\'")}'); showToast('Contraseña copiada', 'success');" class="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                                        <span class="material-symbols-outlined" style="font-size: 20px;">content_copy</span>
                                    </button>
                                </div>
                            </div>
                            ${r.username ? `
                            <div>
                                <p class="text-text-secondary-dark text-xs mb-1">USUARIO</p>
                                <p class="text-white">${r.username}</p>
                            </div>` : ''}
                            ${r.url ? `
                            <div>
                                <p class="text-text-secondary-dark text-xs mb-1">URL</p>
                                <a href="${r.url}" target="_blank" class="text-primary hover:underline break-all">${r.url}</a>
                            </div>` : ''}
                            ${r.note ? `
                            <div>
                                <p class="text-text-secondary-dark text-xs mb-1">NOTA</p>
                                <p class="text-white whitespace-pre-wrap">${r.note}</p>
                            </div>` : ''}
                        </div>
                    `;

                    showModal(`🔐 ${r.title}`, content);
                } catch (e) {
                    showToast("Error: " + e.message, "error");
                }
            };
        });

        // Edit button
        box.querySelectorAll(".btn-edit").forEach(btn => {
            btn.onclick = async () => {
                try {
                    const id = btn.getAttribute("data-id");
                    const r = await api(`/vault/${id}`, "GET", null, true);

                    // Fill form with existing data
                    document.getElementById("vault-title").value = r.title || "";
                    document.getElementById("vault-username").value = r.username || "";
                    document.getElementById("vault-url").value = r.url || "";
                    document.getElementById("vault-note").value = r.note || "";
                    document.getElementById("vault-secret").value = r.secret_plain || "";

                    // Update strength indicator
                    updateVaultSecretStrength(r.secret_plain || "");

                    // Scroll to form
                    document.getElementById("vault-title").scrollIntoView({ behavior: "smooth", block: "center" });

                    // Change save button to update mode
                    const saveBtn = document.getElementById("btn-save-entry");
                    const cancelBtn = document.getElementById("btn-cancel-edit");
                    saveBtn.querySelector("span").textContent = "Actualizar";
                    saveBtn.dataset.editId = id;
                    cancelBtn.classList.remove("hidden");
                    cancelBtn.classList.add("flex");

                    showToast("Editando entrada - Modifica los campos y haz clic en Actualizar", "info", 4000);
                } catch (e) {
                    showToast("Error: " + e.message, "error");
                }
            };
        });

        box.querySelectorAll(".btn-delete").forEach(btn => {
            btn.onclick = async () => {
                try {
                    const id = btn.getAttribute("data-id");
                    showConfirm(
                        "Eliminar entrada",
                        "¿Estás seguro de que deseas eliminar esta entrada? Esta acción no se puede deshacer.",
                        async () => {
                            try {
                                await api(`/vault/${id}`, "DELETE");
                                loadEntries();
                                showToast("Entrada eliminada exitosamente", "success");
                            } catch (e) {
                                showToast("Error: " + e.message, "error");
                            }
                        }
                    );
                } catch (e) {
                    showToast("Error: " + e.message, "error");
                }
            };
        });
    } catch (e) {
        console.error("Error loading entries:", e);
    }
}

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
    setAuthUI(false);

    // Setup password toggles
    setupPasswordToggle("toggle-login-pwd", "password");
    setupPasswordToggle("toggle-master-pwd", "master");
    setupPasswordToggle("toggle-gen-pwd", "gen-output");
    setupPasswordToggle("toggle-vault-pwd", "vault-secret");
});
