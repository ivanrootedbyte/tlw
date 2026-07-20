import { loadJson } from "./data-loader.js";
import { getSelectedPersona, isSafeMode, setSafeMode, setSelectedPersona } from "./storage.js";
import { resolvePersonaName } from "./persona-resolver.js";

const grid = document.getElementById("personaGrid");
const safeModeBtn = document.getElementById("safeModeBtn");
const safeStatus = document.getElementById("safeStatus");

function renderStats(stats) {
  return Object.entries(stats).map(([label, value]) => `
    <div class="statline">
      <span>${label}</span>
      <div class="bar"><span style="width:${value}%"></span></div>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function updateSafeStatus() {
  safeStatus.textContent = isSafeMode()
    ? "Safe Mode is on. Public-friendly persona names are active."
    : "Prototype Mode is on. Satirical display names are active.";
}

async function init() {
  const { personas } = await loadJson("data/personas.json");
  const selected = getSelectedPersona();
  grid.innerHTML = "";
  personas.forEach((persona) => {
    const card = document.createElement("article");
    card.className = `persona-card theme-${persona.theme}`;
    card.innerHTML = `
      <div class="persona-head">
        <div class="portrait-wrap"><img src="${persona.portrait}" alt="${resolvePersonaName(persona)} portrait" /></div>
        <div>
          <div class="badge">${persona.weakness}</div>
          <h3 style="margin-top:10px">${resolvePersonaName(persona)}</h3>
          <p>${persona.tagline}</p>
        </div>
      </div>
      <p>${persona.intro}</p>
      <div class="persona-stats">${renderStats(persona.stats)}</div>
      <button class="btn ${selected === persona.id ? "primary" : "secondary"}" type="button">${selected === persona.id ? "Selected" : "Select Persona"}</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      setSelectedPersona(persona.id);
      location.href = "topics.html";
    });
    grid.appendChild(card);
  });
  updateSafeStatus();
}

safeModeBtn?.addEventListener("click", () => {
  setSafeMode(!isSafeMode());
  location.reload();
});

init().catch((err) => {
  safeStatus.textContent = err.message;
});
