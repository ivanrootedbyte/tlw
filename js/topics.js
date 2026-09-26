import { loadJson } from "./data-loader.js";
import { setCustomQuestion, setSelectedTopic } from "./storage.js";

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
const customQuestion = document.getElementById("customQuestion");
const categoryIntro = document.getElementById("categoryIntro");
const topicCount = document.getElementById("topicCount");

const state = { topics: [], categories: [], activeCategory: null, selectedTopic: null, query: "" };

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
  previewSummary.textContent = `${topic.summary} Professor L will use this as the context for your own question, then challenge your reasoning in a live conversation while the audience listens in.`;
  previewArt.textContent = categoryCode(topic.categoryLabel);
  previewPlayBtn.disabled = !String(customQuestion?.value || "").trim();
  document.querySelectorAll(".topic-row").forEach((row) => {
    row.classList.toggle("selected", row.dataset.topicId === topic.id);
  });
}

function play(topic) {
  const question = String(customQuestion?.value || "").trim();
  if (!question) {
    customQuestion?.focus();
    customQuestion?.classList.add("needs-question");
    return;
  }
  setSelectedTopic(topic.id);
  setCustomQuestion(question);
  location.href = "arena.html";
}

function renderCategories() {
  const tabs = [...state.categories, { id: "all", label: "Explore all", description: "Browse every starting question across the library." }];
  categoryTabs.innerHTML = "";
  tabs.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-tab ${state.activeCategory === category.id ? "active" : ""}`;
    const count = category.id === "all" ? state.topics.length : state.topics.filter((topic) => topic.category === category.id).length;
    button.innerHTML = `<span>${category.label}</span><small>${count}</small>`;
    button.addEventListener("click", () => {
      state.activeCategory = category.id;
      state.selectedTopic = null;
      previewPlayBtn.disabled = true;
      renderCategories();
      renderTopics();
      updateCategoryContext();
    });
    categoryTabs.appendChild(button);
  });
}

function updateCategoryContext() {
  const category = state.activeCategory === "all"
    ? { label: "Explore all", description: "Browse every starting question across the library." }
    : state.categories.find((item) => item.id === state.activeCategory);
  if (categoryIntro) categoryIntro.textContent = category?.description || "Choose a starting point, then write the question you actually want Professor L to engage.";
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
        <small>${topic.focus || "Clarity question"}</small>
      </span>
      <span class="topic-arrow">›</span>
    `;
    row.addEventListener("click", () => selectTopic(topic));
    row.addEventListener("dblclick", () => play(topic));
    topicGrid.appendChild(row);
  });
  if (topicCount) topicCount.textContent = `${topics.length} starting ${topics.length === 1 ? "question" : "questions"}`;
  if (!topics.length) {
    topicGrid.innerHTML = `<div class="history-item"><strong>No questions found.</strong><p class="small">Try a broader search.</p></div>`;
  }
  if (!state.selectedTopic && topics[0]) selectTopic(topics[0]);
}

async function init() {
  const topicData = await loadJson("data/topics.json");
  state.topics = topicData.topics;
  state.categories = topicData.categories || [];
  state.activeCategory = state.categories[0]?.id || "all";

  const dailyTopic = state.topics[getDailyIndex(state.topics.length)];
  dailyTitle.textContent = dailyTopic.title;
  dailySummary.textContent = `${dailyTopic.categoryLabel} · ${dailyTopic.focus || "A focused question for a live Socratic conversation."}`;
  playDailyBtn.addEventListener("click", () => { selectTopic(dailyTopic); customQuestion?.focus(); });
  previewPlayBtn.addEventListener("click", () => state.selectedTopic && play(state.selectedTopic));
  customQuestion?.addEventListener("input", () => {
    customQuestion.classList.remove("needs-question");
    previewPlayBtn.disabled = !state.selectedTopic || !customQuestion.value.trim();
  });
  topicSearch.addEventListener("input", () => {
    state.query = topicSearch.value;
    state.selectedTopic = null;
    previewPlayBtn.disabled = true;
    renderTopics();
  });
  renderCategories();
  updateCategoryContext();
  renderTopics();
}

init().catch((err) => {
  topicGrid.textContent = err.message;
});
