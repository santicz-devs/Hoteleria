const $ = id => document.getElementById(id);

function money(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function showMessage(text, isError = false) {
  const el = $("panelMessage");
  el.textContent = text || "";
  el.classList.toggle("error", isError);
}
async function api(path, options = {}, useAuth = true) {
  const session = useAuth ? await getSession() : null;
  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {})
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  else headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.msg || data?.error_description || text || `Error HTTP ${response.status}`);
  return data;
}
async function getSession() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${sessionStorage.getItem("hp_admin_access_token") || ""}` }
  });
  if (!response.ok) return null;
  const user = await response.json();
  const token = sessionStorage.getItem("hp_admin_access_token");
  return token ? { user, access_token: token } : null;
}
async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "No se pudo iniciar sesión.");
  sessionStorage.setItem("hp_admin_access_token", data.access_token);
  sessionStorage.setItem("hp_admin_refresh_token", data.refresh_token);
  return data;
}
async function signOut() {
  const token = sessionStorage.getItem("hp_admin_access_token");
  if (token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
      });
    } catch {}
  }
  sessionStorage.removeItem("hp_admin_access_token");
  sessionStorage.removeItem("hp_admin_refresh_token");
}
function roomLabel(row) {
  const name = row.habitaciones?.nombre || row.habitacion_nombre || row.nombre_habitacion;
  return name || `Habitación #${row.habitacion_id ?? "—"}`;
}
function normalizedStatus(value) {
  const map = { pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada" };
  return map[String(value || "").toLowerCase()] || value || "Pendiente";
}
let reservations = [];


async function loadReservations() {
  showMessage("Cargando reservas...");

  try {
    reservations = await api(
      "/rest/v1/reservas?select=*",
      {
        headers: {
          "Accept-Profile": "public"
        }
      }
    );

    if (!Array.isArray(reservations)) {
      reservations = [];
    }

    render();

    showMessage(
      reservations.length
        ? `Se cargaron ${reservations.length} reserva(s).`
        : "No hay reservas registradas."
    );
  } catch (error) {
    console.error("Error al cargar reservas:", error);
    showMessage(
      `No se pudieron cargar las reservas: ${error.message}`,
      true
    );
  }
}
function render() {
  const pending = reservations.filter(r => String(r.estado).toLowerCase() === "pendiente");
  const confirmed = reservations.filter(r => String(r.estado).toLowerCase() === "confirmada");
  $("totalCount").textContent = reservations.length;
  $("pendingCount").textContent = pending.length;
  $("confirmedCount").textContent = confirmed.length;
  // La tabla reservas no almacena necesariamente un total; se calcula con el precio de la habitación si está disponible.
  $("revenueCount").textContent = money(confirmed.reduce((sum, r) => sum + Number(r.total ?? r.importe_total ?? 0), 0));
  $("emptyState").hidden = reservations.length > 0;
  $("reservationRows").innerHTML = reservations.map(r => {
    const status = normalizedStatus(r.estado);
    const cls = status === "Confirmada" ? "confirmada" : status === "Cancelada" ? "cancelada" : "pendiente";
    const guest = r.nombre_huesped ?? r.nombre ?? r.name ?? "Sin nombre";
    const email = r.email ?? "";
    const phone = r.telefono ?? r.phone ?? "";
    const checkin = r.fecha_entrada ?? r.checkin;
    const checkout = r.fecha_salida ?? r.checkout;
    const guests = r.cantidad_huespedes ?? r.huespedes ?? r.guests ?? "—";
    return `<tr>
      <td><strong>${escapeHtml(guest)}</strong><br><span style="color:#777">${escapeHtml(email)}${phone ? `<br>${escapeHtml(phone)}` : ""}</span></td>
      <td>${escapeHtml(roomLabel(r))}</td><td>${formatDate(checkin)}</td><td>${formatDate(checkout)}</td>
      <td>${escapeHtml(guests)}</td><td>${money(r.total ?? r.importe_total ?? 0)}</td>
      <td><span class="status status-${cls}">${escapeHtml(status)}</span></td>
      <td>${status === "Pendiente" ? `<button class="table-action" data-action="confirm" data-id="${escapeHtml(r.id)}">Confirmar</button>` : ""}
      ${status !== "Cancelada" ? `<button class="table-action" data-action="cancel" data-id="${escapeHtml(r.id)}">Cancelar</button>` : ""}</td>
    </tr>`;
  }).join("");
}
async function updateStatus(id, status) {
  try {
    await api(`/rest/v1/reservas?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Profile": "public", Prefer: "return=minimal" },
      body: JSON.stringify({ estado: status.toLowerCase() })
    });
    showMessage(`Reserva actualizada: ${normalizedStatus(status)}.`);
    await loadReservations();
  } catch (error) {
    showMessage(`No se pudo actualizar la reserva: ${error.message}`, true);
  }
}
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("loginBtn");
  button.disabled = true;
  $("loginError").textContent = "";
  try {
    await signIn($("adminEmail").value.trim(), $("adminPassword").value);
    $("loginCard").hidden = true;
    $("dashboard").hidden = false;
    await loadReservations();
  } catch (error) {
    $("loginError").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$("logoutBtn").addEventListener("click", async () => {
  await signOut();
  $("dashboard").hidden = true;
  $("loginCard").hidden = false;
  $("adminPassword").value = "";
});
$("refreshBtn").addEventListener("click", loadReservations);
$("reservationRows").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = reservations.find(r => String(r.id) === button.dataset.id);
  if (!row) return;
  if (button.dataset.action === "confirm") updateStatus(row.id, "confirmada");
  if (button.dataset.action === "cancel" && confirm("¿Querés cancelar esta reserva?")) updateStatus(row.id, "cancelada");
});
$("exportCsv").addEventListener("click", () => {
  const headers = ["ID", "Huésped", "Email", "Teléfono", "Habitación", "Ingreso", "Salida", "Huéspedes", "Importe ARS", "Estado", "Creada"];
  const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = reservations.map(r => [
    r.id, r.nombre_huesped ?? r.nombre ?? r.name, r.email, r.telefono ?? r.phone,
    roomLabel(r), r.fecha_entrada ?? r.checkin, r.fecha_salida ?? r.checkout,
    r.cantidad_huespedes ?? r.huespedes ?? r.guests, r.total ?? r.importe_total,
    normalizedStatus(r.estado), r.created_at
  ]);
  const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(cell).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "hotel-perico-reservas.csv"; a.click();
  URL.revokeObjectURL(url);
});
(async function init() {
  if (!window.SUPABASE_URL || !window.SUPABASE_KEY || SUPABASE_KEY.includes("PEGÁ_ACÁ")) {
    $("loginError").textContent = "Configurá la URL y la clave pública en supabase-config.js.";
    return;
  }
  const session = await getSession();
  if (session) {
    $("loginCard").hidden = true;
    $("dashboard").hidden = false;
    await loadReservations();
  }
})();
