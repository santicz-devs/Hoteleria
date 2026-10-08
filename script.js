const $ = (id) => document.getElementById(id);

const ROOM_KEYS = {
  individual: "Individual",
  doble: "Doble",
  triple: "Triple"
};

const today = new Date();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
$("checkin").min = iso(today);
$("checkout").min = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate()+1));

$("checkin").addEventListener("change", () => {
  const d = new Date($("checkin").value + "T12:00:00");
  if (!isNaN(d)) {
    const next = new Date(d);
    next.setDate(next.getDate()+1);
    $("checkout").min = iso(next);
    if (!$("checkout").value || $("checkout").value <= $("checkin").value) {
      $("checkout").value = iso(next);
    }
  }
});

$("menuToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a =>
  a.addEventListener("click", () => $("mainNav").classList.remove("open"))
);

let search = { checkin: "", checkout: "", guests: 2 };
let availableRooms = [];

function nightsBetween(a, b) {
  return Math.round((new Date(b+"T12:00:00") - new Date(a+"T12:00:00")) / 86400000);
}
function formatDate(s) {
  return new Date(s+"T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}
function formatARS(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0
  }).format(value);
}
function configIsReady() {
  return typeof SUPABASE_URL === "string" &&
    typeof SUPABASE_KEY === "string" &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_KEY.startsWith("sb_publishable_");
}

async function supabaseRpc(functionName, payload) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Profile": "public"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || data.details || JSON.stringify(data)
    );
  }

  return data;
}

function setRoomCards(rows) {
  availableRooms = rows.map(row => ({
    id: Number(row.habitacion_id),
    name: row.nombre,
    capacity: Number(row.capacidad),
    price: Number(row.precio_por_noche),
    key: Object.keys(ROOM_KEYS).find(k => ROOM_KEYS[k].toLowerCase() === String(row.nombre).toLowerCase())
  })).filter(r => r.key);

  document.querySelectorAll(".room-card").forEach(card => {
    const room = availableRooms.find(r => r.key === card.dataset.room);
    card.hidden = !room;
    if (room) {
      const price = card.querySelector(".room-bottom strong");
      if (price) price.textContent = formatARS(room.price);
    }
  });
}

$("availabilityForm").addEventListener("submit", async e => {
  e.preventDefault();
  const start = $("checkin").value;
  const end = $("checkout").value;
  const guests = Number($("guests").value);
  if (!start || !end || nightsBetween(start, end) <= 0) {
    $("availabilityMessage").textContent = "Elegí una fecha de salida posterior al ingreso.";
    return;
  }
  if (!configIsReady()) {
    $("availabilityMessage").textContent = "Falta configurar la clave pública de Supabase en supabase-config.js.";
    return;
  }

  search = { checkin: start, checkout: end, guests };
  const submit = $("availabilityForm").querySelector('button[type="submit"]');
  submit.disabled = true;
  $("availabilityMessage").textContent = "Consultando disponibilidad...";
  try {
    const rows = await supabaseRpc("consultar_disponibilidad", {
      p_entrada: start, p_salida: end, p_huespedes: guests
    });
    setRoomCards(Array.isArray(rows) ? rows : []);
    $("availabilityMessage").textContent = availableRooms.length
      ? `Encontramos ${availableRooms.length} habitación(es) disponible(s). Elegí una opción abajo.`
      : "No hay habitaciones disponibles para esas fechas y cantidad de huéspedes. Probá otras fechas.";
    if (availableRooms.length) $("habitaciones").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error(error);
    $("availabilityMessage").textContent = `No pudimos consultar la disponibilidad. ${error.message}`;
  } finally {
    submit.disabled = false;
  }
});

function openBooking(key) {
  if (!search.checkin || !search.checkout || nightsBetween(search.checkin, search.checkout) <= 0) {
    $("availabilityMessage").textContent = "Primero elegí las fechas de ingreso y salida.";
    $("reservar").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const room = availableRooms.find(r => r.key === key);
  if (!room) {
    $("availabilityMessage").textContent = "Buscá disponibilidad nuevamente para esa habitación.";
    return;
  }
  if (room.capacity < search.guests) {
    $("availabilityMessage").textContent = "Esa habitación no tiene capacidad para la cantidad de huéspedes elegida.";
    return;
  }

  $("selectedRoom").value = key;
  $("bookingSummary").textContent =
    `${room.name} · ${formatDate(search.checkin)} al ${formatDate(search.checkout)} · ${search.guests} huésped(es)`;
  $("bookingPrice").textContent = formatARS(room.price * nightsBetween(search.checkin, search.checkout));
  $("bookingResult").textContent = "";
  $("bookingForm").querySelector('button[type="submit"]').disabled = false;
  $("bookingDialog").showModal();
}

document.querySelectorAll(".book-room").forEach(button =>
  button.addEventListener("click", () => openBooking(button.dataset.room))
);
$("closeDialog").addEventListener("click", () => $("bookingDialog").close());
$("bookingDialog").addEventListener("click", e => {
  if (e.target === $("bookingDialog")) $("bookingDialog").close();
});

$("bookingForm").addEventListener("submit", async e => {
  e.preventDefault();
  const key = $("selectedRoom").value;
  const room = availableRooms.find(r => r.key === key);
  if (!room) {
    $("bookingResult").textContent = "No encontramos esa habitación. Volvé a consultar disponibilidad.";
    return;
  }
  if (!configIsReady()) {
    $("bookingResult").textContent = "Falta configurar la clave pública de Supabase.";
    return;
  }

  const button = $("bookingForm").querySelector('button[type="submit"]');
  button.disabled = true;
  $("bookingResult").textContent = "Enviando solicitud...";
  try {
    const result = await supabaseRpc("solicitar_reserva", {
      p_habitacion_id: room.id,
      p_nombre: $("guestName").value.trim(),
      p_email: $("guestEmail").value.trim(),
      p_telefono: $("guestPhone").value.trim(),
      p_entrada: search.checkin,
      p_salida: search.checkout,
      p_huespedes: search.guests
    });
    const reservationId = result && result.reserva_id ? result.reserva_id : "";
    $("bookingResult").textContent = `Solicitud registrada${reservationId ? ` (N.º ${reservationId})` : ""}. Queda pendiente de confirmación por el hotel.`;
    $("bookingForm").reset();
    setTimeout(() => {
      $("bookingDialog").close();
      // Refresh results so the new pending reservation no longer appears available.
      $("availabilityForm").requestSubmit();
    }, 2200);
  } catch (error) {
    console.error(error);
    $("bookingResult").textContent = error.message.includes("reserva") || error.message.includes("solap")
      ? "La habitación ya no está disponible para esas fechas. Buscá nuevamente."
      : `No se pudo registrar la solicitud. ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
