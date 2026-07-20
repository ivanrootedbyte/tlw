import { loadJson } from "./data-loader.js";
import { getSelectedPersona, setSelectedTopic } from "./storage.js";
import { resolvePersonaName } from "./persona-resolver.js";

const selectedPersonaBox = document.getElementById("selectedPersonaBox");
const topicGrid = document.getElementById("topicGrid");
const dailyTitle = document.getElementById("dailyTitle");
const dailySummary = document.getElementById("dailySummary");
const playDailyBtn = document.getElementById("playDailyBtn");

function getDailyIndex(length) {
  const today = new Date();
  const seed = Number(`${today.getUTCFullYear()}${today.getUTCMonth() + 1}${today.getUTCDate()}`);
  return seed % length;
}

async function init() {
  const personaId = getSelectedPersona();
  const [{ personas }, { topics }] = await Promise.all([
    loadJson("data/personas.json"),
    loadJson("data/topics.json")
  ]);
  const persona = personas.find((p) => p.id === personaId) || personas[0];

  selectedPersonaBox.innerHTML = `
    <article class="persona-card theme-${persona.theme}">
      <div class="persona-head">
        <div class="portrait-wrap"><img src="${persona.portrait}" alt="${resolvePersonaName(persona)} portrait" /></div>
        <div>
          <h3>${resolvePersonaName(persona)}</h3>
          <p>${persona.tagline}</p>
        </div>
      </div>
      <p>${persona.intro}</p>
    </article>
  `;

  topicGrid.innerHTML = "";
  topics.forEach((topic) => {
    const card = document.createElement("article");
    card.className = "topic-card";
    card.innerHTML = `
      <div class="badge difficulty">${topic.difficulty}</div>
      <h3>${topic.title}</h3>
      <p>${topic.summary}</p>
      <p class="small"><strong>Scene:</strong> ${topic.scene}</p>
      <p class="small">${topic.hook}</p>
      <button class="btn primary" type="button">Enter Arena</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      setSelectedTopic(topic.id);
      location.href = "arena.html";
    });
    topicGrid.appendChild(card);
  });

  const dailyTopic = topics[getDailyIndex(topics.length)];
  dailyTitle.textContent = dailyTopic.title;
  dailySummary.textContent = `${dailyTopic.summary} Scene: ${dailyTopic.scene}.`;
  playDailyBtn.addEventListener("click", () => {
    setSelectedTopic(dailyTopic.id);
    location.href = "arena.html";
  });
}

init().catch((err) => {
  selectedPersonaBox.textContent = err.message;
});
