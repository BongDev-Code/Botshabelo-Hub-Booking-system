// Toast notification system
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

// Helper: Format date for display
function formatDate(dateStr) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateStr).toLocaleDateString(undefined, options);
}

// Helper: Format time for display
function formatTime(timeStr) {
  return timeStr.slice(0, 5);
}

// Load bookings from localStorage
function getBookings() {
  return JSON.parse(localStorage.getItem("bookings") || "[]");
}

// Save bookings to localStorage
function saveBookings(bookings) {
  localStorage.setItem("bookings", JSON.stringify(bookings));
}

// Render bookings in the calendar (list view)
function renderCalendar(filter = {}) {
  const calendar = document.getElementById("calendar");
  let bookings = getBookings();
  // Filter by search
  if (filter.search) {
    const s = filter.search.toLowerCase();
    bookings = bookings.filter(
      (b) =>
        b.event.toLowerCase().includes(s) || b.name.toLowerCase().includes(s)
    );
  }
  // Filter by date
  if (filter.date) {
    bookings = bookings.filter((b) => b.date === filter.date);
  }
  calendar.innerHTML = "";
  if (bookings.length === 0) {
    calendar.innerHTML = "<p>No bookings found.</p>";
    return;
  }
  bookings.sort(
    (a, b) => new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time)
  );
  bookings.forEach((booking, idx) => {
    const card = document.createElement("div");
    card.className = "booking-card";
    card.innerHTML = `
            <strong>${booking.event}</strong><br>
            ${formatDate(booking.date)} at ${formatTime(booking.time)}<br>
            Booked by: ${booking.name} (${booking.email})<br>
            Reminder: ${
              booking.reminder === "1hour" ? "1 hour" : "1 day"
            } before<br>
            <div class="booking-actions">
              <button class="btn-edit" data-idx="${idx}">Edit</button>
              <button class="btn-delete" data-idx="${idx}">Delete</button>
            </div>
        `;
    calendar.appendChild(card);
  });
  // Attach event listeners for edit/delete
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.onclick = function () {
      startEditBooking(this.dataset.idx);
    };
  });
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.onclick = function () {
      deleteBooking(this.dataset.idx);
    };
  });
}

// Render a simple calendar grid for the current month
function renderCalendarGrid() {
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const bookings = getBookings();
  // Header
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const header = document.createElement("div");
  header.className = "calendar-grid";
  days.forEach((d) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.innerHTML = `<span class="cell-date"><b>${d}</b></span>`;
    header.appendChild(cell);
  });
  grid.appendChild(header);
  // Grid
  const gridDiv = document.createElement("div");
  gridDiv.className = "calendar-grid";
  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    gridDiv.appendChild(cell);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.innerHTML = `<span class="cell-date">${d}</span>`;
    // Show bookings for this day
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    bookings
      .filter((b) => b.date === dateStr)
      .forEach((b) => {
        const bDiv = document.createElement("span");
        bDiv.className = "cell-booking";
        bDiv.textContent = b.event;
        cell.appendChild(bDiv);
      });
    gridDiv.appendChild(cell);
  }
  grid.appendChild(gridDiv);
}

// Set up reminders for all future bookings
function setupReminders() {
  if (!("Notification" in window)) return;
  Notification.requestPermission();
  const bookings = getBookings();
  const now = new Date();
  bookings.forEach((booking) => {
    const eventDate = new Date(booking.date + "T" + booking.time);
    let reminderDate = new Date(eventDate);
    if (booking.reminder === "1hour") {
      reminderDate.setHours(reminderDate.getHours() - 1);
    } else {
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(9, 0, 0, 0);
    }
    if (reminderDate > now) {
      const timeout = reminderDate.getTime() - now.getTime();
      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("Event Reminder", {
            body: `Reminder: "${booking.event}" is coming up at ${formatTime(
              booking.time
            )}!`,
            icon: "",
          });
        } else {
          showToast(
            `Reminder: "${booking.event}" is coming up at ${formatTime(
              booking.time
            )}!`
          );
        }
      }, timeout);
    }
  });
}

// Edit mode state
let editIndex = null;

function startEditBooking(idx) {
  const bookings = getBookings();
  const booking = bookings[idx];
  document.getElementById("name").value = booking.name;
  document.getElementById("email").value = booking.email;
  document.getElementById("event").value = booking.event;
  document.getElementById("date").value = booking.date;
  document.getElementById("time").value = booking.time;
  document.getElementById("reminder").value = booking.reminder || "1day";
  editIndex = idx;
  document.querySelector("#bookingForm button[type='submit']").textContent =
    "Update Booking";
  document.getElementById("cancelEdit").style.display = "";
}

function deleteBooking(idx) {
  if (!confirm("Are you sure you want to delete this booking?")) return;
  const bookings = getBookings();
  bookings.splice(idx, 1);
  saveBookings(bookings);
  renderCalendar(getCurrentFilters());
  renderCalendarGrid();
  setupReminders();
  if (editIndex == idx) {
    document.getElementById("bookingForm").reset();
    document.querySelector("#bookingForm button[type='submit']").textContent =
      "Book Now";
    document.getElementById("cancelEdit").style.display = "none";
    editIndex = null;
  }
  showToast("Booking deleted.", "success");
}

document.getElementById("cancelEdit").addEventListener("click", function () {
  document.getElementById("bookingForm").reset();
  document.querySelector("#bookingForm button[type='submit']").textContent =
    "Book Now";
  this.style.display = "none";
  editIndex = null;
});

function validateForm(name, email, event, date, time) {
  if (!name || !email || !event || !date || !time) {
    showToast("Please fill in all fields.", "error");
    return false;
  }
  // Email validation
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailPattern.test(email)) {
    showToast("Please enter a valid email address.", "error");
    return false;
  }
  // Date/time validation
  const now = new Date();
  const bookingDate = new Date(date + "T" + time);
  if (bookingDate < now) {
    showToast("Cannot book for a past date/time.", "error");
    return false;
  }
  return true;
}

document.getElementById("bookingForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const event = document.getElementById("event").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const reminder = document.getElementById("reminder").value;
  if (!validateForm(name, email, event, date, time)) return;
  const bookings = getBookings();
  // Show loading spinner (simulate async)
  const submitBtn = this.querySelector("button[type='submit']");
  const origText = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
  submitBtn.disabled = true;
  setTimeout(() => {
    if (editIndex !== null) {
      bookings[editIndex] = { name, email, event, date, time, reminder };
      saveBookings(bookings);
      renderCalendar(getCurrentFilters());
      renderCalendarGrid();
      setupReminders();
      this.reset();
      submitBtn.textContent = "Book Now";
      document.getElementById("cancelEdit").style.display = "none";
      editIndex = null;
      showToast("Booking updated!", "success");
    } else {
      bookings.push({ name, email, event, date, time, reminder });
      saveBookings(bookings);
      renderCalendar(getCurrentFilters());
      renderCalendarGrid();
      setupReminders();
      this.reset();
      submitBtn.textContent = "Book Now";
      showToast("Booking successful!", "success");
    }
    submitBtn.disabled = false;
  }, 700);
});

// Filter/search
function getCurrentFilters() {
  return {
    search: document.getElementById("searchInput").value.trim(),
    date: document.getElementById("filterDate").value,
  };
}
document.getElementById("searchInput").addEventListener("input", function () {
  renderCalendar(getCurrentFilters());
});
document.getElementById("filterDate").addEventListener("change", function () {
  renderCalendar(getCurrentFilters());
});

document.getElementById("exportCSV").addEventListener("click", function () {
  const bookings = getBookings();
  if (!bookings.length) {
    showToast("No bookings to export.", "error");
    return;
  }
  const csvRows = ["Name,Email,Event,Date,Time,Reminder"];
  bookings.forEach((b) => {
    csvRows.push(
      `"${b.name}","${b.email}","${b.event}","${b.date}","${b.time}","${
        b.reminder === "1hour" ? "1 hour" : "1 day"
      }"`
    );
  });
  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bookings.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Exported bookings to CSV.", "success");
});

// --- COST CALCULATOR LOGIC ---

// Price table based on the provided image
const PRICE_TABLE = {
  Corporates: {
    Office: 18000,
    "Hot-Desk-Day": 600,
    "Hot-Desk-Month": 6000,
    "Board Room": 1800,
    "Meeting Room": 1000,
    Auditorium: 3500,
    "PC Labs": 1800,
    Makerspace: 1800,
    "Printing-BW": 2,
    "Printing-Colour": 6,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
  Industrialists: {
    Office: 17000,
    "Hot-Desk-Day": 600,
    "Hot-Desk-Month": 6000,
    "Board Room": 1700,
    "Meeting Room": 900,
    Auditorium: 3300,
    "PC Labs": 1700,
    Makerspace: 1700,
    "Printing-BW": 2,
    "Printing-Colour": 6,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
  Government: {
    Office: 16000,
    "Hot-Desk-Day": 500,
    "Hot-Desk-Month": 5000,
    "Board Room": 1600,
    "Meeting Room": 800,
    Auditorium: 3000,
    "PC Labs": 1600,
    Makerspace: 1600,
    "Printing-BW": 2,
    "Printing-Colour": 6,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
  Academia: {
    Office: 15000,
    "Hot-Desk-Day": 400,
    "Hot-Desk-Month": 4000,
    "Board Room": 1500,
    "Meeting Room": 700,
    Auditorium: 2500,
    "PC Labs": 1500,
    Makerspace: 1500,
    "Printing-BW": 2,
    "Printing-Colour": 6,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
  "NGOs/CBOs": {
    Office: 12000,
    "Hot-Desk-Day": 300,
    "Hot-Desk-Month": 3000,
    "Board Room": 1200,
    "Meeting Room": 600,
    Auditorium: 2000,
    "PC Labs": 1200,
    Makerspace: 1200,
    "Printing-BW": 2,
    "Printing-Colour": 6,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
  "General SMMEs": {
    Office: 8000,
    "Hot-Desk-Day": 200,
    "Hot-Desk-Month": 2000,
    "Board Room": 800,
    "Meeting Room": 400,
    Auditorium: 1500,
    "PC Labs": 800,
    Makerspace: 800,
    "Printing-BW": 2,
    "Printing-Colour": 6,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
  "Incubated SMMEs": {
    Office: 0,
    "Hot-Desk-Day": 0,
    "Hot-Desk-Month": 0,
    "Board Room": 0,
    "Meeting Room": 0,
    Auditorium: 0,
    "PC Labs": 0,
    Makerspace: 0,
    "Printing-BW": 1.5,
    "Printing-Colour": 3,
    Binding: 43,
    Laminating: 44,
    Scanning: 5,
  },
};

// Extra service prices
const EXTRAS = {
  Projector: 100,
  Catering: 50, // per person
  Internet: 30,
};

// Map facility to duration label
const DURATION_LABELS = {
  Office: "Months",
  "Hot-Desk-Day": "Days",
  "Hot-Desk-Month": "Months",
  "Board Room": "Hours",
  "Meeting Room": "Hours",
  Auditorium: "Hours",
  "PC Labs": "Hours",
  Makerspace: "Hours",
  "Printing-BW": "Pages",
  "Printing-Colour": "Pages",
  Binding: "Units",
  Laminating: "Units",
  Scanning: "Units",
};

function updateDurationLabel() {
  const facility = document.getElementById("facility").value;
  const label = DURATION_LABELS[facility] || "Duration/Quantity";
  document.getElementById("durationLabel").textContent = label;
}

document
  .getElementById("facility")
  .addEventListener("change", updateDurationLabel);

function updateCostCalculator(syncToBooking = true) {
  const category = document.getElementById("category").value;
  const facility = document.getElementById("facility").value;
  const duration = parseInt(document.getElementById("duration").value, 10) || 1;
  // Extras
  const projector = document.getElementById("extraProjector").checked;
  const catering = document.getElementById("extraCatering").checked;
  const cateringPeople = catering
    ? parseInt(document.getElementById("cateringPeople").value, 10) || 1
    : 0;
  const internet = document.getElementById("extraInternet").checked;
  let cost = 0,
    base = 0,
    extras = 0;
  let breakdown = "";
  if (category && facility && duration > 0) {
    const price = PRICE_TABLE[category] && PRICE_TABLE[category][facility];
    if (typeof price !== "undefined") {
      base = price * duration;
      breakdown += `Base: R${price.toFixed(2)} x ${duration} = R${base.toFixed(
        2
      )}<br>`;
    }
    if (projector) {
      extras += EXTRAS.Projector;
      breakdown += `Projector: R${EXTRAS.Projector.toFixed(2)}<br>`;
    }
    if (catering) {
      const catCost = EXTRAS.Catering * cateringPeople;
      extras += catCost;
      breakdown += `Catering: R${EXTRAS.Catering.toFixed(
        2
      )} x ${cateringPeople} = R${catCost.toFixed(2)}<br>`;
    }
    if (internet) {
      extras += EXTRAS.Internet;
      breakdown += `Internet: R${EXTRAS.Internet.toFixed(2)}<br>`;
    }
    cost = base + extras;
  }
  document.getElementById("costBreakdown").innerHTML =
    breakdown || '<span style="color:#888">No selection</span>';
  document.getElementById("costResult").textContent = "R" + cost.toFixed(2);
  // Show/hide catering people input
  document.getElementById("cateringPeople").style.display = catering
    ? ""
    : "none";
  // Sync to booking form if requested
  if (syncToBooking) {
    syncCalculatorToBookingForm();
  }
  // Show booking summary if all selected
  showBookingSummary(
    category,
    facility,
    duration,
    projector,
    catering,
    cateringPeople,
    internet,
    cost,
    breakdown
  );
  // Disable booking if cost is zero and not Incubated SMMEs
  const bookBtn = document.querySelector('#bookingForm button[type="submit"]');
  if (bookBtn) {
    if (cost === 0 && category !== "Incubated SMMEs") {
      bookBtn.disabled = true;
      bookBtn.title = "Please select valid options with a non-zero cost.";
    } else {
      bookBtn.disabled = false;
      bookBtn.title = "";
    }
  }
}

document.getElementById("category").addEventListener("change", function () {
  updateCostCalculator();
  syncBookingFormToCalculator();
});
document.getElementById("facility").addEventListener("change", function () {
  updateCostCalculator();
  syncBookingFormToCalculator();
});
document.getElementById("duration").addEventListener("input", function () {
  updateCostCalculator();
  syncBookingFormToCalculator();
});
document
  .getElementById("extraProjector")
  .addEventListener("change", updateCostCalculator);
document
  .getElementById("extraCatering")
  .addEventListener("change", updateCostCalculator);
document
  .getElementById("cateringPeople")
  .addEventListener("input", updateCostCalculator);
document
  .getElementById("extraInternet")
  .addEventListener("change", updateCostCalculator);

// Sync calculator to booking form
function syncCalculatorToBookingForm() {
  // Only update if booking form fields exist
  const cat = document.getElementById("category").value;
  const fac = document.getElementById("facility").value;
  const dur = document.getElementById("duration").value;
  if (cat) document.getElementById("category").value = cat;
  if (fac) document.getElementById("event").value = fac;
  if (dur) document.getElementById("event").setAttribute("data-duration", dur);
}
// Sync booking form to calculator
function syncBookingFormToCalculator() {
  const cat = document.getElementById("category").value;
  const fac = document.getElementById("event").value;
  const dur =
    document.getElementById("event").getAttribute("data-duration") || 1;
  if (cat) document.getElementById("category").value = cat;
  if (fac) document.getElementById("facility").value = fac;
  if (dur) document.getElementById("duration").value = dur;
  updateCostCalculator(false);
}

// Show booking summary
function showBookingSummary(
  category,
  facility,
  duration,
  projector,
  catering,
  cateringPeople,
  internet,
  cost,
  breakdown
) {
  const summary = document.getElementById("bookingSummary");
  if (category && facility && duration > 0) {
    summary.style.display = "";
    summary.innerHTML = `<strong>Booking Summary:</strong><br>
            Category: ${category}<br>
            Facility: ${facility}<br>
            Duration: ${duration} ${DURATION_LABELS[facility] || ""}<br>
            ${projector ? "Projector: Yes<br>" : ""}
            ${catering ? `Catering: Yes (${cateringPeople} people)<br>` : ""}
            ${internet ? "Internet: Yes<br>" : ""}
            <div style='margin-top:6px;'>${breakdown}</div>
            <strong>Total Cost: R${cost.toFixed(2)}</strong>`;
  } else {
    summary.style.display = "none";
    summary.innerHTML = "";
  }
}

// On booking form submit, validate cost and show summary
const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
  bookingForm.addEventListener(
    "submit",
    function (e) {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const event = document.getElementById("event").value.trim();
      const date = document.getElementById("date").value;
      const time = document.getElementById("time").value;
      const reminder = document.getElementById("reminder").value;
      if (!validateForm(name, email, event, date, time)) return;
      const bookings = getBookings();
      // Show loading spinner (simulate async)
      const submitBtn = this.querySelector("button[type='submit']");
      const origText = submitBtn.textContent;
      submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
      submitBtn.disabled = true;
      setTimeout(() => {
        if (editIndex !== null) {
          bookings[editIndex] = { name, email, event, date, time, reminder };
          saveBookings(bookings);
          renderCalendar(getCurrentFilters());
          renderCalendarGrid();
          setupReminders();
          this.reset();
          submitBtn.textContent = "Book Now";
          document.getElementById("cancelEdit").style.display = "none";
          editIndex = null;
          showToast("Booking updated!", "success");
        } else {
          bookings.push({ name, email, event, date, time, reminder });
          saveBookings(bookings);
          renderCalendar(getCurrentFilters());
          renderCalendarGrid();
          setupReminders();
          this.reset();
          submitBtn.textContent = "Book Now";
          showToast("Booking successful!", "success");
        }
        submitBtn.disabled = false;
      }, 700);
      // Validate cost
      updateCostCalculator(false);
      const costText = document.getElementById("costResult").textContent;
      const summary = document.getElementById("bookingSummary").innerHTML;
      showToast(
        "Booking confirmed!<br>" + summary + "<br>Cost: " + costText,
        "success"
      );
    },
    true
  );
}

// Initial render
renderCalendar();
renderCalendarGrid();
setupReminders();
updateDurationLabel();
updateCostCalculator();

// Accessibility: focus toast on show
const toastContainer = document.getElementById("toastContainer");
const observer = new MutationObserver(() => {
  if (toastContainer.firstChild)
    toastContainer.firstChild.focus && toastContainer.firstChild.focus();
});
observer.observe(toastContainer, { childList: true });

// Spinner style
const style = document.createElement("style");
style.innerHTML = `.spinner { display: inline-block; width: 18px; height: 18px; border: 3px solid #fff; border-top: 3px solid #005c1a; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
document.head.appendChild(style);

// For future: backend/auth integration can be added here
