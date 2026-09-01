// Public frontend: no secret number or reward code belongs here.
const API_URL = "https://quest-backend-ubu1.onrender.com/";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const form = document.getElementById("guessForm");
const input = document.getElementById("guess");
const button = document.getElementById("guessButton");
const message = document.getElementById("message");
const remaining = document.getElementById("remaining");
const timer = document.getElementById("timer");
const win = document.getElementById("win");
const reward = document.getElementById("reward");
const copy = document.getElementById("copy");

let resetSeconds = 0;

setTimeout(async () => {
  loader.classList.add("hidden");
  app.classList.remove("hidden");
  await refreshStatus();
}, 1400);

async function refreshStatus() {
  try {
    const res = await fetch(`${API_URL}/api/status`, { cache: "no-store" });
    const data = await res.json();
    remaining.textContent = data.remaining;
    resetSeconds = data.seconds;
    updateControls();
  } catch {
    message.textContent = "Could not connect to the challenge server.";
  }
}

function updateControls() {
  const locked = Number(remaining.textContent) === 0 && resetSeconds > 0;
  button.disabled = locked;
  input.disabled = locked;
  timer.textContent = locked ? formatTime(resetSeconds) : "READY";
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

setInterval(() => {
  if (resetSeconds > 0) {
    resetSeconds--;
    timer.textContent = formatTime(resetSeconds);
    if (resetSeconds === 0) refreshStatus();
  }
}, 1000);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (button.disabled) return;

  button.disabled = true;
  input.disabled = true;
  message.textContent = "Checking your guess...";

  try {
    const res = await fetch(`${API_URL}/api/guess`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ guess: Number(input.value) })
    });

    const data = await res.json();

    if (typeof data.remaining === "number")
      remaining.textContent = data.remaining;

    if (data.correct) {
      message.textContent = "";
      reward.textContent = data.rewardCode;
      win.classList.remove("hidden");
      form.classList.add("hidden");
      return;
    }

    if (data.limited) {
      resetSeconds = data.seconds;
      message.textContent = `No more guesses. Come back in ${formatTime(resetSeconds)}.`;
    } else {
      message.textContent = data.message || "Wrong guess.";
      input.value = "";
      input.disabled = false;
      button.disabled = false;
      input.focus();
    }

    updateControls();
  } catch {
    message.textContent = "Server error. Try again.";
    input.disabled = false;
    button.disabled = false;
  }
});

copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reward.textContent);
    copy.textContent = "COPIED!";
    setTimeout(() => copy.textContent = "COPY REWARD CODE", 1600);
  } catch {
    message.textContent = "Copy failed. Copy the code manually.";
  }
});
