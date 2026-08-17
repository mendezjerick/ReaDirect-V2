const endpoint =
  process.env.READIRECT_DEVTOOLS_ENDPOINT ?? "http://127.0.0.1:9222";
const pages = await fetch(`${endpoint}/json`).then((response) => {
  if (!response.ok)
    throw new Error(`DevTools endpoint returned ${response.status}.`);
  return response.json();
});
const page = pages.find((candidate) => candidate.type === "page");
if (!page?.webSocketDebuggerUrl) {
  throw new Error("No debuggable Android WebView page was found.");
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const clickText = process.env.READIRECT_CLICK_TEXT;
if (clickText) {
  const clickExpression = `(() => {
    const expected = ${JSON.stringify(clickText)};
    const button = [...document.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === expected,
    );
    if (!button) return false;
    button.click();
    return true;
  })()`;
  const clickResult = await command("Runtime.evaluate", {
    expression: clickExpression,
    returnByValue: true,
  });
  if (clickResult.result?.value !== true) {
    throw new Error(`No enabled WebView button matched: ${clickText}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

const expression = `JSON.stringify({
  title: document.title,
  url: location.href,
  readyState: document.readyState,
  bodyText: document.body?.innerText?.slice(0, 1000) ?? "",
  bodyChildren: document.body?.childElementCount ?? 0,
  rootChildren: document.querySelector("#root")?.childElementCount ?? 0,
  bodyBackground: getComputedStyle(document.body).backgroundColor,
  htmlBytes: document.documentElement.outerHTML.length,
  scripts: [...document.scripts].map((script) => script.src || "inline"),
})`;
const evaluation = await command("Runtime.evaluate", {
  expression,
  returnByValue: true,
});
socket.close();

const value = evaluation.result?.value;
if (typeof value !== "string") {
  throw new Error("The WebView inspection did not return a document snapshot.");
}
console.log(JSON.stringify(JSON.parse(value), null, 2));
