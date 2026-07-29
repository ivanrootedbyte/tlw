import { loadJson } from "./data-loader.js";
import { setSelectedTopic } from "./storage.js";

const topicGrid = document.getElementById("topicGrid");
const dailyTitle = document.getElementById("dailyTitle");
const dailySummary = document.getElementById("dailySummary");
const playDailyBtn = document.getElementById("playDailyBtn");
const categoryTabs = document.getElementById("categoryTabs");
const topicSearch = document.getElementById("topicSearch");
const previewTitle = document.getElementById("previewTitle");
const previewSummary = document.getElementById("previewSummary");
const previewPlayBtn = document.getElementById("previewPlayBtn");
const previewArt = document.querySelector(".preview-art");

const state = { topics: [], categories: [], activeCategory: "all", selectedTopic: null, query: "" };

function getDailyIndex(length) {
  const today = new Date();
  const seed = Number(`${today.getUTCFullYear()}${today.getUTCMonth() + 1}${today.getUTCDate()}`);
  return seed % length;
}

function categoryCode(label = "") {
  return label.split(/[ +]/).filter(Boolean).map((part) => part[0]).join("").slice(0, 4).toUpperCase() || "TLW";
}

function selectTopic(topic) {
  state.selectedTopic = topic;
  previewTitle.textContent = topic.title;
  previewSummary.textContent = `${topic.summary} Professor L will ask 5 rounds and score your answers with stars.`;
  previewArt.textContent = categoryCode(topic.categoryLabel);
  previewPlayBtn.disabled = false;
  document.querySelectorAll(".topic-row").forEach((row) => {
    row.classList.toggle("selected", row.dataset.topicId === topic.id);
  });
}

function play(topic) {
  setSelectedTopic(topic.id);
  location.href = "arena.html";
}

function renderCategories() {
  const tabs = [{ id: "all", label: "All" }, ...state.categories];
  categoryTabs.innerHTML = "";
  tabs.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-tab ${state.activeCategory === category.id ? "active" : ""}`;
    button.textContent = category.label;
    button.addEventListener("click", () => {
      state.activeCategory = category.id;
      state.selectedTopic = null;
      previewPlayBtn.disabled = true;
      renderCategories();
      renderTopics();
    });
    categoryTabs.appendChild(button);
  });
}

function filteredTopics() {
  return state.topics.filter((topic) => {
    const categoryMatch = state.activeCategory === "all" || topic.category === state.activeCategory;
    const q = state.query.trim().toLowerCase();
    const textMatch = !q || `${topic.title} ${topic.summary} ${topic.categoryLabel}`.toLowerCase().includes(q);
    return categoryMatch && textMatch;
  });
}

function renderTopics() {
  const topics = filteredTopics();
  topicGrid.innerHTML = "";
  topics.forEach((topic, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "topic-row";
    row.dataset.topicId = topic.id;
    row.innerHTML = `
      <span class="topic-number">${index + 1}</span>
      <span class="topic-row-copy">
        <strong>${topic.title}</strong>
        <small>${topic.categoryLabel} · ${topic.difficulty} · 10-star trial</small>
      </span>
      <span class="topic-arrow">›</span>
    `;
    row.addEventListener("click", () => selectTopic(topic));
    row.addEventListener("dblclick", () => play(topic));
    topicGrid.appendChild(row);
  });
  if (!topics.length) {
    topicGrid.innerHTML = `<div class="history-item"><strong>No questions found.</strong><p class="small">Try a broader search.</p></div>`;
  }
  if (!state.selectedTopic && topics[0]) selectTopic(topics[0]);
}

async function init() {
  const topicData = await loadJson("data/topics.json");
  state.topics = topicData.topics;
  state.categories = topicData.categories || [];

  const dailyTopic = state.topics[getDailyIndex(state.topics.length)];
  dailyTitle.textContent = dailyTopic.title;
  dailySummary.textContent = `${dailyTopic.categoryLabel} · Can you reach 10 stars today?`;
  playDailyBtn.addEventListener("click", () => play(dailyTopic));
  previewPlayBtn.addEventListener("click", () => state.selectedTopic && play(state.selectedTopic));
  topicSearch.addEventListener("input", () => {
    state.query = topicSearch.value;
    state.selectedTopic = null;
    previewPlayBtn.disabled = true;
    renderTopics();
  });
  renderCategories();
  renderTopics();
}

init().catch((err) => {
  topicGrid.textContent = err.message;
});
