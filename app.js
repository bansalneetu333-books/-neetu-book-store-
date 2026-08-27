// ============================================================
// NEETU BOOK STORE
// Supabase-powered book catalogue
// ============================================================

// ------------------------------------------------------------
// SUPABASE SETTINGS
// ------------------------------------------------------------

const SUPABASE_URL =
  "https://qpoiprdminjmhopfpahw.supabase.co";

// IMPORTANT:
// Paste your EXISTING complete publishable key between the quotes.
const SUPABASE_KEY =
  "sb_publishable_iAgKgpm-X8TJ-5nFp-xyDg_kSSBSP4o";

const BOOK_TABLE = "books";
const COVER_BUCKET = "book-covers";
const PDF_BUCKET = "ebooks";


// ------------------------------------------------------------
// APP STATE
// ------------------------------------------------------------

let books = [];
let activeBook = null;


// ------------------------------------------------------------
// BASIC HELPERS
// ------------------------------------------------------------

function $(id) {
  return document.getElementById(id);
}


function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Free";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return esc(value);
  }

  return number === 0
    ? "Free"
    : `₹${number}`;
}


// ------------------------------------------------------------
// SUPABASE STORAGE URL
// ------------------------------------------------------------

function publicUrl(bucket, path) {
  if (!path) return "";

  const cleanPath = String(path)
    .trim()
    .replace(/^\/+/, "");

  const encodedPath = cleanPath
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
}


// ------------------------------------------------------------
// STATUS MESSAGE
// ------------------------------------------------------------

function showStatus(message, isError = false) {
  const status = $("status");

  if (!status) {
    console.log(message);
    return;
  }

  status.textContent = message;

  status.classList.toggle("error", isError);
}


// ------------------------------------------------------------
// LOAD BOOKS FROM SUPABASE
// ------------------------------------------------------------

async function loadBooks() {
  showStatus("Loading books…");

  try {

    if (
      !SUPABASE_KEY ||
      SUPABASE_KEY.includes("PASTE_YOUR")
    ) {
      throw new Error(
        "Supabase publishable key is missing."
      );
    }

    const columns = [
      "id",
      "title",
      "slug",
      "author",
      "description",
      "category",
      "age_group",
      "emoji",
      "price_inr",
      "storage_path",
      "cover_path",
      "published",
      "featured",
      "created_at"
    ];

    const query =
      `${SUPABASE_URL}/rest/v1/${BOOK_TABLE}` +
      `?select=${encodeURIComponent(columns.join(","))}` +
      `&published=eq.true` +
      `&order=featured.desc,created_at.desc`;

    const response = await fetch(query, {
      method: "GET",

      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      let message = text;

      try {
        const errorData = JSON.parse(text);

        message =
          errorData.message ||
          errorData.error_description ||
          errorData.error ||
          text;
      } catch {
        // Keep original text
      }

      throw new Error(
        `Supabase HTTP ${response.status}: ${message}`
      );
    }

    let data = [];

    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      throw new Error(
        "Supabase returned invalid JSON."
      );
    }

    if (!Array.isArray(data)) {
      throw new Error(
        "Supabase did not return a list of books."
      );
    }

    books = data;

    buildCategories();
    renderBooks();

    showStatus(
      books.length === 1
        ? "1 book"
        : `${books.length} books`
    );

  } catch (error) {

    console.error(
      "NEETU BOOK STORE ERROR:",
      error
    );

    showStatus(
      `Unable to load books: ${error.message}`,
      true
    );
  }
}


// ------------------------------------------------------------
// BUILD CATEGORY DROPDOWN
// ------------------------------------------------------------

function buildCategories() {
  const select = $("category");

  if (!select) return;

  const currentValue = select.value || "";

  const categories = [
    ...new Set(
      books
        .map(book => book.category)
        .filter(Boolean)
    )
  ].sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  select.innerHTML = `
    <option value="">All categories</option>
    ${categories
      .map(category => `
        <option value="${esc(category)}">
          ${esc(category)}
        </option>
      `)
      .join("")}
  `;

  if (
    categories.includes(currentValue)
  ) {
    select.value = currentValue;
  }
}


// ------------------------------------------------------------
// FILTER BOOKS
// ------------------------------------------------------------

function getFilteredBooks() {
  const searchInput = $("search");
  const categorySelect = $("category");

  const search = (
    searchInput?.value || ""
  )
    .trim()
    .toLowerCase();

  const category =
    categorySelect?.value || "";

  return books.filter(book => {

    const matchesCategory =
      !category ||
      String(book.category || "") === category;

    if (!matchesCategory) {
      return false;
    }

    if (!search) {
      return true;
    }

    const searchableText = [
      book.title,
      book.author,
      book.description,
      book.category,
      book.age_group
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });
}


// ------------------------------------------------------------
// RENDER BOOKS
// ------------------------------------------------------------

function renderBooks() {
  const grid = $("grid");

  if (!grid) {
    console.error(
      'Element with id="grid" was not found.'
    );
    return;
  }

  const filteredBooks =
    getFilteredBooks();

  if (filteredBooks.length === 0) {

    grid.innerHTML = `
      <div class="empty-state">
        <div style="font-size:42px;">📚</div>
        <h3>No books found</h3>
        <p>
          Try another search or category.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML =
    filteredBooks
      .map(book => createBookCard(book))
      .join("");
}


// ------------------------------------------------------------
// BOOK CARD
// ------------------------------------------------------------

function createBookCard(book) {

  const cover =
    publicUrl(
      COVER_BUCKET,
      book.cover_path
    );

  const category =
    book.category || "Books";

  const title =
    book.title || "Untitled book";

  const description =
    book.description ||
    "Discover a new story, idea or adventure.";

  const price =
    formatPrice(book.price_inr);

  return `
    <article
      class="book-card"
      data-book-id="${esc(book.id)}"
    >

      <div class="book-cover">

        ${
          cover
            ? `
              <img
                src="${esc(cover)}"
                alt="${esc(title)}"
                loading="lazy"
                onerror="this.style.display='none';"
              >
            `
            : `
              <div class="cover-placeholder">
                ${esc(book.emoji || "📚")}
              </div>
            `
        }

      </div>


      <div class="book-info">

        <div class="book-category">
          ${esc(category)}
        </div>

        <h3>
          ${esc(title)}
        </h3>

        <p>
          ${esc(description)}
        </p>


        <div class="book-bottom">

          <strong>
            ${price}
          </strong>

          <button
            class="view-book"
            type="button"
            data-book-id="${esc(book.id)}"
          >
            View book
          </button>

        </div>

      </div>

    </article>
  `;
}


// ------------------------------------------------------------
// OPEN BOOK MODAL
// ------------------------------------------------------------

function openBook(book) {

  activeBook = book;

  const modal =
    $("modal");

  if (!modal) {
    console.error(
      'Element with id="modal" was not found.'
    );
    return;
  }

  const cover =
    publicUrl(
      COVER_BUCKET,
      book.cover_path
    );

  const title =
    book.title || "Untitled book";

  const author =
    book.author || "";

  const category =
    book.category || "";

  const age =
    book.age_group || "";

  const price =
    formatPrice(book.price_inr);

  const description =
    book.description || "";


  modal.innerHTML = `

    <div
      class="modal-backdrop"
      data-close-modal="true"
    ></div>

    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-label="${esc(title)}"
    >

      <button
        class="modal-close"
        type="button"
        data-close-modal="true"
        aria-label="Close"
      >
        ×
      </button>


      <div class="modal-cover">

        ${
          cover
            ? `
              <img
                src="${esc(cover)}"
                alt="${esc(title)}"
              >
            `
            : `
              <div class="cover-placeholder">
                ${esc(book.emoji || "📚")}
              </div>
            `
        }

      </div>


      ${
        category
          ? `
            <div class="book-category">
              ${esc(category)}
            </div>
          `
          : ""
      }


      <h2>
        ${esc(title)}
      </h2>


      ${
        author
          ? `
            <p class="modal-author">
              By ${esc(author)}
            </p>
          `
          : ""
      }


      <div class="modal-meta">

        ${
          age
            ? `
              <strong>
                Ages ${esc(age)}
              </strong>
            `
            : ""
        }

        <strong>
          ${price}
        </strong>

      </div>


      ${
        description
          ? `
            <p class="modal-description">
              ${esc(description)}
            </p>
          `
          : ""
      }


      <div class="modal-actions">

        <button
          class="read-button"
          type="button"
          data-read-book="true"
        >
          Read / Open
        </button>


        <button
          class="buy-button"
          type="button"
          data-buy-book="true"
        >
          Buy
        </button>

      </div>


      <p class="payment-note">
        Payment can be connected after the bookstore design is approved.
      </p>

    </div>
  `;


  modal.classList.add("open");
  document.body.classList.add("modal-open");
}


// ------------------------------------------------------------
// CLOSE MODAL
// ------------------------------------------------------------

function closeModal() {

  const modal = $("modal");

  if (!modal) return;

  modal.classList.remove("open");

  document.body.classList.remove(
    "modal-open"
  );

  activeBook = null;
}


// ------------------------------------------------------------
// OPEN PDF
// ------------------------------------------------------------

function openPDF(book) {

  if (!book) return;

  let pdfPath =
    book.storage_path;

  /*
    If storage_path is empty, use the title
    as a fallback.

    For your Door 2050 book this means:

    Door 2050.pdf
  */

  if (!pdfPath) {

    pdfPath =
      `${book.title || "book"}.pdf`;
  }

  const pdfUrl =
    publicUrl(
      PDF_BUCKET,
      pdfPath
    );

  if (!pdfUrl) {

    alert(
      "The PDF file is not connected to this book yet."
    );

    return;
  }

  console.log(
    "Opening PDF:",
    pdfUrl
  );

  window.open(
    pdfUrl,
    "_blank",
    "noopener,noreferrer"
  );
}


// ------------------------------------------------------------
// BUY BUTTON
// ------------------------------------------------------------

function buyBook(book) {

  if (!book) return;

  /*
    Payment can be connected later.

    For now we show a simple message.
  */

  alert(
    `Purchase for "${book.title}" will be available soon.`
  );
}


// ------------------------------------------------------------
// EVENT HANDLERS
// ------------------------------------------------------------

function setupEvents() {

  const search =
    $("search");

  const category =
    $("category");


  if (search) {

    search.addEventListener(
      "input",
      renderBooks
    );
  }


  if (category) {

    category.addEventListener(
      "change",
      renderBooks
    );
  }


  document.addEventListener(
    "click",
    event => {

      const viewButton =
        event.target.closest(
          ".view-book"
        );

      if (viewButton) {

        const id =
          viewButton.dataset.bookId;

        const book =
          books.find(
            item =>
              String(item.id) ===
              String(id)
          );

        if (book) {
          openBook(book);
        }

        return;
      }


      if (
        event.target.closest(
          "[data-close-modal]"
        )
      ) {

        closeModal();

        return;
      }


      if (
        event.target.closest(
          "[data-read-book]"
        )
      ) {

        openPDF(activeBook);

        return;
      }


      if (
        event.target.closest(
          "[data-buy-book]"
        )
      ) {

        buyBook(activeBook);

        return;
      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeModal();
      }

    }
  );
}


// ------------------------------------------------------------
// START APP
// ------------------------------------------------------------

function startApp() {

  setupEvents();

  loadBooks();
}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();
}
