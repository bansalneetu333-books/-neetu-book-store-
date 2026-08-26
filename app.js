// NEETU BOOK STORE
// Replace these two values with your Supabase Project URL and PUBLISHABLE key.
// Never put a secret/service_role key in browser code.

const SUPABASE_URL = "https://qpoiprdminjmhopfpahw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iAgKgpm-X8TJ-5nFp-xyDg_kSSBSP4o";
const BOOK_TABLE = "books";
const COVER_BUCKET = "book-covers";
const PDF_BUCKET = "ebooks";

const {createClient} = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let books = [], active = null;

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function url(bucket,path){if(!path)return "";return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl||"";}
function price(v){return v==null||v===""?"Free":`₹${Number(v).toLocaleString("en-IN")}`;}

async function load(){
  $("status").textContent="Loading books…";
  const {data,error}=await supabase.from(BOOK_TABLE)
    .select("id,title,slug,author,description,category,age_group,emoji,price_inr,storage_path,cover_path,published,featured,created_at")
    .eq("published",true).order("featured",{ascending:false}).order("created_at",{ascending:false});
  if(error){console.error(error);$("status").innerHTML="<strong>Could not load books.</strong><br>Check your Supabase URL/key and the public SELECT policy.";return;}
  books=data||[];
  const cats=[...new Set(books.map(b=>b.category).filter(Boolean))].sort();
  $("category").innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  render();
}
function render(){
  const q=$("search").value.toLowerCase().trim(), cat=$("category").value;
  const list=books.filter(b=>(!q||[b.title,b.author,b.description,b.category,b.age_group].filter(Boolean).join(" ").toLowerCase().includes(q))&&(!cat||b.category===cat));
  $("status").textContent=`${list.length} book${list.length===1?"":"s"}`;
  $("grid").innerHTML=list.map(b=>`<article class="card">
    <button class="cover" data-id="${b.id}"><img src="${esc(url(COVER_BUCKET,b.cover_path))}" alt="${esc(b.title)} cover" loading="lazy"></button>
    <div class="info"><span class="pill">${esc(b.category||"Book")}</span><h3>${esc(b.title)}</h3>
    <p>${esc(b.description||"Explore this book from Neetu Book Store.")}</p>
    <div class="bottom"><b>${price(b.price_inr)}</b><button class="small" data-id="${b.id}">View</button></div></div></article>`).join("");
  $("grid").querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>openBook(x.dataset.id));
}
function openBook(id){
  active=books.find(b=>String(b.id)===String(id)); if(!active)return;
  $("mcover").src=url(COVER_BUCKET,active.cover_path);$("mcover").alt=active.title+" cover";
  $("mcat").textContent=active.category||"Book";$("mtitle").textContent=active.title||"";
  $("mauthor").textContent=active.author?`By ${active.author}`:"";$("mdesc").textContent=active.description||"Explore this book.";
  $("mage").textContent=active.age_group?`Ages ${active.age_group}`:"";$("mprice").textContent=price(active.price_inr);
  const pdf=url(PDF_BUCKET,active.storage_path);$("read").href=pdf||"#";$("read").style.opacity=pdf?"1":".5";
  $("buy").onclick=()=>alert(`Purchase flow for "${active.title}" will be connected next.`);
  $("modal").classList.remove("hidden");document.body.style.overflow="hidden";
}
function close(){ $("modal").classList.add("hidden");document.body.style.overflow="";active=null; }
$("search").oninput=render;$("category").onchange=render;$("close").onclick=close;$("backdrop").onclick=close;
document.onkeydown=e=>{if(e.key==="Escape")close()};$("year").textContent=new Date().getFullYear();

if(SUPABASE_URL.includes("PASTE_")||SUPABASE_PUBLISHABLE_KEY.includes("PASTE_"))
  $("status").innerHTML="<strong>Setup:</strong> open <code>app.js</code> and add your Supabase Project URL and Publishable key.";
else load();
