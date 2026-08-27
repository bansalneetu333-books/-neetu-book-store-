// ============================================
// NEETU BOOK STORE
// Supabase-powered book catalogue
// ============================================

const SUPABASE_URL =
  "https://qpoiprdminjmhopfpahw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_iAgKgpm-X8TJ-5nFp-xyDg_kSSBSP4o";

const BOOK_TABLE = "books";
const COVER_BUCKET = "book-covers";
const PDF_BUCKET = "ebooks";

let books = [];
let activeBook = null;

// --------------------------------------------
// HELPERS
// --------------------------------------------

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
  if (value === null || value === undefined || value === "") {
    return "Free";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number === 0 ? "Free" : `₹${number}`;
}

function storageUrl(bucket, path) {
  if (!path) return "";

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${String(
    path
  )
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

// --------------------------------------------
// SHOW STATUS
// --------------------------------------------

function showStatus(message, error = false) {
  const status = $("status");

  if (!status) return;

  status.textContent = message;

  status.style.display = "block";

  if (error) {
    status.style.color = "#b42318";
  } else {
    status.style.color = "#68736c";
  }
}

// --------------------------------------------
// LOAD BOOKS DIRECTLY FROM SUPABASE
// --------------------------------------------
async function loadBooks() {
  showStatus("Loading books…");

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
  ].join(",");

  const url =
    `${SUPABASE_URL}/rest/v1/${BOOK_TABLE}` +
    `?select=${encodeURIComponent(columns)}` +
    `&published=eq.true` +
    `&order=featured.desc,created_at.desc`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json"
      }
    });

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      throw new Error(
        `Supabase returned an unexpected response: ${text}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error_description ||
        data?.hint ||
        `Supabase HTTP ${response.status}`
      );
    }

    if (!Array.isArray(data)) {
      throw new Error("Supabase did not return a book list.");
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
    console.error("BOOK STORE ERROR:", error);

    showStatus(
      `Unable to load books: ${error.message}`,
      true
    );
  }
}


// --------------------------------------------
// CATEGORIES
// --------------------------------------------

function buildCategories() {
  const select = $("category");

  if (!select) return;

  const categories = [
    ...new Set(
      books
        .map(book => book.category)
        .filter(Boolean)
    )
  ].sort();

  select.innerHTML =
    `<option value="">All categories</option>` +
    categories
      .map(
        category =>
          `<option value="${esc(category)}">${esc(category)}</option>`
      )
      .join("");
}

// --------------------------------------------
// RENDER BOOKS
// --------------------------------------------

function renderBooks() {
  const grid = $("grid");

  if (!grid) return;

  const searchInput = $("search");

  const query = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const categorySelect = $("category");

  const category = categorySelect
    ? categorySelect.value
    : "";

  const filtered = books.filter(book => {

    const searchable = [
      book.title,
      book.author,
      book.description,
      book.category,
      book.age_group
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !query || searchable.includes(query);

    const matchesCategory =
      !category || book.category === category;

    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <h3>No books found</h3>
        <p>Try another search or category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered
    .map(book => {

      const cover = storageUrl(
        COVER_BUCKET,
        book.cover_path
      );

      return `
        <article class="card">

          <button
            class="cover"
            type="button"
            data-book-id="${esc(book.id)}"
          >

            ${
              cover
                ? `<img
                    src="${esc(cover)}"
                    alt="${esc(book.title)} cover"
                    loading="lazy"
                    onerror="this.style.display='none'"
                   >`
                : `<div class="cover-placeholder">
                     ${esc(book.emoji || "📚")}
                   </div>`
            }

          </button>

          <div class="info">

            <span class="pill">
              ${esc(book.category || "Book")}
            </span>

            <h3>
              ${esc(book.title || "Untitled")}
            </h3>

            ${
              book.description
                ? `<p>${esc(book.description)}</p>`
                : ""
            }

            <div class="bottom">

              <strong>
                ${esc(formatPrice(book.price_inr))}
              </strong>

              <button
                type="button"
                class="view-book"
                data-book-id="${esc(book.id)}"
              >
                View book
              </button>

            </div>

          </div>

        </article>
      `;
    })
    .join("");

  grid
    .querySelectorAll("[data-book-id]")
    .forEach(button => {
      button.addEventListener("click", () => {
        openBook(button.dataset.bookId);
      });
    });
}

// --------------------------------------------
// OPEN BOOK
// --------------------------------------------

function openBook(id) {

  activeBook = books.find(
    book => String(book.id) === String(id)
  );

  if (!activeBook) {
    console.error("Book not found:", id);
    return;
  }

  const modal = $("modal");

  if (!modal) {
    console.error("Modal element not found.");
    return;
  }

  const cover = storageUrl(
    COVER_BUCKET,
    activeBook.cover_path
  );

  const pdf = `${SUPABASE_URL}/storage/v1/object/public/${PDF_BUCKET}/${encodeURIComponent(String(active.storage_path).trim())}`;
  );

  if ($("mcover")) {
    $("mcover").src = cover;
    $("mcover").alt = activeBook.title || "Book cover";
  }

  if ($("mcat")) {
    $("mcat").textContent =
      activeBook.category || "Book";
  }

  if ($("mtitle")) {
    $("mtitle").textContent =
      activeBook.title || "Untitled";
  }

  if ($("mauthor")) {
    $("mauthor").textContent =
      activeBook.author
        ? `By ${activeBook.author}`
        : "";
  }

  if ($("mage")) {
    $("mage").textContent =
      activeBook.age_group
        ? `Ages ${activeBook.age_group}`
        : "";
  }

  if ($("mprice")) {
    $("mprice").textContent =
      formatPrice(activeBook.price_inr);
  }

  if ($("mdescription")) {
    $("mdescription").textContent =
      activeBook.description || "";
  }

  const readButton = $("read");

  if (readButton) {
    if (pdf) {
      readButton.href = pdf;
      readButton.target = "_blank";
      readButton.rel = "noopener";
      readButton.style.display = "";
    } else {
      readButton.removeAttribute("href");
      readButton.style.display = "none";
    }
  }

  modal.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

// --------------------------------------------
// CLOSE MODAL
// --------------------------------------------

function closeModal() {

  const modal = $("modal");

  if (modal) {
    modal.classList.add("hidden");
  }

  document.body.classList.remove("modal-open");

  activeBook = null;
}

// --------------------------------------------
// EVENTS
// --------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

  console.log("NEETU BOOK STORE JS IS RUNNING");

  const search = $("search");

  if (search) {
    search.addEventListener(
      "input",
      renderBooks
    );
  }

  const category = $("category");

  if (category) {
    category.addEventListener(
      "change",
      renderBooks
    );
  }

  const close = $("close");

  if (close) {
    close.addEventListener(
      "click",
      closeModal
    );
  }

  const modal = $("modal");

  if (modal) {
    modal.addEventListener(
      "click",
      event => {
        if (event.target === modal) {
          closeModal();
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        closeModal();
      }
    }
  );

  // Start loading books
  loadBooks();
});
function publicUrl(bucket, path) {
  if (!path) return "";

  const cleanPath = String(path).trim();

  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(cleanPath);

  return data?.publicUrl || "";
}
