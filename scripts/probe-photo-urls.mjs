#!/usr/bin/env node
// Photo URLs are CDN render transforms. `largeurl` is only ~596px wide; the
// untransformed upload is the URL with its @suffix removed.
import { apiGetJson } from "../lib/client.mjs";
import { USER_AGENT } from "../lib/config.mjs";
import { imageSize } from "../lib/image-size.mjs";

const home = await apiGetJson("/statuses/home_timeline.json?count=40&mode=lite");
const status = home.find((s) => s && s.photo);
if (!status) {
  console.log("No photo in the newest home page — post one, then re-run.");
  process.exit(0);
}

const photo = status.photo;
console.log("status " + status.id);
for (const key of ["thumburl", "imageurl", "largeurl"]) {
  console.log("  " + key.padEnd(9) + " " + (photo[key] || "(none)"));
}
const anyUrl = photo.largeurl || photo.imageurl || photo.thumburl || "";
const original = anyUrl.split("@")[0];
console.log("  " + "original".padEnd(9) + " " + original);
console.log("");

async function probe(label, url) {
  if (!url) return;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const buf = Buffer.from(await res.arrayBuffer());
  const size = imageSize(buf);
  console.log(
    label.padEnd(9) + " HTTP " + res.status + "  " + buf.length + " bytes  " +
      (size ? size.width + "x" + size.height : "(unknown format)")
  );
}

await probe("thumburl", photo.thumburl);
await probe("imageurl", photo.imageurl);
await probe("largeurl", photo.largeurl);
await probe("original", original);
console.log("");
console.log("-> strip the @render suffix for full-resolution viewing.");
