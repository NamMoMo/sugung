import { handleAppBridge } from './app-bridge-server.js';
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/[[path]].js
var ID_RE = /^[A-Za-z0-9-]{1,20}$/;
var MAX_ITEMS = 20;
var MAX_RECORD_BYTES = 32e3;
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
}), "json");
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
__name(safeEqual, "safeEqual");
var isStaff = /* @__PURE__ */ __name((req, env) => {
  const pin = env.STAFF_PIN || "";
  return pin.length >= 4 && safeEqual(req.headers.get("x-staff-pin") || "", pin);
}, "isStaff");
function cleanItems(raw) {
  if (!Array.isArray(raw)) return null;
  const items = [...new Set(raw.map((s) => String(s).trim()).filter(Boolean))];
  if (items.length < 2 || items.length > MAX_ITEMS || items.some((s) => s.length > 40)) return null;
  return items;
}
__name(cleanItems, "cleanItems");
async function listAll(kv, prefix) {
  const keys = [];
  let cursor;
  do {
    const r = await kv.list({ prefix, cursor });
    keys.push(...r.keys.map((k) => k.name));
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return keys;
}
__name(listAll, "listAll");
async function readAll(kv, prefix) {
  const keys = await listAll(kv, prefix), out = [];
  for (let i = 0; i < keys.length; i += 25) {
    const vals = await Promise.all(keys.slice(i, i + 25).map((k) => kv.get(k, "json")));
    vals.forEach((v, j) => v && out.push({ key: keys[i + j].slice(prefix.length), ...v }));
  }
  return out;
}
__name(readAll, "readAll");
async function onRequest({ request: req, env, params }) {
  const kv = env.ROOMB;
  if (!kv) return json({ error: "KV \uBC14\uC778\uB529(ROOMB)\uC774 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694." }, 500);
  const parts = (params.path || []).map(decodeURIComponent);
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  try {
    if (parts[0] === "feed" && method === "GET") {
      const after = Number(url.searchParams.get("after")) || 0;
      const legacyFeed = await kv.get("feed", "json") || [];
      const appFeed = await readAll(kv, "app-feed:");
      const feed = [...legacyFeed, ...appFeed].sort((a,b) => a.at - b.at);
      // KV entries may become visible out of timestamp order. The display deduplicates by k.
      return json({ now: Date.now(), items: feed.filter((f) => f.k?.startsWith('app/') || f.at > after) });
    }
    if (parts[0] === "health" && method === "GET") return json({ ok: true, staffPinSet: (env.STAFF_PIN || "").length >= 4 });
    if (parts[0] === "participants" && parts[1]) {
      const id = parts[1];
      if (!ID_RE.test(id)) return json({ error: "\uCC38\uC5EC \uBC88\uD638 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694." }, 400);
      if (parts.length === 2 && method === "GET") {
        const p = await kv.get("p:" + id, "json");
        return p ? json({ id, items: p.items }) : json({ error: "not_found" }, 404);
      }
      if (parts[2] === "roomB" && parts.length === 3 && method === "POST") {
        const text = await req.text();
        if (text.length > MAX_RECORD_BYTES) return json({ error: "too_large" }, 413);
        let rec;
        try {
          rec = JSON.parse(text);
        } catch {
          return json({ error: "bad_json" }, 400);
        }
        if (!rec || typeof rec !== "object" || !rec.kept || typeof rec.kept.item !== "string") return json({ error: "\uAE30\uB85D \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694." }, 400);
        if (rec.nickname != null && typeof rec.nickname !== "string") return json({ error: "\uB2C9\uB124\uC784 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694." }, 400);
        const nickname = (rec.nickname || "").trim().normalize("NFC");
        const nicknameLength = typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(nickname)).length : Array.from(nickname).length;
        if (nickname.length > 40 || /[\u0000-\u001f\u007f]/.test(nickname)) return json({ error: "\uB2C9\uB124\uC784\uC740 40\uC790 \uC774\uB0B4\uB85C \uC801\uC5B4 \uC8FC\uC138\uC694." }, 400);
        const receivedAt = Date.now(), finishedAt = Number(rec.finishedAt) || receivedAt;
        const key = `${id}/${finishedAt}`;
        await kv.put("r:" + key, JSON.stringify({ ...rec, nickname, id, room: "B", receivedAt }));
        const feed = await kv.get("feed", "json") || [];
        if (!feed.some((f) => f.k === key)) {
          feed.push({ k: key, id, nickname, item: rec.kept.item, color: String(rec.lanternColor || ""), at: receivedAt });
          await kv.put("feed", JSON.stringify(feed.slice(-80)));
        }
        return json({ ok: true, key });
      }
      if (parts[2] === "roomB" && parts[3] === "color" && parts.length === 4 && method === "POST") {
        const body = await req.json().catch(() => null);
        const key = String(body && body.key || ""), color = String(body && body.color || "");
        if (!key.startsWith(id + "/") || !/^[A-Za-z0-9-]{1,20}\/\d{1,16}$/.test(key)) return json({ error: "bad_key" }, 400);
        if (!/^[가-힣]{1,4}·[가-힣]{1,4}$/.test(color)) return json({ error: "bad_color" }, 400);
        const rec = await kv.get("r:" + key, "json");
        if (!rec) return json({ error: "not_found" }, 404);
        const now = Date.now();
        await kv.put("r:" + key, JSON.stringify({ ...rec, lanternColor: color, recoloredAt: now }));
        const feed = await kv.get("feed", "json") || [];
        const f = feed.find((x) => x.k === key);
        if (f) {
          f.color = color;
          f.at = now;
          f.recolor = true;
          await kv.put("feed", JSON.stringify(feed));
        }
        return json({ ok: true, key, color });
      }
      if (parts.length === 2 && (method === "PUT" || method === "DELETE")) {
        if (!isStaff(req, env)) return json({ error: "unauthorized" }, 401);
        if (method === "DELETE") {
          await kv.delete("p:" + id);
          return json({ ok: true });
        }
        const body = await req.json().catch(() => null);
        const items = cleanItems(body && body.items);
        if (!items) return json({ error: `\uD56D\uBAA9\uC740 2\uAC1C \uC774\uC0C1 ${MAX_ITEMS}\uAC1C \uC774\uD558\uB85C \uACE8\uB77C \uC8FC\uC138\uC694.` }, 400);
        const prev = await kv.get("p:" + id, "json");
        const now = Date.now();
        await kv.put("p:" + id, JSON.stringify({ id, items, createdAt: prev && prev.createdAt || now, updatedAt: now }));
        return json({ ok: true, id, items });
      }
    }
    if (parts[0] === "staff") {
      if (!isStaff(req, env)) return json({ error: "unauthorized" }, 401);
      if (parts[1] === "check") return json({ ok: true });
      if (parts[1] === "next-id") {
        const nums = (await listAll(kv, "p:")).map((k) => k.slice(2)).filter((k) => /^\d+$/.test(k)).map(Number);
        return json({ next: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0") });
      }
      if (parts[1] === "participants") {
        const [people, results] = await Promise.all([readAll(kv, "p:"), readAll(kv, "r:")]);
        const byId = /* @__PURE__ */ new Map();
        results.forEach((r) => {
          const c = byId.get(r.id);
          if (!c || (r.finishedAt || 0) > (c.finishedAt || 0)) byId.set(r.id, r);
        });
        people.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        return json({ participants: people.map((p) => ({
          id: p.id,
          items: p.items,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          roomB: byId.get(p.id) ? { kept: byId.get(p.id).kept && byId.get(p.id).kept.item, finishedAt: byId.get(p.id).finishedAt } : null
        })) });
      }
      if (parts[1] === "results" && method === "DELETE") {
        const key = url.searchParams.get("key") || "";
        if (!/^[A-Za-z0-9-]{1,20}\/\d{1,16}$/.test(key)) return json({ error: "bad_key" }, 400);
        await kv.delete("r:" + key);
        const feed = await kv.get("feed", "json") || [];
        if (feed.some((f) => f.k === key)) await kv.put("feed", JSON.stringify(feed.filter((f) => f.k !== key)));
        return json({ ok: true });
      }
      if (parts[1] === "results") {
        const results = await readAll(kv, "r:");
        results.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
        return json({ results });
      }
    }
    return json({ error: "not_found" }, 404);
  } catch (e) {
    return json({ error: "server_error", detail: String(e && e.message || e) }, 500);
  }
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-DgJOui/functionsRoutes-0.33429342763383185.mjs
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../tools/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../tools/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    const appResponse = await handleAppBridge(originalRequest, env);
    if (appResponse) return appResponse;
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
