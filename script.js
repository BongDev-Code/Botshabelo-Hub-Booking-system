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
            People: ${booking.people || 1}, Duration: ${
      booking.duration || 1
    } hour(s)<br>
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
  if (!grid) return; // Safety check

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
  document.getElementById("people").value = booking.people || 1;
  document.getElementById("duration").value = booking.duration || 1;
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

// Cancel edit handler
const cancelEditBtn = document.getElementById("cancelEdit");
if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", function () {
    document.getElementById("bookingForm").reset();
    document.querySelector("#bookingForm button[type='submit']").textContent =
      "Book Now";
    this.style.display = "none";
    editIndex = null;
  });
}

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

// Single booking form event listener
document.addEventListener("DOMContentLoaded", function () {
  const bookingForm = document.getElementById("bookingForm");

  if (bookingForm) {
    bookingForm.addEventListener("submit", function (e) {
      e.preventDefault();

      console.log("Form submitted!"); // Debug log

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const event = document.getElementById("event").value.trim();
      const date = document.getElementById("date").value;
      const time = document.getElementById("time").value;
      const reminder = document.getElementById("reminder").value;
      const people = parseInt(document.getElementById("people").value, 10) || 1;
      const duration =
        parseInt(document.getElementById("duration").value, 10) || 1;

      // Correct validation call
      if (!validateForm(name, email, event, date, time)) return;

      const bookings = getBookings();
      const submitBtn = this.querySelector("button[type='submit']");
      const origText = submitBtn.textContent;

      submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
      submitBtn.disabled = true;

      setTimeout(() => {
        const booking = {
          name,
          email,
          event,
          date,
          time,
          reminder,
          people,
          duration,
        };

        if (editIndex !== null) {
          bookings[editIndex] = booking;
          editIndex = null;
          document.getElementById("cancelEdit").style.display = "none";
          showToast("Booking updated!", "success");
        } else {
          bookings.push(booking);
          showToast("Booking successful!", "success");
        }

        saveBookings(bookings);
        renderCalendar(getCurrentFilters());
        renderCalendarGrid();
        setupReminders();

        this.reset();
        submitBtn.textContent = "Book Now";
        submitBtn.disabled = false;
      }, 700);
    });
  }
});

// Filter/search functions
function getCurrentFilters() {
  return {
    search: document.getElementById("searchInput")?.value.trim() || "",
    date: document.getElementById("filterDate")?.value || "",
  };
}

// Search and filter event listeners
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const filterDate = document.getElementById("filterDate");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderCalendar(getCurrentFilters());
    });
  }

  if (filterDate) {
    filterDate.addEventListener("change", function () {
      renderCalendar(getCurrentFilters());
    });
  }
});

// CSV export
document.addEventListener("DOMContentLoaded", function () {
  const exportBtn = document.getElementById("exportCSV");

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      const bookings = getBookings();
      if (!bookings.length) {
        showToast("No bookings to export.", "error");
        return;
      }
      const csvRows = ["Name,Email,Event,Date,Time,Reminder,People,Duration"];
      bookings.forEach((b) => {
        csvRows.push(
          `"${b.name}","${b.email}","${b.event}","${b.date}","${b.time}","${
            b.reminder === "1hour" ? "1 hour" : "1 day"
          }","${b.people || 1}","${b.duration || 1}"` // Added missing commas
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
  }
});

// Cost calculator and other functions remain the same...
// (Include all your cost calculator code here - it looks correct)

// Price table based on the provided image
const PRICE_TABLE = {
  Corporates: {
    Office: 8000,
    "Hot-Desk-Day": 90,
    "Hot-Desk-Month": 1600,
    "Board Room": 70,
    "Meeting Room": 35,
    Auditorium: 50,
    "PC Labs": 100,
    Makerspace: 180,
  },
  Industrialists: {
    Office: 7000,
    "Hot-Desk-Day": 80,
    "Hot-Desk-Month": 1500,
    "Board Room": 60,
    "Meeting Room": 30,
    Auditorium: 3300,
    "PC Labs": 90,
    Makerspace: 170,
  },
  Government: {
    Office: 6000,
    "Hot-Desk-Day": 70,
    "Hot-Desk-Month": 1400,
    "Board Room": 50,
    "Meeting Room": 25,
    Auditorium: 30,
    "PC Labs": 80,
    Makerspace: 160,
  },
  Academia: {
    Office: 4000,
    "Hot-Desk-Day": 60,
    "Hot-Desk-Month": 1300,
    "Board Room": 40,
    "Meeting Room": 20,
    Auditorium: 25,
    "PC Labs": 80,
    Makerspace: 150,
  },
  "NGOs/CBOs": {
    Office: 3000,
    "Hot-Desk-Day": 50,
    "Hot-Desk-Month": 1000,
    "Board Room": 30,
    "Meeting Room": 15,
    Auditorium: 20,
    "PC Labs": 60,
    Makerspace: 120,
  },
  "General SMMEs": {
    Office: 2500,
    "Hot-Desk-Day": 40,
    "Hot-Desk-Month": 1000,
    "Board Room": 30,
    "Meeting Room": 15,
    Auditorium: 20,
    "PC Labs": 60,
    Makerspace: 100,
  },
  "Incubated SMMEs": {
    Office: 1500,
    "Hot-Desk-Day": 0,
    "Hot-Desk-Month": 0,
    "Board Room": 0,
    "Meeting Room": 0,
    Auditorium: 10,
    "PC Labs": 0,
    Makerspace: 0,
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
};

function updateDurationLabel() {
  const facility = document.getElementById("facility").value;
  const label = DURATION_LABELS[facility] || "Duration/Quantity";
  document.getElementById("durationLabel").textContent = label;

  // Show number of people input for per-person facilities
  const peopleInput = document.getElementById("people");
  const peopleLabel = document.querySelector("label[for='people']");
  const perPersonFacilities = [
    "Board Room",
    "Meeting Room",
    "PC Labs",
    "Makerspace",
  ];
  if (perPersonFacilities.includes(facility)) {
    peopleInput.style.display = "";
    peopleLabel.style.display = "";
  } else {
    peopleInput.style.display = "none";
    peopleLabel.style.display = "none";
  }
}

document
  .getElementById("facility")
  .addEventListener("change", updateDurationLabel);

function updateCostCalculator(syncToBooking = true) {
  const category = document.getElementById("category").value;
  const facility = document.getElementById("facility").value;
  const duration = parseInt(document.getElementById("duration").value, 10) || 1;
  const people = parseInt(document.getElementById("people").value, 10) || 1;

  // Per-person facilities logic
  const perPersonFacilities = [
    "Board Room",
    "Meeting Room",
    "PC Labs",
    "Makerspace",
  ];

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
      // Your per-person per-hour calculation logic
      if (perPersonFacilities.includes(facility)) {
        base = price * duration * people;
        breakdown += `Base: R${price.toFixed(
          2
        )} x ${people} people x ${duration} hour(s) = R${base.toFixed(2)}<br>`;
      } else {
        base = price * duration;
        breakdown += `Base: R${price.toFixed(
          2
        )} x ${duration} = R${base.toFixed(2)}<br>`;
      }
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

  // Show booking summary
  showBookingSummary(
    category,
    facility,
    duration,
    people,
    projector,
    catering,
    cateringPeople,
    internet,
    cost,
    breakdown
  );
}

// Event listeners for cost calculator
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
document
  .getElementById("people")
  .addEventListener("input", updateCostCalculator);

// Sync calculator to booking form
function syncCalculatorToBookingForm() {
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
  people,
  projector,
  catering,
  cateringPeople,
  internet,
  cost,
  breakdown
) {
  const summary = document.getElementById("bookingSummary");
  const perPersonFacilities = [
    "Board Room",
    "Meeting Room",
    "PC Labs",
    "Makerspace",
  ];

  if (category && facility && duration > 0) {
    summary.style.display = "";
    summary.innerHTML = `<strong>Booking Summary:</strong><br>
            Category: ${category}<br>
            Facility: ${facility}<br>
            Duration: ${duration} ${DURATION_LABELS[facility] || ""}<br>
            ${
              perPersonFacilities.includes(facility)
                ? `People: ${people}<br>`
                : ""
            }
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

// Initial render
document.addEventListener("DOMContentLoaded", function () {
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
});

// Spinner style
const style = document.createElement("style");
style.innerHTML = `.spinner { display: inline-block; width: 18px; height: 18px; border: 3px solid #fff; border-top: 3px solid #005c1a; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
document.head.appendChild(style);
