#!/usr/bin/env node
// Cursor semantics: since_id excludes the boundary; max_id wants the encrypted
// id string (a numeric rawid is ignored) and some endpoints ignore max_id outright.
import { apiGetJson } from "../lib/client.mjs";

const page = await apiGetJson("/favorites.json?count=10&mode=lite&page=1");
const firstId = page[0].id;
const last = page[page.length - 1];
console.log("favorites page 1: n=" + page.length + " first=" + firstId + " last=" + last.id + " (rawid " + last.rawid + ")");

const byId = await apiGetJson("/favorites.json?count=10&mode=lite&max_id=" + encodeURIComponent(last.id));
const byRaw = await apiGetJson("/favorites.json?count=10&mode=lite&max_id=" + last.rawid);
console.log("max_id=<id>    -> first=" + (byId[0] && byId[0].id) + "  changed? " + ((byId[0] && byId[0].id) !== firstId));
console.log("max_id=<rawid> -> first=" + (byRaw[0] && byRaw[0].id) + "  changed? " + ((byRaw[0] && byRaw[0].id) !== firstId));
console.log("-> /favorites ignores max_id entirely: page is the only cursor.");

const home = await apiGetJson("/statuses/home_timeline.json?count=5&mode=lite");
const newest = home[0].id;
const since = await apiGetJson("/statuses/home_timeline.json?count=5&mode=lite&since_id=" + encodeURIComponent(newest));
console.log("");
console.log("home_timeline newest=" + newest + "; since_id=<newest> returned " + since.length + " item(s) (boundary excluded)");
