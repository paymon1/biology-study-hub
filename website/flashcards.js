(() => {
  "use strict";
  const STORAGE_KEY = "zisty ar:saved-flashcards:v1".replace(" ", "");
  const REVIEW_PATH = "/biology-study-hub/07-revision/saved-flashcards/";
  const readSaved = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch (_) { return {}; }
  };
  const writeSaved = (items) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch (_) { /* Storage may be unavailable in private browsing. */ }
  };
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function initFlashcards() {
    const cards = Array.from(document.querySelectorAll("details.flashcard"));
    if (!cards.length) return;

    const toolbar = make("div", "zy-flashcard-toolbar");
    const count = make("span", "zy-flashcard-count");
    const filter = make("button", "zy-flashcard-filter", "فقط کارت‌های نشان‌دار");
    filter.type = "button";
    filter.setAttribute("aria-pressed", "false");
    const reviewLink = make("a", "zy-flashcard-review-link", "دیدن همهٔ کارت‌های نشان‌دار");
    reviewLink.href = REVIEW_PATH;
    toolbar.append(count, filter, reviewLink);
    cards[0].parentNode.insertBefore(toolbar, cards[0]);

    let showSavedOnly = false;
    const update = () => {
      const saved = readSaved();
      const pageSaved = cards.filter(card => saved[card.dataset.saveKey]);
      count.textContent = pageSaved.length + " از " + cards.length + " کارت برای مرور نشان شده";
      filter.setAttribute("aria-pressed", String(showSavedOnly));
      filter.classList.toggle("is-active", showSavedOnly);
      cards.forEach(card => {
        card.hidden = showSavedOnly && !saved[card.dataset.saveKey];
        const button = card.querySelector(".zy-card-save");
        const isSaved = Boolean(saved[card.dataset.saveKey]);
        button.textContent = isSaved ? "★ نشان‌دار برای مرور" : "☆ نگه‌داشتن برای مرور";
        button.setAttribute("aria-pressed", String(isSaved));
        button.classList.toggle("is-saved", isSaved);
      });
    };

    cards.forEach((card, index) => {
      const question = card.querySelector("summary")?.innerText.trim() || ("کارت " + (index + 1));
      const answerNode = Array.from(card.children).find(node => node.tagName === "P");
      const answer = answerNode?.innerText.trim() || "";
      const cardId = "zy-flashcard-" + String(index + 1).padStart(2, "0");
      card.id = cardId;
      card.dataset.saveKey = location.pathname + "#" + cardId;
      const button = make("button", "zy-card-save");
      button.type = "button";
      button.addEventListener("click", () => {
        const saved = readSaved();
        const key = card.dataset.saveKey;
        if (saved[key]) delete saved[key];
        else saved[key] = {
          question,
          answer,
          url: location.pathname + "#" + cardId,
          chapter: document.querySelector("h1")?.innerText || "فلش‌کارت"
        };
        writeSaved(saved);
        update();
      });
      card.appendChild(button);
    });

    filter.addEventListener("click", () => {
      showSavedOnly = !showSavedOnly;
      update();
    });
    update();
  }

  function initReviewPage() {
    const root = document.getElementById("zy-saved-review");
    if (!root) return;
    const render = () => {
      root.replaceChildren();
      const saved = readSaved();
      const entries = Object.entries(saved);
      const heading = make("p", "zy-review-count", entries.length
        ? entries.length + " کارت برای مرور ذخیره کرده‌ای."
        : "هنوز کارتی برای مرور نشان نکرده‌ای.");
      root.appendChild(heading);
      if (!entries.length) {
        const hint = make("p", "zy-review-empty", "به صفحهٔ فلش‌کارت هر فصل برو و دکمهٔ «نگه‌داشتن برای مرور» را بزن.");
        root.appendChild(hint);
        return;
      }
      entries.forEach(([key, item]) => {
        const article = make("article", "zy-review-card");
        const title = make("h3", "", item.question || "فلش‌کارت");
        const answer = make("p", "zy-review-answer", item.answer || "");
        const chapter = make("p", "zy-review-chapter", item.chapter || "");
        const actions = make("div", "zy-review-actions");
        const link = make("a", "", "رفتن به کارت");
        link.href = item.url || key;
        const remove = make("button", "zy-card-remove", "حذف از مرور");
        remove.type = "button";
        remove.addEventListener("click", () => {
          const current = readSaved();
          delete current[key];
          writeSaved(current);
          render();
        });
        actions.append(link, remove);
        article.append(title, chapter, answer, actions);
        root.appendChild(article);
      });
    };
    render();
  }

  const start = () => { initFlashcards(); initReviewPage(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
