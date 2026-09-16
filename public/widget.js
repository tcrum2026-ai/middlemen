/**
 * Middlemen embeddable assistant.
 *
 *   <script src="https://your-host/widget.js" data-key="mm_xxx" defer></script>
 *
 * Optional attributes: data-title, data-accent, data-position ("right" | "left"),
 * data-greeting. Everything renders in a shadow root so it cannot inherit or
 * leak page styles.
 */
(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName("script");
    return all[all.length - 1];
  })();
  if (!script) return;

  var key = script.getAttribute("data-key");
  if (!key) {
    console.warn("[middlemen] missing data-key on the widget script tag");
    return;
  }

  var origin = new URL(script.src, window.location.href).origin;
  var accent = script.getAttribute("data-accent") || "#19c37d";
  var title = script.getAttribute("data-title") || "Chat with us";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var greeting = script.getAttribute("data-greeting") || "Hi! Ask me anything — pricing, availability, booking.";

  var host = document.createElement("div");
  host.setAttribute("data-middlemen", "");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host { all: initial; }",
    "* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }",
    ".launcher { position: fixed; bottom: 20px; " + side + ": 20px; z-index: 2147483000;",
    "  display: flex; align-items: center; gap: 8px; border: 0; border-radius: 999px;",
    "  padding: 13px 18px; background: " + accent + "; color: #07080a; font-size: 15px; font-weight: 600;",
    "  cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,.28); }",
    ".panel { position: fixed; bottom: 88px; " + side + ": 20px; z-index: 2147483000;",
    "  width: 370px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px);",
    "  display: none; flex-direction: column; overflow: hidden; border-radius: 16px;",
    "  border: 1px solid #212733; background: #0b0d11; color: #e7eaf1;",
    "  box-shadow: 0 24px 60px rgba(0,0,0,.45); }",
    ".panel[data-open='1'] { display: flex; }",
    ".head { display: flex; align-items: center; gap: 10px; padding: 13px 15px; border-bottom: 1px solid #212733; }",
    ".dot { width: 8px; height: 8px; border-radius: 50%; background: " + accent + "; }",
    ".head strong { font-size: 14px; font-weight: 600; }",
    ".head button { margin-left: auto; background: none; border: 0; color: #8d96ab; font-size: 20px; cursor: pointer; line-height: 1; }",
    ".log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }",
    ".msg { max-width: 85%; padding: 10px 13px; border-radius: 14px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }",
    ".them { align-self: flex-start; background: #161a23; border: 1px solid #212733; }",
    ".me { align-self: flex-end; background: " + accent + "; color: #07080a; }",
    ".acts { align-self: flex-start; font-size: 11px; color: #8d96ab; padding-left: 4px; }",
    "form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #212733; }",
    "input { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 9px; border: 1px solid #212733;",
    "  background: #07080a; color: #e7eaf1; font-size: 14px; outline: none; }",
    "input:focus { border-color: " + accent + "; }",
    "form button { border: 0; border-radius: 9px; padding: 0 14px; background: " + accent + ";",
    "  color: #07080a; font-weight: 600; font-size: 14px; cursor: pointer; }",
    ".foot { padding: 0 14px 10px; font-size: 11px; color: #5c6476; text-align: center; }",
  ].join("\n");
  root.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML =
    '<div class="head"><span class="dot"></span><strong></strong><button aria-label="Close">&times;</button></div>' +
    '<div class="log"></div>' +
    '<form><input type="text" placeholder="Type your message…" aria-label="Message" /><button type="submit">Send</button></form>' +
    '<div class="foot">Answers are AI. Calls are handled by our team.</div>';
  root.appendChild(panel);

  var launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.textContent = title;
  root.appendChild(launcher);

  panel.querySelector(".head strong").textContent = title;
  var log = panel.querySelector(".log");
  var form = panel.querySelector("form");
  var input = panel.querySelector("input");
  var conversationId = null;
  var greeted = false;

  function bubble(text, mine) {
    var el = document.createElement("div");
    el.className = "msg " + (mine ? "me" : "them");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function actions(list) {
    if (!list || !list.length) return;
    var el = document.createElement("div");
    el.className = "acts";
    el.textContent = list
      .map(function (a) {
        return a.detail ? a.label + " — " + a.detail : a.label;
      })
      .join(" · ");
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function toggle(open) {
    panel.setAttribute("data-open", open ? "1" : "0");
    if (open) {
      if (!greeted) {
        bubble(greeting, false);
        greeted = true;
      }
      input.focus();
    }
  }

  launcher.addEventListener("click", function () {
    toggle(panel.getAttribute("data-open") !== "1");
  });
  panel.querySelector(".head button").addEventListener("click", function () {
    toggle(false);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    bubble(text, true);
    var pending = bubble("…", false);

    fetch(origin + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey: key, conversationId: conversationId, message: text }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error("chat failed");
        return response.json();
      })
      .then(function (data) {
        conversationId = data.conversationId;
        pending.textContent = data.reply;
        actions(data.actions);
      })
      .catch(function () {
        pending.textContent =
          "Sorry — I couldn't reach the assistant. Your message has been noted and someone will follow up.";
      });
  });
})();
