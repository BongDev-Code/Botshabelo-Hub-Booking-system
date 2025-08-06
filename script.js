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

// Initial render
renderCalendar();
renderCalendarGrid();
setupReminders();

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
