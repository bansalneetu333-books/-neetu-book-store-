// ========================================
// NEETU BOOK STORE
// Supabase-powered bookstore
// ========================================

// Keep your existing Supabase URL and publishable key here.
// DO NOT use a service_role/secret key in this file.

const SUPABASE_URL = "https://qpoiprdminjmhopfpahw.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iAgKgpm-X8TJ-5nFp-xyDg_kSSBSP4o";

const BOOK_TABLE = "books";
const COVER_BUCKET = "book-covers";
const PDF_BUCKET = "ebooks";

const { createClient } = window.supabase;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = id => document.getElementById(id);

let books = [];
let activeBook = null;


// ========================================
// STORAGE URL
// ========================================

function publicUrl(bucket, path) {
  if (!path) return "";

  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path);

  return data?.publicUrl || "";
}


// ========================================
// ESCAPE HTML
// ========================================

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}


// ========================================
// PRICE
// ========================================

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Free";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return esc(value);
  }

  return number === 0 ? "Free" : `₹${number}`;
}


// ========================================
// LOAD BOOKS
// ========================================

async function loadBooks() {

  $("status").textContent = "Loading books…";

  try {

    const { data, error } = await supabase
      .from(BOOK_TABLE)
      .select(`
        id,
        title,
        slug,
        author,
        description,
        category,
        age_group,
        emoji,
        price_inr,
        storage_path,
        cover_path,
        published,
        featured,
        created_at
      `)
      .eq("published", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);

      $("status").innerHTML =
        `<strong>Unable to load books.</strong><br>
         ${esc(error.message)}`;

      return;
    }

    books = data || [];

    buildCategories();

    renderBooks();

  } catch (error) {

    console.error(error);

    $("status").innerHTML =
      `<strong>Something went wrong.</strong><br>
       ${esc(error.message || error)}`;
  }
}


// ========================================
// CATEGORIES
// ========================================

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
      .map(category =>
        `<option value="${esc(category)}">
          ${esc(category)}
        </option>`
      )
      .join("");
}


// ========================================
// RENDER BOOKS
// ========================================

function renderBooks() {

  const grid = $("grid");

  if (!grid) return;

  const search =
    ($("search")?.value || "")
      .toLowerCase()
      .trim();

  const category =
    $("category")?.value || "";

  const filtered = books.filter(book => {

    const searchable = [
      book.title,
      book.author,
      book.description,
      book.category
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesCategory =
      !category || book.category === category;

    return matchesSearch && matchesCategory;
  });


  $("status").textContent =
    `${filtered.length} book${filtered.length === 1 ? "" : "s"}`;


  if (!filtered.length) {

    grid.innerHTML = `
      <div class="empty">
        <h3>No books found</h3>
        <p>Try another search or category.</p>
      </div>
    `;

    return;
  }


  grid.innerHTML = filtered.map(book => {

    const cover =
      publicUrl(COVER_BUCKET, book.cover_path);

    return `
      <article class="card">

        <button
          class="cover"
          data-id="${esc(book.id)}"
          aria-label="Open ${esc(book.title)}"
        >

          ${
            cover
              ? `<img
                   src="${cover}"
                   alt="${esc(book.title)} cover"
                   loading="lazy"
                 >`
              : `<div class="cover-placeholder">
                   ${esc(book.emoji || "📚")}
                 </div>`
          }

        </button>

        <div class="info">

          ${
            book.category
              ? `<span class="pill">
                   ${esc(book.category)}
                 </span>`
              : ""
          }

          <h3>${esc(book.title)}</h3>

          ${
            book.author
              ? `<p class="author">
                   By ${esc(book.author)}
                 </p>`
              : ""
          }

          ${
            book.description
              ? `<p>
                   ${esc(book.description)}
                 </p>`
              : ""
          }

          <div class="bottom">

            <b>
              ${formatPrice(book.price_inr)}
            </b>

            <button
              class="btn primary"
              data-id="${esc(book.id)}"
            >
              View book
            </button>

          </div>

        </div>

      </article>
    `;

  }).join("");


  // Attach click events

  grid.querySelectorAll("[data-id]").forEach(element => {

    element.addEventListener("click", () => {
      openBook(element.dataset.id);
    });

  });
}


// ========================================
// OPEN BOOK
// ========================================

function openBook(id) {

  activeBook =
    books.find(book => String(book.id) === String(id));

  if (!activeBook) return;


  // Cover

  const cover =
    publicUrl(
      COVER_BUCKET,
      activeBook.cover_path
    );

  if ($("mcover")) {
    $("mcover").src = cover || "";
    $("mcover").alt =
      `${activeBook.title} cover`;
  }


  // Category

  if ($("mcat")) {
    $("mcat").textContent =
      activeBook.category || "Book";
  }


  // Title

  if ($("mtitle")) {
    $("mtitle").textContent =
      activeBook.title || "";
  }


  // Author

  if ($("mauthor")) {
    $("mauthor").textContent =
      activeBook.author
        ? `By ${activeBook.author}`
        : "";
  }


  // Age group

  if ($("mage")) {
    $("mage").textContent =
      activeBook.age_group
        ? `Ages ${activeBook.age_group}`
        : "";
  }


  // Price

  if ($("mprice")) {
    $("mprice").textContent =
      formatPrice(activeBook.price_inr);
  }


  // PDF

  const pdf =
    publicUrl(
      PDF_BUCKET,
      activeBook.storage_path
    );


  if ($("read")) {

    if (pdf) {

      $("read").href = pdf;
      $("read").target = "_blank";
      $("read").rel = "noopener";
      $("read").style.display = "";

    } else {

      $("read").style.display = "none";
    }
  }


  // Buy button

  if ($("buy")) {

    $("buy").onclick = () => {

      alert(
        `Purchase flow for "${activeBook.title}" can be connected next.`
      );

    };
  }


  // Open modal

  if ($("modal")) {
    $("modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}


// ========================================
// CLOSE BOOK
// ========================================

function closeBook() {

  if ($("modal")) {
    $("modal").classList.add("hidden");
  }

  document.body.classList.remove("modal-open");

  activeBook = null;
}


// ========================================
// EVENTS
// ========================================

if ($("search")) {
  $("search").addEventListener("input", renderBooks);
}

if ($("category")) {
  $("category").addEventListener("change", renderBooks);
}

if ($("close")) {
  $("close").addEventListener("click", closeBook);
}

if ($("modal")) {

  $("modal").addEventListener("click", event => {

    if (event.target === $("modal")) {
      closeBook();
    }

  });
}


document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    closeBook();
  }

});


// ========================================
// START
// ========================================

if (
  SUPABASE_URL === " ||"https://qpoiprdminjmhopfpahw.supabase.co"|| ";
  SUPABASE_PUBLISHABLE_KEY === "sb_publishable_iAgKgpm-X8TJ-5nFp-xyDg_kSSBSP4o
"
) ;{

  $("status").innerHTML =
    `<strong>Supabase setup required.</strong><br>
     Open app.js and keep your existing Supabase URL and publishable key.`;

} else

  loadBooks();
}
console.log("NEETU BOOK STORE JS IS RUNNING");
