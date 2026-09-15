#!/usr/bin/env node
// /favorites ignores max_id: only page works, pages overlap, the order is
// favourite-time (NOT rawid), and a page can contain a malformed entry
// (observed: {"id": false}) that breaks whole-page decoding. This walks them all.
import { apiGetJson } from "../lib/client.mjs";

const pageSize = Number(process.env.FANFOU_PAGE_SIZE || 20);
const maxPages = Number(process.env.FANFOU_MAX_PAGES || 40);

const seen = new Set();
const order = [];
const rawids = [];
let malformed = 0;

for (let page = 1; page <= maxPages; page++) {
  const list = await apiGetJson("/favorites.json?count=" + pageSize + "&mode=lite&page=" + page);
  if (!Array.isArray(list) || list.length === 0) {
    console.log("page " + page + ": empty -> end of list");
    break;
  }
  const before = seen.size;
  let pageMalformed = 0;
  for (const s of list) {
    const id = typeof s.id === "string" && s.id ? s.id : null;
    if (!id) { malformed++; pageMalformed++; continue; }
    if (!seen.has(id)) { seen.add(id); order.push(id); }
    if (Number.isFinite(s.rawid)) rawids.push(s.rawid);
  }
  const nums = list.map((s) => s.rawid).filter(Number.isFinite);
  console.log(
    "page " + page + ": n=" + list.length + " new=" + (seen.size - before) +
      " dupes=" + (list.length - pageMalformed - (seen.size - before)) +
      " malformed=" + pageMalformed +
      " rawid " + Math.min(...nums) + ".." + Math.max(...nums)
  );
}

let monotonic = true;
for (let i = 1; i < rawids.length; i++) {
  if (rawids[i] > rawids[i - 1]) { monotonic = false; break; }
}
console.log("");
console.log("unique ids: " + seen.size + ", malformed entries skipped: " + malformed);
console.log("rawid monotonic (newest first)? " + monotonic);
if (!monotonic) {
  console.log("-> the page order is NOT by rawid: keep the server order and never re-sort by rawid.");
}
console.log("last reachable id: " + (order[order.length - 1] || "(none)"));
