(() => {
  "use strict";
  const STORAGE_KEY = "biology-study-hub:saved-flashcards:v1";
  const BASE_PATH = location.hostname === "localhost" ? "/" : "/biology-study-hub/";
  const REVIEW_PATH = BASE_PATH + "07-revision/saved-flashcards/";
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
      const answer = Array.from(card.querySelectorAll("p"))
        .map(node => node.innerText.trim())
        .filter(Boolean)
        .join("\n\n") || Array.from(card.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .filter(Boolean).join("\n\n");
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
    let currentIndex = 0;
    let answerVisible = false;
    const hydrationStarted = new Set();

    const render = () => {
      root.replaceChildren();
      const entries = Object.entries(readSaved());
      const heading = make("p", "zy-review-count", entries.length
        ? entries.length + " کارت برای مرور ذخیره کرده‌ای."
        : "هنوز کارتی برای مرور نشان نکرده‌ای.");
      root.appendChild(heading);
      if (!entries.length) {
        root.appendChild(make("p", "zy-review-empty", "به صفحهٔ فلش‌کارت هر فصل برو و دکمهٔ «نگه‌داشتن برای مرور» را بزن."));
        return;
      }

      currentIndex = Math.min(Math.max(currentIndex, 0), entries.length - 1);
      const [key, item] = entries[currentIndex];
      // Repair older saved entries whose answer was not captured by the earlier script.
      if (!item.answer && item.url && !hydrationStarted.has(key)) {
        hydrationStarted.add(key);
        const pageUrl = item.url.split("#")[0];
        const cardId = item.url.split("#")[1];
        fetch(pageUrl)
          .then(response => response.ok ? response.text() : Promise.reject())
          .then(html => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            // Card IDs are assigned by JavaScript after page load, so they
            // are not present in fetched source HTML. Resolve the card by its
            // stable sequence number instead.
            const match = /^zy-flashcard-(\\d+)$/.exec(cardId || "");
            const cardIndex = match ? Number(match[1]) - 1 : -1;
            const sourceCard = doc.querySelectorAll("details.flashcard")[cardIndex];
            if (!sourceCard) return;
            const answerParts = Array.from(sourceCard.children)
              .filter(node => node.tagName !== "SUMMARY" && !node.matches(".zy-card-save"))
              .map(node => node.innerText || node.textContent || "")
              .map(value => value.trim()).filter(Boolean);
            const recovered = answerParts.join("\\n\\n");
            if (!recovered) return;
            const latest = readSaved();
            if (latest[key] && !latest[key].answer) {
              latest[key].answer = recovered;
              writeSaved(latest);
              if (currentIndex < Object.keys(latest).length) render();
            }
          })
          .catch(() => {});
      }
      const progress = make("p", "zy-review-progress", "کارت " + (currentIndex + 1) + " از " + entries.length);
      const article = make("article", "zy-review-card zy-review-current");
      const chapter = make("p", "zy-review-chapter", item.chapter || "");
      const title = make("h3", "zy-review-question", item.question || "فلش‌کارت");
      const answer = make("p", "zy-review-answer", item.answer || "");
      answer.hidden = !answerVisible;
      const reveal = make("button", "zy-review-reveal", answerVisible ? "پنهان‌کردن پاسخ" : "نمایش پاسخ");
      reveal.type = "button";
      reveal.setAttribute("aria-expanded", String(answerVisible));
      reveal.addEventListener("click", () => { answerVisible = !answerVisible; render(); });

      const actions = make("div", "zy-review-actions");
      const previous = make("button", "zy-review-nav", "کارت قبلی");
      previous.type = "button";
      previous.disabled = currentIndex === 0;
      previous.addEventListener("click", () => { currentIndex--; answerVisible = false; render(); });
      const next = make("button", "zy-review-nav", "کارت بعدی");
      next.type = "button";
      next.disabled = currentIndex === entries.length - 1;
      next.addEventListener("click", () => { currentIndex++; answerVisible = false; render(); });
      const link = make("a", "", "رفتن به صفحهٔ اصلی کارت");
      link.href = item.url || key;
      const remove = make("button", "zy-card-remove", "حذف از مرور");
      remove.type = "button";
      remove.addEventListener("click", () => {
        const current = readSaved();
        delete current[key];
        writeSaved(current);
        answerVisible = false;
        render();
      });
      actions.append(previous, next, link, remove);
      article.append(chapter, title, reveal, answer, actions);
      root.append(progress, article);
    };
    render();
  }

  const start = () => { initFlashcards(); initReviewPage(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
