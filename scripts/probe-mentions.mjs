#!/usr/bin/env node
// mentions: `count` is a stable prefix — count=20 and count=40 agree on the
// newest 20, so a small page is enough to compute an unread watermark.
import { apiGetJson } from "../lib/client.mjs";

const m20 = await apiGetJson("/statuses/mentions.json?count=20&mode=lite");
const m40 = await apiGetJson("/statuses/mentions.json?count=40&mode=lite");
const ids20 = m20.map((s) => s.id);
const ids40 = m40.map((s) => s.id);
console.log("count=20 -> " + ids20.length + " items; count=40 -> " + ids40.length + " items");
console.log("newest 20 identical? " + ids20.every((id, i) => id === ids40[i]));
console.log("newest mention: " + (ids40[0] || "(none)"));
