(() => {
  const S = window.SITE;
  const $ = (s) => document.querySelector(s);

  // Contact details from config
  document.querySelectorAll("[data-phone]").forEach((a) => {
    a.href = "tel:" + S.phoneHref;
    if (a.textContent.includes("(")) a.textContent = a.textContent.replace(/\(.*\)\s?[\d-]+/, S.phoneDisplay);
  });
  document.querySelectorAll("[data-email]").forEach((a) => { a.href = "mailto:" + S.email; a.textContent = S.email; });

  // Project gallery + lightbox
  const grid = $("#project-grid");
  const lb = $("#lightbox");
  S.projects.forEach((p) => {
    const b = document.createElement("button");
    b.className = "proj";
    b.innerHTML = `<img loading="lazy" alt=""><span></span>`;
    b.querySelector("img").src = p.img;
    b.querySelector("img").alt = `${p.title}`;
    b.querySelector("span").innerHTML = `${p.title}<small>${p.place}</small>`;
    b.onclick = () => {
      lb.querySelector("img").src = p.img;
      lb.querySelector("img").alt = p.title;
      lb.querySelector("p").textContent = p.title;
      lb.hidden = false;
    };
    grid.append(b);
  });
  lb.onclick = () => (lb.hidden = true);
  document.addEventListener("keydown", (e) => e.key === "Escape" && (lb.hidden = true));

  // Distance (straight-line, miles)
  const miles = (a, b) => {
    const r = Math.PI / 180, R = 3958.8;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  async function geocode(q) {
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("geocode failed");
    const d = await res.json();
    return d.length ? { lat: +d[0].lat, lng: +d[0].lon, name: d[0].display_name } : null;
  }

  const result = $("#result"), contact = $("#contact-form");
  const callLink = `<a href="tel:${S.phoneHref}"><strong>${S.phoneDisplay}</strong></a>`;
  const show = (cls, html) => { result.className = "card result " + cls; result.innerHTML = html; result.hidden = false; };

  $("#estimate-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("#address").value.trim();
    contact.hidden = true;
    if (q.length < 5) return show("", "<p>Please enter your full address, including town or ZIP code.</p>");
    show("", "<p>Checking your address…</p>");
    try {
      const loc = await geocode(q);
      if (!loc) return show("", `<h3>We couldn't find that address</h3><p>Check the spelling and include the town and state, or call us at ${callLink}.</p>`);
      const d = miles(S.origin, loc);
      if (d <= S.radiusMiles) {
        show("ok", `<h3>Good news — you qualify!</h3><p>Your property is about ${Math.round(d)} miles from us, inside our ${S.radiusMiles}-mile free estimate area.</p>`);
        contact.hidden = false;
        contact.dataset.address = loc.name;
        contact.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        show("far", `<h3>Outside of our range for a free estimate</h3><p>Please call us! ${callLink}</p>`);
      }
    } catch {
      show("", `<h3>We couldn't check that right now</h3><p>Please call us at ${callLink} for your free estimate.</p>`);
    }
  });

  contact.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(contact);
    if (!f.get("name").trim() || !f.get("phone").trim()) return alert("Please enter your name and phone number.");
    const data = Object.fromEntries(f);
    data.address = $("#address").value.trim();
    if (S.formEndpoint) {
      try {
        const r = await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!r.ok) throw 0;
        contact.hidden = true;
        return show("ok", "<h3>Thank you!</h3><p>We received your request and will call you soon.</p>");
      } catch { /* fall through to mailto */ }
    }
    const body = `Name: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email || ""}\nAddress: ${data.address}\n\n${data.details || ""}`;
    location.href = `mailto:${S.email}?subject=${encodeURIComponent("Free estimate request")}&body=${encodeURIComponent(body)}`;
  });
})();
