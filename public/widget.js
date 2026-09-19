/**
 * Lobby embeddable assistant.
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
    console.warn("[lobby] missing data-key on the widget script tag");
    return;
  }

  var origin = new URL(script.src, window.location.href).origin;
  var accent = script.getAttribute("data-accent") || "#19c37d";

  /**
   * Picks black or white for text sitting on the accent, so a dark brand colour
   * doesn't produce an unreadable launcher.
   */
  function readableOn(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return "#07080a";
    var n = parseInt(m[1], 16);
    var channel = function (c) {
      var s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    var luminance =
      0.2126 * channel((n >> 16) & 255) +
      0.7152 * channel((n >> 8) & 255) +
      0.0722 * channel(n & 255);
    // WCAG contrast against black vs white; take whichever reads better.
    var onBlack = (luminance + 0.05) / 0.05;
    var onWhite = 1.05 / (luminance + 0.05);
    return onBlack >= onWhite ? "#07080a" : "#ffffff";
  }

  var onAccent = readableOn(accent);
  var title = script.getAttribute("data-title") || "Chat with us";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var greeting = script.getAttribute("data-greeting") || "Hi! Ask me anything — pricing, availability, booking.";

  var host = document.createElement("div");
  host.setAttribute("data-lobby", "");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    ":host { all: initial; }",
    "* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }",
    ".launcher { position: fixed; bottom: 20px; " + side + ": 20px; z-index: 2147483000;",
    "  display: flex; align-items: center; gap: 8px; border: 0; border-radius: 999px;",
    "  padding: 13px 18px; background: " + accent + "; color: " + onAccent + "; font-size: 15px; font-weight: 600;",
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
    ".me { align-self: flex-end; background: " + accent + "; color: " + onAccent + "; }",
    ".acts { align-self: flex-start; font-size: 11px; color: #8d96ab; padding-left: 4px; }",
    ".pend { opacity: .55; animation: mmpulse 1.2s ease-in-out infinite; }",
    "@keyframes mmpulse { 0%, 100% { opacity: .35 } 50% { opacity: .8 } }",
    "@media (prefers-reduced-motion: reduce) { .pend { animation: none } }",
    "form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #212733; }",
    "input { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 9px; border: 1px solid #212733;",
    "  background: #07080a; color: #e7eaf1; font-size: 14px; outline: none; }",
    "input:focus { border-color: " + accent + "; }",
    "form button { border: 0; border-radius: 9px; padding: 0 14px; background: " + accent + ";",
    "  color: " + onAccent + "; font-weight: 600; font-size: 14px; cursor: pointer; }",
    // The AI disclosure is the one line in here that has to be legible, and it
    // was the faintest colour in the component: #5c6476 on #0b0d11 is 3.28:1,
    // under the 4.5:1 WCAG AA needs for text this size. #8d96ab is 6.56:1 and
    // is what the rest of the widget's secondary text already uses.
    ".foot { padding: 0 14px 10px; font-size: 11px; color: #8d96ab; text-align: center; }",
  ].join("\n");
  root.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  panel.innerHTML =
    '<div class="head"><span class="dot"></span><strong></strong><button aria-label="Close">&times;</button></div>' +
    '<div class="log" role="log" aria-live="polite" aria-label="Conversation"></div>' +
    '<form><input type="text" placeholder="Type your message…" aria-label="Message" /><button type="submit">Send</button></form>' +
    '<div class="foot">Answers are AI. Ask for a person any time.</div>';
  root.appendChild(panel);

  var launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.textContent = title;
  root.appendChild(launcher);

  panel.querySelector(".head strong").textContent = title;
  var log = panel.querySelector(".log");
  var form = panel.querySelector("form");
  var input = panel.querySelector("input");
  var send = form.querySelector("button");
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

  function actionText(list) {
    return list
      .map(function (a) {
        return a.detail ? a.label + " \u2014 " + a.detail : a.label;
      })
      .join(" \u00b7 ");
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

    // The steps go above the reply and stay there, so the visitor can see the
    // assistant checked something rather than taking a paragraph on faith.
    var steps = document.createElement("div");
    steps.className = "acts";
    steps.hidden = true;
    log.appendChild(steps);
    var pending = bubble("\u2026", false);
    pending.classList.add("pend");
    var started = false;

    // One request at a time: a second send would interleave two replies.
    input.disabled = true;
    send.disabled = true;

    function fail() {
      if (!started) {
        pending.textContent =
          "Sorry \u2014 I couldn't reach the assistant. Your message has been noted and someone will follow up.";
      }
    }

    fetch(origin + "/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey: key, conversationId: conversationId, message: text }),
    })
      .then(function (response) {
        if (response.status === 429) {
          // Say what actually happened rather than blaming the connection.
          return response.json().catch(function () { return {}; }).then(function (data) {
            var seconds = Number(data.retryAfter) || 60;
            started = true;
            pending.textContent =
              "That's a lot of messages at once. Try again in " +
              (seconds < 60 ? seconds + " seconds" : Math.ceil(seconds / 60) + " minutes") + ".";
          });
        }
        if (!response.ok || !response.body) throw new Error("chat failed");
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        function handle(name, data) {
          if (name === "open") {
            conversationId = data.conversationId;
          } else if (name === "tool") {
            steps.hidden = false;
            steps.textContent = steps.textContent
              ? steps.textContent + " \u00b7 " + actionText([data])
              : actionText([data]);
          } else if (name === "text") {
            if (!started) {
              started = true;
              pending.textContent = "";
              pending.classList.remove("pend");
            }
            pending.textContent += data.chunk;
          } else if (name === "done") {
            if (data.actions && data.actions.length) {
              steps.hidden = false;
              steps.textContent = actionText(data.actions);
            }
          } else if (name === "error") {
            throw new Error(data.message);
          }
          log.scrollTop = log.scrollHeight;
        }

        // SSE frames are "event: <name>\ndata: <json>\n\n" and can straddle chunks.
        function pump() {
          return reader.read().then(function (result) {
            if (result.done) return;
            buffer += decoder.decode(result.value, { stream: true });
            var boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              var frame = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              boundary = buffer.indexOf("\n\n");
              var name = /^event: (.+)$/m.exec(frame);
              var payload = /^data: (.+)$/m.exec(frame);
              if (name && payload) handle(name[1], JSON.parse(payload[1]));
            }
            return pump();
          });
        }

        return pump();
      })
      .catch(fail)
      .then(function () {
        if (!steps.textContent) steps.remove();
        pending.classList.remove("pend");
        input.disabled = false;
        send.disabled = false;
        input.focus();
      });
  });
})();
