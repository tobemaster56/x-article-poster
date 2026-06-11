// ==UserScript==
// @name         xPoster
// @namespace    https://github.com/tobemaster56/x-article-poster
// @version      1.0.0
// @description  把 Markdown 写入 X 文章编辑器(图片/表格/推文/代码/封面)
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  // ===========================================================================
  // [SHARED] 内联 src/shared.js(纯逻辑,零 chrome 依赖,挂 window.xPosterShared)
  // ===========================================================================
  (() => {
  const STYLE_TAGS = {
    Bold: "strong",
    Italic: "em",
    Strikethrough: "s",
    Code: "code"
  };

  const BLOCK_TAGS = {
    "header-one": "h1",
    "header-two": "h2",
    "header-three": "h3",
    "header-four": "h4",
    "header-five": "h5",
    "header-six": "h6",
    blockquote: "blockquote",
    unstyled: "p"
  };

  const LOCAL_DB = "xposter_local_assets";
  const LOCAL_STORE = "handles";
  const VAULT_KEY = "vault_root";
  const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
  const SUPPORTED_IMAGE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/avif"
  ]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ZH_TW_CHAR_MAP = new Map(Object.entries({
    "与": "與", "专": "專", "业": "業", "个": "個", "临": "臨", "为": "為", "么": "麼", "于": "於",
    "仅": "僅", "从": "從", "们": "們", "优": "優", "会": "會", "传": "傳", "体": "體", "侧": "側",
    "储": "儲", "关": "關", "内": "內", "写": "寫", "准": "準", "减": "減", "击": "擊", "划": "劃",
    "则": "則", "创": "創", "别": "別", "务": "務", "动": "動", "区": "區", "单": "單", "占": "佔",
    "历": "歷", "发": "發", "变": "變", "台": "臺", "号": "號", "后": "後", "启": "啟", "响": "響",
    "围": "圍", "图": "圖", "块": "塊", "声": "聲", "处": "處", "备": "備", "复": "復", "夹": "夾",
    "实": "實", "对": "對", "导": "導", "将": "將", "尝": "嘗", "尽": "盡", "带": "帶", "帮": "幫",
    "并": "並", "庆": "慶", "库": "庫", "应": "應", "开": "開", "张": "張", "弹": "彈", "当": "當",
    "录": "錄", "径": "徑", "态": "態", "执": "執", "扩": "擴", "报": "報", "拦": "攔", "择": "擇",
    "换": "換", "据": "據", "数": "數", "断": "斷", "无": "無", "旧": "舊", "时": "時", "显": "顯",
    "暂": "暫", "术": "術", "权": "權", "条": "條", "来": "來", "构": "構", "标": "標", "栏": "欄",
    "样": "樣", "桥": "橋", "检": "檢", "残": "殘", "没": "沒", "浅": "淺", "测": "測", "浏": "瀏",
    "温": "溫", "点": "點", "烟": "煙", "状": "狀", "独": "獨", "环": "環", "现": "現", "画": "畫",
    "盖": "蓋", "盗": "盜", "码": "碼", "确": "確", "种": "種", "签": "籤", "类": "類", "级": "級",
    "纯": "純", "纸": "紙", "线": "線", "细": "細", "终": "終", "经": "經", "绑": "綁", "结": "結",
    "给": "給", "绝": "絕", "统": "統", "继": "繼", "绪": "緒", "续": "續", "编": "編", "缩": "縮",
    "网": "網", "联": "聯", "脚": "腳", "节": "節", "获": "獲", "虑": "慮", "装": "裝", "见": "見",
    "观": "觀", "规": "規", "览": "覽", "计": "計", "订": "訂", "认": "認", "让": "讓", "议": "議",
    "记": "記", "许": "許", "设": "設", "访": "訪", "证": "證", "识": "識", "诉": "訴", "诊": "診",
    "试": "試", "该": "該", "详": "詳", "语": "語", "误": "誤", "说": "說", "请": "請", "读": "讀",
    "调": "調", "负": "負", "责": "責", "败": "敗", "账": "賬", "贴": "貼", "费": "費", "转": "轉",
    "轻": "輕", "载": "載", "较": "較", "辑": "輯", "输": "輸", "边": "邊", "过": "過", "运": "運",
    "还": "還", "这": "這", "进": "進", "连": "連", "适": "適", "选": "選", "里": "裡", "钮": "鈕",
    "铃": "鈴", "链": "鏈", "锁": "鎖", "错": "錯", "长": "長", "门": "門", "闭": "閉", "问": "問",
    "闲": "閒", "间": "間", "阅": "閱", "队": "隊", "阶": "階", "际": "際", "随": "隨", "隐": "隱",
    "页": "頁", "项": "項", "须": "須", "预": "預", "题": "題", "风": "風", "馈": "饋", "验": "驗",
    "骤": "驟"
  }));
  const ZH_TW_PHRASES = [
    ["文件夾", "資料夾"],
    ["文件", "檔案"],
    ["軟件", "軟體"],
    ["默認", "預設"],
    ["加載", "載入"],
    ["粘貼", "貼上"],
    ["隊列", "佇列"],
    ["賬號", "帳號"],
    ["後臺", "後台"],
    ["本地", "本機"]
  ];

  function toTraditionalChinese(value) {
    let text = String(value ?? "").replace(/[\u4e00-\u9fff]/g, (char) => ZH_TW_CHAR_MAP.get(char) || char);
    for (const [source, replacement] of ZH_TW_PHRASES) {
      text = text.replaceAll(source, replacement);
    }
    return text;
  }

  function looksLikeMarkdown(text) {
    if (!text || text.length < 3) return false;
    if (findMarkdownImageSpans(text).some((span) => isLikelyMarkdownImageSource(span.source))) return true;
    return [
      /^#{1,6}\s+\S/m,
      /^>\s+\S/m,
      /^[-*+]\s+\S/m,
      /^\d+\.\s+\S/m,
      /^\s*```/m,
      /^\s*(?:---|\*\*\*|___)\s*$/m,
      /\[[^\]]+\]\(https?:\/\/\S+\)/i,
      /^\s*\|.+\|\s*$\n^\s*\|[\s:|\-]+\|\s*$/m,
      /`[^`\n]+`/
    ].some((pattern) => pattern.test(text));
  }

  function parseFrontmatter(markdown) {
    const normalized = String(markdown ?? "").replace(/\r\n/g, "\n");
    const match = normalized.match(/^---\n([\s\S]*?)\n---\n*/);
    if (!match) return { body: trimMarkdownBody(normalized), meta: {} };
    const meta = {};
    for (const line of match[1].split("\n")) {
      const index = line.indexOf(":");
      if (index < 0) continue;
      const key = line.slice(0, index).trim();
      const value = line
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key) meta[key] = value;
    }
    return { body: trimMarkdownBody(normalized.slice(match[0].length)), meta };
  }

  function trimMarkdownBody(value) {
    return String(value ?? "")
      .replace(/^(?:[ \t]*\n)+/g, "")
      .replace(/(?:\n[ \t]*)+$/g, "");
  }

  function markdownTitleCandidate(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function markdownTitleCandidateFromFileName(fileName) {
    const raw = String(fileName || "").trim();
    if (!raw) return "";
    const name = raw.split(/[?#]/)[0].split(/[\\/]/).filter(Boolean).pop() || raw;
    const stem = name.replace(/\.(md|markdown|mdown|mkd|txt)$/i, "");
    return markdownTitleCandidate(stem);
  }

  function markdownTitleCandidateFromOptions(options = {}) {
    const explicit = markdownTitleCandidate(
      options.titleCandidate || options.fallbackTitle || options.sourceTitle || ""
    );
    if (explicit) return explicit;
    return markdownTitleCandidateFromFileName(options.sourceFileName || options.fileName || "");
  }

  const SMART_PUNCT_MASK_OPEN = "\uE000";
  const SMART_PUNCT_MASK_CLOSE = "\uE001";
  const SMART_PUNCT_PROTECTED_PATTERNS = [
    /https?:\/\/[^\s<>"')）]+/gi,
    /\bwww\.[^\s<>"')）]+/gi,
    /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
    /(?:\.{0,2}\/|~\/|[A-Za-z]:[\\/])?[A-Za-z0-9_.-]+(?:[\\/][A-Za-z0-9_.-]+)+/g
  ];
  const SMART_PUNCT_CONTEXT_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
  const SMART_PUNCT_CJK_RUN = "[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af]";
  const SMART_PUNCT_ENUM_RE = new RegExp(`${SMART_PUNCT_CJK_RUN}{1,6}(?:,${SMART_PUNCT_CJK_RUN}{1,6}){2,}`, "gu");
  const SMART_PUNCT_CLOSERS = "”’）」』》】〉〕｝";
  const SMART_PUNCT_PAIR_FULL = new Map([
    [",", "，"],
    [";", "；"],
    [":", "："],
    ["!", "！"],
    ["?", "？"]
  ]);
  const SMART_PUNCT_CLAUSE_STARTERS = [
    "因为", "所以", "但是", "可是", "不过", "然后", "因此", "于是",
    "虽然", "如果", "而且", "并且", "接着", "同时", "由于", "除非",
    "使得", "导致", "从而"
  ];

  function isSmartPunctuationContextChar(char) {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return (
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef)
    );
  }

  function smartPunctuationPrevNonspace(text, index) {
    let cursor = index - 1;
    while (cursor >= 0 && /[ \t]/.test(text[cursor])) cursor -= 1;
    return cursor >= 0 ? text[cursor] : "";
  }

  function smartPunctuationNextNonspace(text, index) {
    let cursor = index + 1;
    while (cursor < text.length && /[ \t]/.test(text[cursor])) cursor += 1;
    return cursor < text.length ? text[cursor] : "";
  }

  function smartPunctuationPrevContentChar(text, index) {
    let cursor = index - 1;
    while (cursor >= 0 && (/[ \t]/.test(text[cursor]) || SMART_PUNCT_CLOSERS.includes(text[cursor]))) {
      cursor -= 1;
    }
    return cursor >= 0 ? text[cursor] : "";
  }

  function isAsciiDigit(char) {
    return char >= "0" && char <= "9";
  }

  function isAsciiWordContextChar(char) {
    return Boolean(char && /[A-Za-z0-9_]/.test(char));
  }

  function shouldUseSmartPunctuationFullwidth(previousContent, nextContent, { terminal = false } = {}) {
    const previousIsCjk = isSmartPunctuationContextChar(previousContent);
    const nextIsCjk = isSmartPunctuationContextChar(nextContent);
    if (previousIsCjk && nextIsCjk) return true;
    if (terminal && previousIsCjk && !isAsciiWordContextChar(nextContent)) return true;
    return false;
  }

  function smartPunctuationHasAdjacentContext(text, start, end = start) {
    return (
      isSmartPunctuationContextChar(smartPunctuationPrevNonspace(text, start)) ||
      isSmartPunctuationContextChar(smartPunctuationNextNonspace(text, end))
    );
  }

  function smartPunctuationHasWrapperContext(text, offset, matchLength, inner) {
    const before = offset > 0 ? text[offset - 1] : "";
    const after = offset + matchLength < text.length ? text[offset + matchLength] : "";
    return (
      isSmartPunctuationContextChar(before) ||
      isSmartPunctuationContextChar(after) ||
      SMART_PUNCT_CONTEXT_RE.test(inner)
    );
  }

  function smartPunctuationHasClauseStarter(match) {
    return match
      .split(",")
      .some((item) => SMART_PUNCT_CLAUSE_STARTERS.some((starter) => item.startsWith(starter)));
  }

  function smartPunctuationNeighborChars(text, index) {
    return {
      previous: index > 0 ? text[index - 1] : "",
      next: index + 1 < text.length ? text[index + 1] : ""
    };
  }

  function shouldPreserveAsciiNumericPunctuation(previous, next) {
    return isAsciiDigit(previous) && isAsciiDigit(next);
  }

  function smartPunctuationPairReplacement(text, index, char) {
    const { previous, next } = smartPunctuationNeighborChars(text, index);
    if ((char === "," || char === ":") && shouldPreserveAsciiNumericPunctuation(previous, next)) {
      return char;
    }

    const previousContent = smartPunctuationPrevContentChar(text, index);
    const nextContent = smartPunctuationNextNonspace(text, index);
    if (char === ":") {
      return shouldUseSmartPunctuationFullwidth(previousContent, nextContent) ? "：" : char;
    }

    const terminal = char === "!" || char === "?";
    return shouldUseSmartPunctuationFullwidth(previousContent, nextContent, { terminal })
      ? SMART_PUNCT_PAIR_FULL.get(char)
      : char;
  }

  function smartPunctuationPeriodReplacement(text, index) {
    const { previous, next } = smartPunctuationNeighborChars(text, index);
    if (shouldPreserveAsciiNumericPunctuation(previous, next) || previous === "." || next === ".") {
      return ".";
    }
    return shouldUseSmartPunctuationFullwidth(
      smartPunctuationPrevContentChar(text, index),
      smartPunctuationNextNonspace(text, index),
      { terminal: true }
    ) ? "。" : ".";
  }

  function smartPunctuationCharReplacement(text, index) {
    const char = text[index];
    if (SMART_PUNCT_PAIR_FULL.has(char)) return smartPunctuationPairReplacement(text, index, char);
    if (char === ".") return smartPunctuationPeriodReplacement(text, index);
    return char;
  }

  function normalizeSmartPunctuationValue(value, enabled) {
    return value && enabled ? normalizeSmartPunctuationText(value) : value;
  }

  function normalizeSmartPunctuationRanges(ranges = [], length = 0) {
    const normalized = [];
    const sorted = [...ranges].sort((left, right) => Number(left.start || 0) - Number(right.start || 0));
    for (const range of sorted) {
      const startValue = Number(range.start || 0);
      const start = Math.max(0, Math.min(length, startValue));
      const fallbackEnd = startValue + Number(range.length || 0);
      const rawEnd = Number(range.end == null ? fallbackEnd : range.end);
      const end = Math.max(start, Math.min(length, rawEnd));
      if (end <= start) continue;
      const previous = normalized[normalized.length - 1];
      if (previous && start <= previous.end) {
        previous.end = Math.max(previous.end, end);
      } else {
        normalized.push({ start, end });
      }
    }
    return normalized;
  }

  function normalizeSmartPunctuationWithProtectedRanges(value, ranges = []) {
    const source = String(value ?? "");
    const protectedRanges = normalizeSmartPunctuationRanges(ranges, source.length);
    if (!protectedRanges.length) return normalizeSmartPunctuationText(source);

    let output = "";
    let cursor = 0;
    for (const range of protectedRanges) {
      if (range.start > cursor) {
        output += normalizeSmartPunctuationText(source.slice(cursor, range.start));
      }
      output += source.slice(range.start, range.end);
      cursor = range.end;
    }
    if (cursor < source.length) {
      output += normalizeSmartPunctuationText(source.slice(cursor));
    }
    return output;
  }

  function smartPunctuationNormalizedOffset(text, offset, protectedRanges) {
    const prefixRanges = protectedRanges
      .filter((range) => range.start < offset)
      .map((range) => ({ start: range.start, end: Math.min(range.end, offset) }));
    return normalizeSmartPunctuationWithProtectedRanges(
      text.slice(0, offset),
      prefixRanges
    ).length;
  }

  function remapSmartPunctuationRange(range, text, protectedRanges) {
    const offset = Math.max(0, Number(range.offset || 0));
    const end = offset + Math.max(0, Number(range.length || 0));
    const mappedOffset = smartPunctuationNormalizedOffset(text, offset, protectedRanges);
    const mappedEnd = smartPunctuationNormalizedOffset(text, end, protectedRanges);
    return { ...range, offset: mappedOffset, length: Math.max(0, mappedEnd - mappedOffset) };
  }

  function normalizeSmartPunctuationInlineResult(result) {
    const codeRanges = result.inlineStyleRanges
      .filter((range) => range.style === "Code")
      .map((range) => ({ start: range.offset, end: range.offset + range.length }));
    const protectedRanges = normalizeSmartPunctuationRanges(codeRanges, result.text.length);
    return {
      ...result,
      text: normalizeSmartPunctuationWithProtectedRanges(result.text, protectedRanges),
      inlineStyleRanges: result.inlineStyleRanges.map((range) =>
        remapSmartPunctuationRange(range, result.text, protectedRanges)
      ),
      links: result.links.map((link) => remapSmartPunctuationRange(link, result.text, protectedRanges))
    };
  }

  function findInlineCodeRanges(text) {
    const ranges = [];
    const source = String(text ?? "");
    let cursor = 0;
    while (cursor < source.length) {
      const open = source.indexOf("`", cursor);
      if (open < 0) break;
      let markerLength = 1;
      while (source[open + markerLength] === "`") markerLength += 1;
      const marker = "`".repeat(markerLength);
      const close = source.indexOf(marker, open + markerLength);
      if (close < 0) {
        cursor = open + markerLength;
        continue;
      }
      ranges.push({ start: open, end: close + markerLength });
      cursor = close + markerLength;
    }
    return ranges;
  }

  function normalizeSmartPunctuationTableCell(value) {
    const source = String(value ?? "");
    return normalizeSmartPunctuationWithProtectedRanges(source, findInlineCodeRanges(source));
  }

  function maskSmartPunctuationProtectedText(text) {
    const store = [];
    const stash = (match) => {
      const index = store.length;
      store.push(match);
      return `${SMART_PUNCT_MASK_OPEN}${index}${SMART_PUNCT_MASK_CLOSE}`;
    };
    let masked = String(text ?? "");
    for (const pattern of SMART_PUNCT_PROTECTED_PATTERNS) {
      masked = masked.replace(pattern, stash);
    }
    return { masked, store };
  }

  function unmaskSmartPunctuationProtectedText(text, store) {
    const tokenPattern = new RegExp(`${SMART_PUNCT_MASK_OPEN}(\\d+)${SMART_PUNCT_MASK_CLOSE}`, "g");
    return String(text ?? "").replace(tokenPattern, (_, index) => store[Number(index)] || "");
  }

  function normalizeSmartPunctuationText(value) {
    const source = String(value ?? "");
    if (!source) return source;
    const { masked, store } = maskSmartPunctuationProtectedText(source);
    let text = masked.replace(/\u3000/g, " ");

    text = text.replace(/\.{3,}/g, (match, offset) =>
      smartPunctuationHasAdjacentContext(text, offset, offset + match.length - 1) ? "……" : match
    );

    text = text.replace(SMART_PUNCT_ENUM_RE, (match) => {
      if (smartPunctuationHasClauseStarter(match)) return match;
      return match.replace(/,/g, "、");
    });

    text = text.replace(/"([^"\n]*)"/g, (match, inner, offset) => {
      return smartPunctuationHasWrapperContext(text, offset, match.length, inner) ? `“${inner}”` : match;
    });

    text = text.replace(/'([^'\n]*)'/g, (match, inner) =>
      SMART_PUNCT_CONTEXT_RE.test(inner) ? `‘${inner}’` : match
    );

    text = text.replace(/\(([^()\n]*)\)/g, (match, inner, offset) => {
      return smartPunctuationHasWrapperContext(text, offset, match.length, inner) ? `（${inner}）` : match;
    });

    const output = [];
    for (let index = 0; index < text.length; index += 1) {
      output.push(smartPunctuationCharReplacement(text, index));
    }

    text = output.join("");
    text = text.replace(/-{2,}|—+/g, (match, offset) =>
      smartPunctuationHasAdjacentContext(text, offset, offset + match.length - 1) ? "——" : match
    );

    return unmaskSmartPunctuationProtectedText(text, store);
  }

  function parseMarkdown(markdown, options = {}) {
    const extractTitle = options.extractTitle !== false && options.setTitle !== false;
    const extractCover = options.extractCover !== false && options.setCover !== false;
    const smartPunctuation = options.smartPunctuation === true;
    const { body, meta } = parseFrontmatter(markdown);
    const titleFromMetaRaw = meta.title || meta.Title || meta["标题"] || null;
    const titleFromMeta = normalizeSmartPunctuationValue(titleFromMetaRaw, smartPunctuation);
    const titleCandidateRaw = extractTitle ? markdownTitleCandidateFromOptions(options) : "";
    const titleCandidate = normalizeSmartPunctuationValue(titleCandidateRaw, smartPunctuation);
    let cover = extractCover ? meta.cover || meta.Cover || meta["封面"] || null : null;
    if (cover) {
      cover = cover
        .replace(/^!\[\[|\]\]$/g, "")
        .replace(/^!\[[^\]]*\]\(([^)]+)\)$/u, "$1")
        .trim();
    }

    const spans = findSpecialBlocks(body, options);
    const segments = [];
    let cursor = 0;
    for (const span of spans) {
      if (span.start > cursor) {
        segments.push(...parseTextBlocks(body.slice(cursor, span.start), options));
      }
      segments.push(span.segment);
      cursor = span.end;
    }
    if (cursor < body.length) segments.push(...parseTextBlocks(body.slice(cursor), options));

    let title = extractTitle ? titleFromMeta : null;
    let titleSource = title ? "frontmatter" : "";
    if (extractTitle && !title) {
      const titleIndex = segments.findIndex(
        (segment) => segment.type === "text" && segment.kind === "header-one"
      );
      if (titleIndex >= 0) {
        title = segments[titleIndex].text || null;
        titleSource = title ? "heading" : "";
        segments.splice(titleIndex, 1);
      }
    }
    if (extractTitle && !title && titleCandidate) {
      title = titleCandidate;
      titleSource = "candidate";
    }

    if (extractCover && !cover) {
      cover = segments.find((segment) => segment.type === "image" && segment.source)?.source || null;
    }

    return {
      title,
      cover,
      segments,
      meta,
      titleFromMeta: Boolean(extractTitle && titleFromMeta),
      titleFromCandidate: Boolean(extractTitle && titleSource === "candidate"),
      titleSource
    };
  }

  function findSpecialBlocks(markdown, options = {}) {
    const spans = [];
    let match;

    spans.push(...findFencedCodeSpans(markdown));
    for (const span of findIndentedCodeSpans(markdown)) {
      if (!overlaps(spans, span.start)) spans.push(span);
    }

    const table = /^(?:[ \t]*\|.+\|[ \t]*\n)(?:[ \t]*\|[\s:|\-]+\|[ \t]*\n)((?:[ \t]*\|.+\|[ \t]*\n?)*)/gm;
    while ((match = table.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      const parsed = parseTable(match[0], options);
      if (!parsed) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "table", ...parsed }
      });
    }

    const divider = /^(?: {0,3})(?:-{3,}|\*{3,}|_{3,})(?:[ \t]*)$/gm;
    while ((match = divider.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "divider" }
      });
    }

    const statusUrl = /^(?: {0,3})https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d+)(?:[?#][^\s]*)?\s*$/gm;
    while ((match = statusUrl.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "tweet", tweetId: match[1] }
      });
    }

    for (const image of findMarkdownImageSpans(markdown)) {
      if (overlaps(spans, image.start)) continue;
      const source = image.source;
      const tweet = source.match(
        /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d+)/
      );
      spans.push({
        start: image.start,
        end: image.end,
        segment: tweet
          ? { type: "tweet", tweetId: tweet[1] }
          : { type: "image", source, alt: image.alt.trim() }
      });
    }

    const linkedTweet = /^[ \t]*\[([^\]]*)\]\(([^)]+)\)[ \t]*$/gm;
    while ((match = linkedTweet.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      const tweet = match[2]
        .trim()
        .match(/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d+)/);
      if (!tweet) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "tweet", tweetId: tweet[1] }
      });
    }

    // Obsidian embeds (![[file]]) can appear inline or inside list items, not just
    // on their own line. Match anywhere; the leading list marker/text before the
    // embed is handled by parseTextBlocks just like standard ![](...) images.
    // The optional "|alias" / "|size" suffix is stripped so only the file path remains.
    const obsidianImage = /!\[\[([^\]]+)\]\]/g;
    while ((match = obsidianImage.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "image", source: match[1].split("|")[0].trim(), alt: "" }
      });
    }

    // LaTeX 公式:块级 $$...$$ 优先,再行内 $...$(首尾非空格,避免误判 $5 这类货币)。
    // 代码块 / 已识别 span 内的 $ 由 overlaps 跳过。公式文本保留原样(不经内联处理)。
    const blockLatex = /\$\$([\s\S]+?)\$\$/g;
    while ((match = blockLatex.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      const formula = match[1].trim();
      if (!formula) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "latex", formula, display: true }
      });
    }
    const inlineLatex = /\$(?!\s)((?:\\.|[^$\n\\])+?)(?<!\s)\$/g;
    while ((match = inlineLatex.exec(markdown)) !== null) {
      if (overlaps(spans, match.index)) continue;
      const formula = match[1].trim();
      if (!formula) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        segment: { type: "latex", formula }
      });
    }

    return spans.sort((left, right) => left.start - right.start);
  }

  function findFencedCodeSpans(markdown) {
    const spans = [];
    const opener = /^(?: {0,3})(`{3,}|~{3,})([^\n]*)$/gm;
    let match;
    while ((match = opener.exec(markdown)) !== null) {
      const marker = match[1][0];
      const markerLength = match[1].length;
      const contentStart = markdown[opener.lastIndex] === "\n" ? opener.lastIndex + 1 : opener.lastIndex;
      const closer = new RegExp(`^(?: {0,3})${marker}{${markerLength},}[ \\t]*$`, "gm");
      closer.lastIndex = contentStart;
      const close = closer.exec(markdown);
      if (!close) continue;
      spans.push({
        start: match.index,
        end: close.index + close[0].length,
        segment: {
          type: "code",
          language: (match[2] || "").trim(),
          code: markdown.slice(contentStart, close.index).replace(/\n$/, "")
        }
      });
      opener.lastIndex = close.index + close[0].length;
    }
    return spans;
  }

  function markdownLineRecords(markdown) {
    const lines = [];
    let start = 0;
    while (start < markdown.length) {
      const newline = markdown.indexOf("\n", start);
      const textEnd = newline < 0 ? markdown.length : newline;
      lines.push({
        start,
        end: newline < 0 ? textEnd : newline + 1,
        text: markdown.slice(start, textEnd)
      });
      if (newline < 0) break;
      start = newline + 1;
    }
    return lines;
  }

  function isIndentedCodeLine(line) {
    return /^(?: {4}|\t)/.test(line?.text || "");
  }

  function unindentCodeLine(line) {
    return String(line?.text || "").replace(/^(?: {4}|\t)/, "");
  }

  function nextNonblankLine(lines, start) {
    for (let index = start; index < lines.length; index += 1) {
      if ((lines[index].text || "").trim()) return lines[index];
    }
    return null;
  }

  function isBlankLineInsideIndentedCode(lines, index) {
    const line = lines[index];
    return Boolean(line && !line.text.trim() && isIndentedCodeLine(nextNonblankLine(lines, index + 1)));
  }

  function findIndentedCodeSpans(markdown) {
    const lines = markdownLineRecords(markdown);
    const spans = [];
    let index = 0;
    while (index < lines.length) {
      if (!isIndentedCodeLine(lines[index])) {
        index += 1;
        continue;
      }
      const start = lines[index].start;
      const codeLines = [];
      let end = lines[index].end;
      while (index < lines.length) {
        const line = lines[index];
        if (isIndentedCodeLine(line)) {
          codeLines.push(unindentCodeLine(line));
          end = line.end;
          index += 1;
          continue;
        }
        if (isBlankLineInsideIndentedCode(lines, index)) {
          codeLines.push("");
          end = line.end;
          index += 1;
          continue;
        }
        break;
      }
      spans.push({
        start,
        end,
        segment: {
          type: "code",
          language: "",
          code: codeLines.join("\n").replace(/\n$/, "")
        }
      });
    }
    return spans;
  }

  function findMarkdownImageSpans(markdown) {
    const spans = [];
    let cursor = 0;
    while (cursor < markdown.length) {
      const start = markdown.indexOf("![", cursor);
      if (start < 0) break;
      const altEnd = findMarkdownClosingBracket(markdown, start + 2);
      if (altEnd < 0 || markdown[altEnd + 1] !== "(") {
        cursor = start + 2;
        continue;
      }
      const sourceStart = altEnd + 2;
      const sourceEnd = findMarkdownClosingParen(markdown, sourceStart);
      if (sourceEnd < 0) {
        cursor = altEnd + 1;
        continue;
      }
      spans.push({
        start,
        end: sourceEnd + 1,
        alt: markdown.slice(start + 2, altEnd),
        source: markdown.slice(sourceStart, sourceEnd).trim()
      });
      cursor = sourceEnd + 1;
    }
    return spans;
  }

  function findMarkdownClosingBracket(markdown, start) {
    for (let index = start; index < markdown.length; index += 1) {
      if (markdown[index] === "]" && !isEscaped(markdown, index)) return index;
    }
    return -1;
  }

  function findMarkdownClosingParen(markdown, start) {
    let depth = 0;
    for (let index = start; index < markdown.length; index += 1) {
      const char = markdown[index];
      if (isEscaped(markdown, index)) continue;
      if (char === "(") {
        depth += 1;
        continue;
      }
      if (char !== ")") continue;
      if (depth === 0) return index;
      depth -= 1;
    }
    return -1;
  }

  function isEscaped(text, index) {
    let count = 0;
    for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) count += 1;
    return count % 2 === 1;
  }

  function isLikelyMarkdownImageSource(source) {
    const value = String(source || "").trim();
    return /^(?:https?:|data:|\.{0,2}\/)/i.test(value) || /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)(?:[?#]|$)/i.test(value);
  }

  function overlaps(spans, index) {
    return spans.some((span) => index >= span.start && index < span.end);
  }

  function parseTable(block, options = {}) {
    const normalizeCell = options.smartPunctuation === true
      ? normalizeSmartPunctuationTableCell
      : (value) => value;
    const splitRow = (line) => {
      let cells = line.replace(/\\\|/g, "\0").split("|");
      if (cells[0]?.trim() === "") cells = cells.slice(1);
      if (cells[cells.length - 1]?.trim() === "") cells = cells.slice(0, -1);
      return cells.map((cell) => normalizeCell(cell.replace(/\0/g, "|").trim()));
    };

    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return null;

    const headers = splitRow(lines[0]);
    const alignmentRow = splitRow(lines[1]);
    if (!alignmentRow.every((cell) => /^:?-+:?$/.test(cell))) return null;

    const alignments = alignmentRow.map((cell) => {
      const left = cell.startsWith(":");
      const right = cell.endsWith(":");
      if (left && right) return "center";
      return right ? "right" : "left";
    });

    const rows = lines.slice(2).map((line) => {
      const cells = splitRow(line);
      while (cells.length < headers.length) cells.push("");
      return cells.slice(0, headers.length);
    });

    return { headers, alignments, rows };
  }

  function parseTextBlocks(text, options = {}) {
    const lines = text.split("\n");
    const segments = [];
    let paragraph = [];

    const flush = () => {
      const value = paragraph.join("\n").trim();
      if (value) segments.push(parseInline("unstyled", value, options));
      paragraph = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      let match;
      if (!trimmed) {
        flush();
        continue;
      }
      if ((match = trimmed.match(/^(#{1,6})\s+(.+)$/))) {
        flush();
        const kind = [
          "",
          "header-one",
          "header-two",
          "header-three",
          "header-four",
          "header-five",
          "header-six"
        ][match[1].length];
        segments.push(parseInline(kind, match[2].trim(), options));
        continue;
      }
      if ((match = trimmed.match(/^>\s+(.+)$/))) {
        flush();
        segments.push(parseInline("blockquote", match[1].trim(), options));
        continue;
      }
      if ((match = trimmed.match(/^[-*+]\s+(.+)$/))) {
        flush();
        segments.push(parseInline("unordered-list-item", match[1].trim(), options));
        continue;
      }
      if ((match = trimmed.match(/^\d+\.\s+(.+)$/))) {
        flush();
        segments.push(parseInline("ordered-list-item", match[1].trim(), options));
        continue;
      }
      paragraph.push(trimmed);
    }

    flush();
    return segments;
  }

  function parseInline(kind, source, options = {}) {
    const result = { type: "text", kind, text: "", inlineStyleRanges: [], links: [] };
    let cursor = 0;
    let plain = "";

    const appendPlain = () => {
      if (!plain) return;
      result.text += plain;
      plain = "";
    };
    const appendStyled = (text, styles) => {
      const value = String(text ?? "");
      const offset = result.text.length;
      result.text += value;
      for (const style of styles) {
        result.inlineStyleRanges.push({ offset, length: value.length, style });
      }
    };

    while (cursor < source.length) {
      const char = source[cursor];

      if (char === "[") {
        const link = source.slice(cursor).match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (link) {
          appendPlain();
          const label = String(link[1] ?? "");
          const offset = result.text.length;
          result.text += label;
          result.links.push({ offset, length: label.length, url: link[2] });
          cursor += link[0].length;
          continue;
        }
      }

      const inlineRules = [
        { marker: "***", styles: ["Bold", "Italic"] },
        { marker: "**", styles: ["Bold"] },
        { marker: "~~", styles: ["Strikethrough"] }
      ];
      let matched = false;
      for (const rule of inlineRules) {
        if (!source.startsWith(rule.marker, cursor)) continue;
        const end = source.indexOf(rule.marker, cursor + rule.marker.length);
        if (end <= cursor) continue;
        appendPlain();
        appendStyled(source.slice(cursor + rule.marker.length, end), rule.styles);
        cursor = end + rule.marker.length;
        matched = true;
        break;
      }
      if (matched) continue;

      if ((char === "*" || char === "_") && source[cursor + 1] !== char) {
        const end = source.indexOf(char, cursor + 1);
        if (end > cursor && source[end + 1] !== char) {
          appendPlain();
          appendStyled(source.slice(cursor + 1, end), ["Italic"]);
          cursor = end + 1;
          continue;
        }
      }

      if (char === "`") {
        const end = source.indexOf("`", cursor + 1);
        if (end > cursor) {
          appendPlain();
          appendStyled(source.slice(cursor + 1, end), ["Code"]);
          cursor = end + 1;
          continue;
        }
      }

      plain += char;
      cursor += 1;
    }

    appendPlain();
    return options.smartPunctuation === true ? normalizeSmartPunctuationInlineResult(result) : result;
  }

  function segmentCounts(segments) {
    return segments.reduce(
      (counts, segment) => {
        counts[segment.type] = (counts[segment.type] || 0) + 1;
        return counts;
      },
      { text: 0, image: 0, table: 0, tweet: 0, code: 0, divider: 0, latex: 0 }
    );
  }

  function applyLimits(segments, limits) {
    if (!limits) return { segments, dropped: null };

    const output = [];
    const counters = { image: 0, table: 0, tweet: 0 };
    const dropped = { images: 0, tables: 0, tweets: 0 };

    for (const segment of segments) {
      if (segment.type === "image") {
        counters.image += 1;
        if (counters.image > limits.maxImagesPerImport) {
          dropped.images += 1;
          output.push(textSegment(`![${segment.alt || ""}](${segment.source})`));
          continue;
        }
      }
      if (segment.type === "table") {
        counters.table += 1;
        if (counters.table > limits.maxTablesPerImport) {
          dropped.tables += 1;
          output.push(textSegment(tableToMarkdown(segment)));
          continue;
        }
      }
      if (segment.type === "tweet") {
        counters.tweet += 1;
        if (counters.tweet > limits.maxTweetsPerImport) {
          dropped.tweets += 1;
          output.push(textSegment(`https://twitter.com/i/web/status/${segment.tweetId}`));
          continue;
        }
      }
      output.push(segment);
    }

    if (limits.appendSignature) {
      output.push(textSegment("Published with xPoster"));
    }

    const hasDropped = dropped.images || dropped.tables || dropped.tweets;
    return { segments: output, dropped: hasDropped ? dropped : null };
  }

  function textSegment(text) {
    return {
      type: "text",
      kind: "unstyled",
      text,
      inlineStyleRanges: [],
      links: []
    };
  }

  function escapeTableCell(value) {
    return String(value ?? "")
      .replace(/\r?\n/g, " ")
      .replace(/\|/g, "\\|");
  }

  function tableToMarkdown(table) {
    const lines = [];
    lines.push(`| ${table.headers.map(escapeTableCell).join(" | ")} |`);
    lines.push(
      `| ${table.alignments
        .map((alignment) => (alignment === "center" ? ":---:" : alignment === "right" ? "---:" : ":---"))
        .join(" | ")} |`
    );
    for (const row of table.rows) lines.push(`| ${row.map(escapeTableCell).join(" | ")} |`);
    return lines.join("\n");
  }

  function imageSourcesMatch(left, right) {
    const leftRaw = String(left || "").trim();
    const rightRaw = String(right || "").trim();
    if (!leftRaw || !rightRaw) return false;
    if (leftRaw === rightRaw) return true;
    try {
      const leftUrl = new URL(leftRaw, "https://xposter.local");
      const rightUrl = new URL(rightRaw, "https://xposter.local");
      leftUrl.hash = "";
      rightUrl.hash = "";
      return decodeURIComponent(leftUrl.href) === decodeURIComponent(rightUrl.href);
    } catch {
      return leftRaw.split("#")[0] === rightRaw.split("#")[0];
    }
  }

  function buildPastePlan(segments, imageResults = new Map(), tableResults = new Map(), options = {}) {
    const prefix = `__XPOSTER_${Math.random().toString(36).slice(2, 7)}_`;
    let index = 0;
    const html = [];
    const blocks = [];
    const plan = [];
    let listTag = null;
    let listItems = [];

    const marker = (type) => `${prefix}${type}_${index++}__`;
    const addBlock = (type, text, segment = null) => {
      blocks.push({
        type: type || "unstyled",
        text: String(text ?? "").replace(/\n+/g, " "),
        inlineStyleRanges: (segment?.inlineStyleRanges || []).map((range) => ({ ...range })),
        links: (segment?.links || []).map((link) => ({ ...link }))
      });
    };
    const flushList = () => {
      if (!listTag) return;
      html.push(`<${listTag}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${listTag}>`);
      listTag = null;
      listItems = [];
    };
    const addImageOperation = (segment, result, { markerType = "IMAGE", coverOnly = false } = {}) => {
      const id = marker(markerType);
      html.push(`<p>${id}</p>`);
      addBlock("unstyled", id);
      plan.push({
        marker: id,
        op: {
          type: "image",
          file: {
            base64: result.base64,
            mime: result.mime,
            fileName: result.fileName,
            alt: segment.alt || ""
          },
          source: segment.source,
          fallbackText: coverOnly ? "" : imageFallbackMarkdown(segment),
          coverOnly
        }
      });
    };

    for (const segment of segments) {
      if (segment.type === "text") {
        const rendered = renderInlineHtml(segment) || "<br>";
        addBlock(segment.kind, segment.text || "", segment);
        if (segment.kind === "unordered-list-item" || segment.kind === "ordered-list-item") {
          const nextTag = segment.kind === "unordered-list-item" ? "ul" : "ol";
          if (listTag && listTag !== nextTag) flushList();
          listTag = nextTag;
          listItems.push(rendered);
          continue;
        }
        flushList();
        const tag = BLOCK_TAGS[segment.kind] || "p";
        html.push(`<${tag}>${rendered}</${tag}>`);
        continue;
      }

      flushList();

      if (segment.type === "divider") {
        const id = marker("DIVIDER");
        html.push(`<p>${id}</p>`);
        addBlock("unstyled", id);
        plan.push({
          marker: id,
          op: { type: "atomic", entityType: "DIVIDER", data: {}, mutability: "IMMUTABLE" }
        });
        continue;
      }

      if (segment.type === "code") {
        const id = marker("CODE");
        const markdown = `\`\`\`${segment.language || ""}\n${segment.code || ""}\n\`\`\``;
        html.push(`<p>${id}</p>`);
        addBlock("unstyled", id);
        plan.push({
          marker: id,
          op: { type: "atomic", entityType: "MARKDOWN", data: { markdown }, mutability: "MUTABLE" }
        });
        continue;
      }

      if (segment.type === "tweet") {
        const id = marker("TWEET");
        const url = `https://twitter.com/i/web/status/${segment.tweetId}`;
        html.push(`<p>${id}</p>`);
        addBlock("unstyled", id);
        plan.push({
          marker: id,
          op: {
            type: "atomic",
            entityType: "TWEET",
            data: { url, tweetId: segment.tweetId },
            mutability: "IMMUTABLE"
          }
        });
        continue;
      }

      if (segment.type === "latex") {
        const id = marker("LATEX");
        html.push(`<p>${id}</p>`);
        addBlock("unstyled", id);
        // LATEX 与其他 atomic 不同:公式文本放在 block.text(经 op.text 传入),entity.data 为空。
        plan.push({
          marker: id,
          op: { type: "atomic", entityType: "LATEX", data: {}, mutability: "IMMUTABLE", text: segment.formula }
        });
        continue;
      }

      if (segment.type === "image") {
        const result = imageResults.get(segment);
        if (result?.ok) {
          addImageOperation(segment, result);
        } else {
          const fallback = imageFallbackMarkdown(segment);
          html.push(`<p>${escapeHtml(fallback)}</p>`);
          addBlock("unstyled", fallback);
        }
        continue;
      }

      if (segment.type === "table") {
        const id = marker("TABLE");
        const markdown = tableToMarkdown(segment);
        html.push(`<p>${id}</p>`);
        addBlock("unstyled", id);
        plan.push({
          marker: id,
          op: { type: "atomic", entityType: "MARKDOWN", data: { markdown }, mutability: "MUTABLE" }
        });
      }
    }

    const coverSource = String(options.coverSource || "").trim();
    const coverResult = options.coverResult || null;
    const coverAlreadyInBody = coverSource && segments.some(
      (segment) => segment.type === "image" && imageSourcesMatch(segment.source, coverSource)
    );
    if (coverSource && coverResult?.ok && !coverAlreadyInBody) {
      addImageOperation(
        { type: "image", source: coverSource, alt: "cover" },
        coverResult,
        { markerType: "COVER", coverOnly: true }
      );
    }

    flushList();
    return { html: html.join(""), plain: blocksToPlainText(blocks), blocks, plan, markerPrefix: prefix };
  }

  function imageFallbackMarkdown(segment = {}) {
    const rawAlt = String(segment.alt || guessFileName(segment.source, "image") || "image")
      .replace(/[\]\r\n]+/g, " ")
      .trim();
    const alt = rawAlt || "image";
    const source = String(segment.source || "").trim();
    if (!source || source.startsWith("data:")) return `[image unavailable: ${alt}]`;
    return `![${alt}](${source})`;
  }

  function renderInlineHtml(segment) {
    const text = segment.text || "";
    const openAt = new Array(text.length + 1).fill(null).map(() => []);
    const closeAt = new Array(text.length + 1).fill(null).map(() => []);

    for (const range of segment.inlineStyleRanges || []) {
      const tag = STYLE_TAGS[range.style];
      if (!tag) continue;
      openAt[range.offset]?.push(`<${tag}>`);
      closeAt[range.offset + range.length]?.unshift(`</${tag}>`);
    }

    for (const link of segment.links || []) {
      const href = escapeHtml(link.url);
      openAt[link.offset]?.push(`<a href="${href}">`);
      closeAt[link.offset + link.length]?.unshift("</a>");
    }

    let output = "";
    for (let i = 0; i < text.length; i += 1) {
      output += closeAt[i].join("");
      output += openAt[i].join("");
      output += escapeHtml(text[i]);
    }
    output += closeAt[text.length].join("");
    return output;
  }

  function blocksToPlainText(blocks) {
    return blocks
      .map((block) => String(block?.text || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  function isLocalImageSource(source) {
    return Boolean(
      source &&
        typeof source === "string" &&
        !/^https?:\/\//i.test(source) &&
        !source.startsWith("data:")
    );
  }

  function isAbsoluteLocalImageSource(source) {
    return /^(?:file:\/\/\/?|[a-zA-Z]:[\\/]|\/)/.test(String(source || ""));
  }

  function parseLocalImagePath(source) {
    if (isAbsoluteLocalImageSource(source)) {
      return { ok: false, error: "Absolute paths outside the selected folder are not supported", source };
    }

    const cleanPath = String(source || "")
      .replace(/\\/g, "/")
      .split(/[?#]/)[0]
      .replace(/^\.\/+/, "")
      .replace(/\/+/g, "/")
      .replace(/^\/+/, "");

    if (/^[a-zA-Z]:\//.test(cleanPath)) {
      return { ok: false, error: "Absolute paths outside the selected folder are not supported", source };
    }

    const parts = cleanPath
      .split("/")
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part;
        }
      })
      .filter((part) => part && part !== ".");

    if (!parts.length || parts[parts.length - 1] === "..") {
      return { ok: false, error: "Local image path is empty", source };
    }

    let depth = 0;
    for (const part of parts) {
      if (part === "..") depth -= 1;
      else depth += 1;
      if (depth < 0) return { ok: false, error: "Path escapes the selected folder", source };
    }

    return { ok: true, parts, source };
  }

  function localImageRootNames(rootNames) {
    const values = Array.isArray(rootNames) ? rootNames : [rootNames];
    return values
      .map((name) => String(name || "").trim())
      .filter(Boolean);
  }

  function localImagePathPartMatchesName(part, name) {
    return String(part || "").normalize("NFC").toLowerCase() === String(name || "").normalize("NFC").toLowerCase();
  }

  function localImagePathCandidatesFromParts(parts, rootNames = []) {
    const candidates = [];
    const seen = new Set();
    const add = (candidate) => {
      if (!candidate.length) return;
      const key = candidate.join("\0");
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push(candidate);
    };

    add(parts);
    if (parts.length <= 1) return candidates;

    const names = localImageRootNames(rootNames);
    for (let index = 0; index < parts.length - 1; index += 1) {
      if (names.some((name) => localImagePathPartMatchesName(parts[index], name))) {
        add(parts.slice(index + 1));
      }
    }
    return candidates;
  }

  function localImagePathCandidates(source, rootNames = []) {
    const parsed = parseLocalImagePath(source);
    return parsed.ok ? localImagePathCandidatesFromParts(parsed.parts, rootNames) : [];
  }

  function guessFileName(source, fallback = "image") {
    if (typeof source !== "string") return `${fallback}.png`;
    if (source.startsWith("data:")) return `${fallback}.png`;
    try {
      const url = new URL(source, "https://xposter.local");
      const name = url.pathname.split("/").filter(Boolean).pop();
      return name && /\.[a-z0-9]{2,5}$/i.test(name) ? name : `${fallback}.png`;
    } catch {
      const name = source.split(/[?#]/)[0].split(/[\\/]/).filter(Boolean).pop();
      return name && /\.[a-z0-9]{2,5}$/i.test(name) ? name : `${fallback}.png`;
    }
  }

  function extensionMime(fileName, fallback = "image/png") {
    const ext = String(fileName || "").split(".").pop()?.toLowerCase();
    return (
      {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
        bmp: "image/bmp",
        avif: "image/avif"
      }[ext] || fallback
    );
  }

  function isSupportedImageMime(mime) {
    return SUPPORTED_IMAGE_MIME_TYPES.has(String(mime || "").split(";")[0].trim().toLowerCase());
  }

  function isPrivateImageHost(hostname) {
    const host = String(hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
    if (!host || /^(localhost|.+\.localhost)$/i.test(host)) return true;
    if (host === "::" || host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(host) || /^fe80:/i.test(host)) return true;
    const parts = ipv4PartsFromHost(host);
    return parts ? isPrivateIpv4Parts(parts) : false;
  }

  function ipv4PartsFromHost(host) {
    const dotted = host.split(".").map((part) => Number(part));
    if (dotted.length === 4 && dotted.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
      return dotted;
    }
    const mapped = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (!mapped) return null;
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
    return [high >> 8, high & 255, low >> 8, low & 255];
  }

  function isPrivateIpv4Parts(parts) {
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  function isRemoteHttpImageSource(source) {
    try {
      const url = new URL(String(source || "").trim());
      return (url.protocol === "https:" || url.protocol === "http:") && !isPrivateImageHost(url.hostname);
    } catch {
      return false;
    }
  }

  function base64ByteLength(base64) {
    const clean = String(base64 || "").replace(/\s+/g, "");
    const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
  }

  function validateImagePayload(mime, bytes, maxBytes = MAX_IMAGE_BYTES) {
    if (!isSupportedImageMime(mime)) return { ok: false, error: `Unsupported image type: ${mime || "unknown"}` };
    if (bytes > maxBytes) return { ok: false, error: `Image is too large (${bytes} bytes)` };
    return { ok: true };
  }

  function parseDataUri(uri, options = {}) {
    const match = String(uri || "").match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
    if (!match) return { ok: false, error: "Invalid data URI" };
    const mime = (match[1] || "image/png").toLowerCase();
    const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : MAX_IMAGE_BYTES;
    if (match[2]) {
      const base64 = match[3].replace(/\s+/g, "");
      const bytes = base64ByteLength(base64);
      const valid = validateImagePayload(mime, bytes, maxBytes);
      return valid.ok ? { ok: true, mime, base64, bytes } : valid;
    }
    try {
      const base64 = btoa(unescape(encodeURIComponent(decodeURIComponent(match[3]))));
      const bytes = base64ByteLength(base64);
      const valid = validateImagePayload(mime, bytes, maxBytes);
      return valid.ok ? { ok: true, mime, base64, bytes } : valid;
    } catch {
      return { ok: false, error: "Could not decode data URI" };
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let output = "";
    const chunkSize = 32768;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      output += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
    }
    return btoa(output);
  }

  async function openLocalDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LOCAL_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(LOCAL_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveVaultHandle(handle) {
    const db = await openLocalDb();
    const store = db.transaction(LOCAL_STORE, "readwrite").objectStore(LOCAL_STORE);
    await requestToPromise(store.put({ handle, name: handle.name, savedAt: Date.now() }, VAULT_KEY));
  }

  async function getVaultRecord() {
    const db = await openLocalDb();
    const store = db.transaction(LOCAL_STORE, "readonly").objectStore(LOCAL_STORE);
    return (await requestToPromise(store.get(VAULT_KEY))) || null;
  }

  async function clearVaultHandle() {
    const db = await openLocalDb();
    const store = db.transaction(LOCAL_STORE, "readwrite").objectStore(LOCAL_STORE);
    await requestToPromise(store.delete(VAULT_KEY));
  }

  async function ensureReadPermission(handle) {
    const options = { mode: "read" };
    if (typeof handle?.queryPermission === "function" && (await handle.queryPermission(options)) === "granted") {
      return "granted";
    }
    if (typeof handle?.requestPermission === "function") return handle.requestPermission(options);
    return "denied";
  }

  async function queryReadPermission(handle) {
    if (typeof handle?.queryPermission !== "function") return "denied";
    return handle.queryPermission({ mode: "read" });
  }

  async function resolveLocalImage(source) {
    if (!isLocalImageSource(source)) return { ok: false, error: "Not a local image source" };
    const record = await getVaultRecord();
    if (!record?.handle) return { ok: false, error: "No local image folder selected" };
    if ((await queryReadPermission(record.handle)) !== "granted") {
      return { ok: false, error: "Local image folder permission expired" };
    }

    const parsedPath = parseLocalImagePath(source);
    if (!parsedPath.ok) return parsedPath;

    const candidates = localImagePathCandidatesFromParts(parsedPath.parts, [record.name, record.handle.name]);
    let lastError = null;

    for (const parts of candidates) {
      try {
        let directory = record.handle;
        for (const part of parts.slice(0, -1)) {
          if (part === "..") throw new Error("Cannot traverse above selected folder");
          directory = await directory.getDirectoryHandle(part, { create: false });
        }
        const file = await (await directory.getFileHandle(parts[parts.length - 1], { create: false })).getFile();
        const mime = file.type || extensionMime(file.name);
        const valid = validateImagePayload(mime, file.size || 0);
        if (!valid.ok) return { ...valid, source };
        const buffer = await file.arrayBuffer();
        return {
          ok: true,
          base64: arrayBufferToBase64(buffer),
          mime,
          fileName: file.name,
          bytes: buffer.byteLength,
          source
        };
      } catch (error) {
        lastError = error;
      }
    }

    return { ok: false, error: lastError?.message || "Local file not found", source };
  }

  const api = {
    looksLikeMarkdown,
    parseMarkdown,
    markdownTitleCandidate,
    markdownTitleCandidateFromFileName,
    segmentCounts,
    applyLimits,
    buildPastePlan,
    escapeHtml,
    imageSourcesMatch,
    isLocalImageSource,
    isAbsoluteLocalImageSource,
    localImagePathCandidates,
    guessFileName,
    extensionMime,
    isSupportedImageMime,
    isPrivateImageHost,
    isRemoteHttpImageSource,
    parseDataUri,
    arrayBufferToBase64,
    toTraditionalChinese,
    saveVaultHandle,
    getVaultRecord,
    clearVaultHandle,
    ensureReadPermission,
    queryReadPermission,
    resolveLocalImage
  };

  if (typeof window !== "undefined") {
    window.xPosterShared = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();


  const shared =
    (typeof window !== "undefined" && window.xPosterShared) ||
    (typeof unsafeWindow !== "undefined" && unsafeWindow && unsafeWindow.xPosterShared) ||
    null;

  if (!shared) {
    console.error("[xPoster US] xPosterShared 未就绪,脚本无法运行");
    return;
  }

  // ===========================================================================
  // 常量 / 工具
  // ===========================================================================
  const LOG = "[xPoster US]";
  const ID = "__xposter_us_";
  const CHANNEL_TO_MAIN = "xposter";
  const CHANNEL_FROM_MAIN = "xposter-main";
  const SETTING_SMART_PUNCT = "xposter_us_smart_punct";
  const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

  const pageWindow = (typeof unsafeWindow !== "undefined" && unsafeWindow) || window;

  function gmGet(key, fallback) {
    try {
      if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
    } catch (error) {
      console.warn(LOG, "GM_getValue failed", error);
    }
    return fallback;
  }

  function gmSet(key, value) {
    try {
      if (typeof GM_setValue === "function") GM_setValue(key, value);
    } catch (error) {
      console.warn(LOG, "GM_setValue failed", error);
    }
  }

  // ===========================================================================
  // 平台适配层:远程图片下载(GM_xmlhttpRequest)
  // ===========================================================================

  // 仿 src/background.js:对 COS 风格失效签名 URL,去掉未签名的 response-* 查询参数重试。
  function removeUnsignedResponseOverrideParams(url) {
    let parsed = null;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (!parsed.searchParams.has("q-signature")) return null;
    const signedParams = new Set(
      (parsed.searchParams.get("q-url-param-list") || "")
        .split(";")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    );
    const queryIndex = url.indexOf("?");
    if (queryIndex < 0) return null;
    const hashIndex = url.indexOf("#", queryIndex);
    const base = url.slice(0, queryIndex + 1);
    const query = url.slice(queryIndex + 1, hashIndex < 0 ? undefined : hashIndex);
    const hash = hashIndex < 0 ? "" : url.slice(hashIndex);
    const parts = query.split("&").filter(Boolean);
    const filtered = parts.filter((part) => {
      const rawName = part.split("=")[0] || "";
      let name = rawName.toLowerCase();
      try {
        name = decodeURIComponent(rawName).toLowerCase();
      } catch {}
      return !(name.startsWith("response-") && !signedParams.has(name));
    });
    if (filtered.length === parts.length) return null;
    return `${base}${filtered.join("&")}${hash}`;
  }

  function gmRequestArrayBuffer(url) {
    return new Promise((resolve) => {
      if (typeof GM_xmlhttpRequest !== "function") {
        resolve({ ok: false, error: "GM_xmlhttpRequest 不可用" });
        return;
      }
      try {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          responseType: "arraybuffer",
          timeout: 15000,
          onload: (response) => {
            const status = Number(response.status || 0);
            if (status < 200 || status >= 300) {
              resolve({ ok: false, status, error: `HTTP ${status}` });
              return;
            }
            const headers = String(response.responseHeaders || "");
            const mimeMatch = headers.match(/content-type:\s*([^\r\n;]+)/i);
            const mime = mimeMatch ? mimeMatch[1].trim().toLowerCase() : "";
            resolve({ ok: true, buffer: response.response, mime });
          },
          onerror: () => resolve({ ok: false, error: "网络请求失败" }),
          ontimeout: () => resolve({ ok: false, error: "图片下载超时" })
        });
      } catch (error) {
        resolve({ ok: false, error: error?.message || String(error) });
      }
    });
  }

  async function downloadRemoteImage(url) {
    if (!shared.isRemoteHttpImageSource(url)) {
      return { ok: false, error: "不是可下载的公网 http(s) 图片地址(或指向内网)" };
    }
    const candidates = [url];
    const repaired = removeUnsignedResponseOverrideParams(url);
    if (repaired && repaired !== url) candidates.push(repaired);

    let lastError = "图片下载失败";
    for (const candidate of candidates) {
      const result = await gmRequestArrayBuffer(candidate);
      if (!result.ok) {
        lastError = result.error || lastError;
        continue;
      }
      const buffer = result.buffer;
      if (!buffer || !buffer.byteLength) {
        lastError = "下载到的图片为空";
        continue;
      }
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return { ok: false, error: `图片过大(${buffer.byteLength} 字节)` };
      }
      const fileName = shared.guessFileName(url, "image");
      let mime = result.mime || "";
      if (!shared.isSupportedImageMime(mime)) mime = shared.extensionMime(fileName, mime || "image/png");
      if (!shared.isSupportedImageMime(mime)) {
        return { ok: false, error: `不支持的图片类型:${mime || "unknown"}` };
      }
      return {
        ok: true,
        base64: shared.arrayBufferToBase64(buffer),
        mime,
        fileName,
        bytes: buffer.byteLength,
        source: url
      };
    }
    return { ok: false, error: lastError, source: url };
  }

  // ===========================================================================
  // 引擎注入:把 ENGINE_SRC(main-world.js)注入页面真实上下文,只注入一次。
  // ===========================================================================
  let engineInjected = false;
  let engineReady = false;
  const engineReadyWaiters = [];

  function injectEngine() {
    if (engineInjected) return;
    engineInjected = true;
    try {
      const script = document.createElement("script");
      script.textContent = ENGINE_SRC;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (error) {
      console.error(LOG, "注入引擎失败", error);
      engineInjected = false;
    }
  }

  function postToEngine(message) {
    const payload = { source: CHANNEL_TO_MAIN, ...message };
    try {
      pageWindow.postMessage(payload, "*");
    } catch (error) {
      console.warn(LOG, "postMessage to engine failed, falling back to window", error);
      window.postMessage(payload, "*");
    }
  }

  function ensureEngineReady(timeoutMs = 8000) {
    if (engineReady) return Promise.resolve(true);
    injectEngine();
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      engineReadyWaiters.push(done);
      // 引擎启动会主动 post "ready";再 poke 一次 "ready?" 以防错过首帧。
      postToEngine({ kind: "ready?" });
      const poke = setInterval(() => postToEngine({ kind: "ready?" }), 500);
      setTimeout(() => {
        clearInterval(poke);
        done(engineReady);
      }, timeoutMs);
      const original = done;
      engineReadyWaiters[engineReadyWaiters.length - 1] = (value) => {
        clearInterval(poke);
        original(value);
      };
    });
  }

  // 引擎 -> 沙箱 消息总线
  const engineListeners = new Set();
  window.addEventListener("message", (event) => {
    if (event.source !== window && event.source !== pageWindow) return;
    const data = event.data;
    if (!data || data.source !== CHANNEL_FROM_MAIN) return;
    if (data.kind === "ready") {
      engineReady = true;
      while (engineReadyWaiters.length) {
        const waiter = engineReadyWaiters.shift();
        try {
          waiter(true);
        } catch {}
      }
    }
    for (const listener of engineListeners) {
      try {
        listener(data);
      } catch (error) {
        console.warn(LOG, "engine listener failed", error);
      }
    }
  });

  // ===========================================================================
  // 编排:解析 Markdown -> 准备媒体 -> buildPastePlan -> 发给引擎 -> 监听进度
  // ===========================================================================
  let importRunning = false;

  async function prepareImageMap(segments, statusCb) {
    const imageMap = new Map();
    const imageSegments = segments.filter((segment) => segment.type === "image");
    let index = 0;
    for (const segment of imageSegments) {
      index += 1;
      const src = segment.source || "";
      statusCb(`准备图片 ${index}/${imageSegments.length}...`);
      let result;
      if (shared.isLocalImageSource(src)) {
        result = await shared.resolveLocalImage(src);
      } else if (src.startsWith("data:")) {
        result = shared.parseDataUri(src);
        if (result.ok) {
          result = {
            ok: true,
            base64: result.base64,
            mime: result.mime,
            fileName: shared.guessFileName(src, "image"),
            bytes: result.bytes,
            source: src
          };
        }
      } else {
        result = await downloadRemoteImage(src);
      }
      imageMap.set(segment, result);
    }
    return imageMap;
  }

  async function resolveCover(coverSource, segments, imageMap) {
    if (!coverSource) return null;
    // 若封面已是正文图片,复用其结果。
    for (const segment of segments) {
      if (segment.type === "image" && shared.imageSourcesMatch(segment.source, coverSource)) {
        const existing = imageMap.get(segment);
        if (existing) return existing;
      }
    }
    if (shared.isLocalImageSource(coverSource)) return shared.resolveLocalImage(coverSource);
    if (coverSource.startsWith("data:")) {
      const parsed = shared.parseDataUri(coverSource);
      if (!parsed.ok) return parsed;
      return {
        ok: true,
        base64: parsed.base64,
        mime: parsed.mime,
        fileName: shared.guessFileName(coverSource, "cover"),
        bytes: parsed.bytes,
        source: coverSource
      };
    }
    return downloadRemoteImage(coverSource);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function isEditorRoute() {
    return /\/compose\/articles\/edit\//.test(location.pathname);
  }
  function findEditor() {
    const el = document.querySelector(".public-DraftEditor-content");
    return el && el.getBoundingClientRect().width > 200 ? el : null;
  }
  function waitForEditor(timeoutMs) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (findEditor()) return resolve(true);
        if (Date.now() > deadline) return resolve(false);
        setTimeout(tick, 250);
      };
      tick();
    });
  }
  function waitForUrl(pattern, timeoutMs) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (pattern.test(location.href) && !isEditorRoute()) return resolve(true);
        if (Date.now() > deadline) return resolve(false);
        setTimeout(tick, 200);
      };
      tick();
    });
  }
  // X 的「新建文章」按钮:优先空状态按钮,其次已知的加号 svg 路径,最后按 aria-label。
  function findCreateButton() {
    const labels = ["create", "compose", "write", "撰写", "新建", "创建", "新規", "作成"];
    const emptyStateNode = document.querySelector("[data-testid='empty_state_button_text']");
    const emptyStateButton = emptyStateNode && emptyStateNode.closest("a, button, [role='button']");
    if (emptyStateButton) return emptyStateButton;
    for (const path of document.querySelectorAll("button svg path")) {
      if ((path.getAttribute("d") || "").startsWith("M14.543")) {
        const button = path.closest("button");
        if (button) return button;
      }
    }
    for (const button of document.querySelectorAll("button, a[role='button']")) {
      const aria = (button.getAttribute("aria-label") || "").toLowerCase().trim();
      if (labels.includes(aria)) return button;
    }
    return null;
  }
  async function clickCreateButton() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const button = findCreateButton();
      if (button) { button.click(); return true; }
      await sleep(250);
    }
    throw new Error("找不到 X 的「新建文章」按钮");
  }
  function goToArticleList() {
    try {
      pageWindow.history.pushState(null, "", "/compose/articles");
      pageWindow.dispatchEvent(new pageWindow.PopStateEvent("popstate"));
    } catch {
      history.pushState(null, "", "/compose/articles");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }
  async function navigateToArticleList() {
    const link = Array.from(
      document.querySelectorAll("a[href='/compose/articles'], a[href$='/compose/articles']")
    ).find((el) => el.offsetParent);
    if (link) {
      link.click();
      if (await waitForUrl(/\/compose\/articles(?:$|[/?#])/, 5000)) return;
    }
    goToArticleList();
    await waitForUrl(/\/compose\/articles(?:$|[/?#])/, 4000);
  }
  // 当前没有具体文章编辑器时,自动进入文章列表并新建一篇,等编辑器出现。
  async function ensureEditorReady() {
    if (isEditorRoute() && findEditor()) return true;
    if (isEditorRoute()) await navigateToArticleList();
    if (!/\/compose\/articles(?:$|[/?#])/.test(location.pathname)) {
      await navigateToArticleList();
    }
    await clickCreateButton();
    return waitForEditor(20000);
  }

  async function runImport(markdown, options, ui) {
    if (importRunning) return;
    if (!markdown || !markdown.trim()) {
      ui.setStatus("请先粘贴或选择 Markdown 内容", "warn");
      return;
    }
    importRunning = true;
    ui.setBusy(true);
    try {
      ui.setStatus("准备文章编辑器...");
      if (!(await ensureEditorReady())) {
        ui.setStatus("未能进入 X 文章编辑器,请先手动新建/打开一篇文章再写入", "error");
        return;
      }
      ui.setStatus("解析 Markdown...");
      const parsed = shared.parseMarkdown(markdown, {
        smartPunctuation: options.smartPunctuation === true,
        setTitle: true,
        setCover: true,
        fallbackTitle: options.fallbackTitle || ""
      });
      const segments = parsed.segments;

      const imageMap = await prepareImageMap(segments, (text) => ui.setStatus(text));

      // 提示本地图片授权失败
      let localNeedsAuth = false;
      for (const [segment, result] of imageMap.entries()) {
        if (!result?.ok && shared.isLocalImageSource(segment.source || "")) {
          if (/folder|permission|未选|权限|not found|selected/i.test(result?.error || "")) {
            localNeedsAuth = true;
          }
        }
      }

      ui.setStatus("准备封面...");
      const coverResult = await resolveCover(parsed.cover, segments, imageMap);

      const plan = shared.buildPastePlan(segments, imageMap, new Map(), {
        coverSource: parsed.cover || "",
        coverResult
      });
      plan.title = parsed.title || null;
      plan.cover = parsed.cover || null;
      plan.origin = "userscript";

      ui.setStatus("准备写入引擎...");
      const ready = await ensureEngineReady();
      if (!ready) {
        ui.setStatus("页面写入引擎未就绪,请确认在文章编辑器页面后重试", "error");
        return;
      }

      await new Promise((resolve) => {
        const listener = (data) => {
          if (data.kind === "progress") {
            ui.setStatus(data.text || "处理中...", data.level === "warn" ? "warn" : "work");
          } else if (data.kind === "done") {
            engineListeners.delete(listener);
            ui.setStatus(summarize(data.summary, localNeedsAuth, imageMap), "ok");
            resolve();
          } else if (data.kind === "cancelled") {
            engineListeners.delete(listener);
            ui.setStatus("已停止写入。", "warn");
            resolve();
          } else if (data.kind === "error") {
            engineListeners.delete(listener);
            ui.setStatus(`写入失败:${data.error || "未知错误"}`, "error");
            resolve();
          }
        };
        engineListeners.add(listener);
        postToEngine({ kind: "run", payload: plan });
      });
    } catch (error) {
      console.error(LOG, error);
      ui.setStatus(`出错:${error?.message || String(error)}`, "error");
    } finally {
      importRunning = false;
      ui.setBusy(false);
    }
  }

  function summarize(summary, localNeedsAuth, imageMap) {
    if (!summary) return "写入完成。";
    const parts = [];
    const imgOk = Number(summary.imgOk || 0);
    const imgFail = Number(summary.imgFail || 0);
    parts.push(`写入完成:图片 ${imgOk} 成功`);
    if (imgFail) parts.push(`${imgFail} 失败`);
    if (summary.atomicOk) parts.push(`特殊块 ${summary.atomicOk}`);
    if (summary.title?.ui?.ok || summary.title?.graphql?.ok) parts.push("标题已设置");
    if (summary.cover?.graphql?.ok) parts.push("封面已设置");
    else if (summary.cover?.requested && summary.cover?.skippedReason) parts.push("封面未设置");
    // 统计准备阶段失败的图片
    let prepFail = 0;
    for (const result of imageMap.values()) if (!result?.ok) prepFail += 1;
    if (prepFail) parts.push(`${prepFail} 张图片准备失败`);
    if (localNeedsAuth) parts.push('(本地图片需先点「选图片文件夹」授权)');
    return parts.join(",");
  }

  function cancelImport() {
    postToEngine({ kind: "cancel" });
  }

  // ===========================================================================
  // 注入式浮动 UI
  // ===========================================================================
  function isArticleRoute() {
    const path = location.pathname;
    return /\/compose\/articles(?:$|[/?#])/.test(path) || /\/compose\/articles\/edit\/\d+/.test(path);
  }

  function injectStyles() {
    if (document.getElementById(`${ID}style`)) return;
    const style = document.createElement("style");
    style.id = `${ID}style`;
    style.textContent = `
      #${ID}fab {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
        background: #1d9bf0; color: #fff; border: none; border-radius: 9999px;
        padding: 10px 16px; font-size: 14px; font-weight: 700; cursor: pointer;
        box-shadow: 0 2px 12px rgba(0,0,0,.3); font-family: system-ui, sans-serif;
      }
      #${ID}fab:hover { background: #1a8cd8; }
      #${ID}panel {
        position: fixed; right: 20px; bottom: 70px; z-index: 2147483647;
        width: 360px; max-width: calc(100vw - 40px); background: #fff; color: #0f1419;
        border: 1px solid #cfd9de; border-radius: 14px; padding: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,.28); font-family: system-ui, sans-serif;
        font-size: 13px; display: none;
      }
      #${ID}panel.${ID}open { display: block; }
      #${ID}panel * { box-sizing: border-box; }
      #${ID}panel h3 { margin: 0 0 10px; font-size: 15px; font-weight: 800; }
      #${ID}panel textarea {
        width: 100%; height: 140px; resize: vertical; border: 1px solid #cfd9de;
        border-radius: 8px; padding: 8px; font-size: 12px; font-family: ui-monospace, monospace;
        color: #0f1419; background: #fff;
      }
      #${ID}panel .${ID}row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; align-items: center; }
      #${ID}panel button.${ID}btn {
        border: 1px solid #cfd9de; background: #eff3f4; color: #0f1419; border-radius: 8px;
        padding: 7px 12px; font-size: 12px; cursor: pointer; font-weight: 600;
      }
      #${ID}panel button.${ID}btn:hover { background: #e2e8ea; }
      #${ID}panel button.${ID}primary { background: #1d9bf0; color: #fff; border-color: #1d9bf0; }
      #${ID}panel button.${ID}primary:hover { background: #1a8cd8; }
      #${ID}panel button:disabled { opacity: .5; cursor: not-allowed; }
      #${ID}panel label.${ID}check { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
      #${ID}panel .${ID}meta { color: #536471; font-size: 11px; margin-top: 6px; word-break: break-all; }
      #${ID}panel .${ID}status { margin-top: 10px; font-size: 12px; min-height: 16px; word-break: break-word; }
      #${ID}panel .${ID}status.${ID}warn { color: #b35900; }
      #${ID}panel .${ID}status.${ID}error { color: #c00; }
      #${ID}panel .${ID}status.${ID}ok { color: #00754a; }
      #${ID}panel .${ID}close {
        position: absolute; top: 10px; right: 12px; border: none; background: transparent;
        font-size: 18px; cursor: pointer; color: #536471; line-height: 1;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let uiRefs = null;

  function buildUi() {
    if (uiRefs) return uiRefs;
    injectStyles();

    const fab = document.createElement("button");
    fab.id = `${ID}fab`;
    fab.textContent = "xPoster";

    const panel = document.createElement("div");
    panel.id = `${ID}panel`;
    panel.innerHTML = `
      <button class="${ID}close" title="关闭">×</button>
      <h3>xPoster 导入</h3>
      <textarea id="${ID}ta" placeholder="在此粘贴 Markdown,或点「选 .md 文件」"></textarea>
      <div class="${ID}row">
        <button class="${ID}btn" id="${ID}pickmd">选 .md 文件</button>
        <button class="${ID}btn" id="${ID}pickdir">选图片文件夹</button>
        <label class="${ID}check"><input type="checkbox" id="${ID}smart"> 智能标点</label>
      </div>
      <div class="${ID}meta" id="${ID}dirmeta"></div>
      <div class="${ID}row">
        <button class="${ID}btn ${ID}primary" id="${ID}write">写入当前文章</button>
        <button class="${ID}btn" id="${ID}cancel">停止</button>
      </div>
      <div class="${ID}status" id="${ID}status"></div>
      <input type="file" id="${ID}mdfile" accept=".md,.markdown,text/markdown" style="display:none">
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const $ = (sub) => panel.querySelector(`#${ID}${sub}`);
    const ta = $("ta");
    const statusEl = $("status");
    const dirMeta = $("dirmeta");
    const smartCb = $("smart");
    const writeBtn = $("write");
    const mdFileInput = $("mdfile");

    let fallbackTitle = "";

    const ui = {
      setStatus(text, level) {
        statusEl.textContent = text || "";
        statusEl.className = `${ID}status` + (level ? ` ${ID}${level}` : "");
      },
      setBusy(busy) {
        writeBtn.disabled = busy;
        writeBtn.textContent = busy ? "写入中..." : "写入当前文章";
      }
    };

    // 初始化智能标点开关
    smartCb.checked = gmGet(SETTING_SMART_PUNCT, false) === true;
    smartCb.addEventListener("change", () => gmSet(SETTING_SMART_PUNCT, smartCb.checked === true));

    // 显示已保存的图片文件夹名
    (async () => {
      try {
        const record = await shared.getVaultRecord();
        if (record?.name) dirMeta.textContent = `图片文件夹:${record.name}`;
      } catch {}
    })();

    fab.addEventListener("click", () => panel.classList.toggle(`${ID}open`));
    panel.querySelector(`.${ID}close`).addEventListener("click", () => panel.classList.remove(`${ID}open`));

    $("pickmd").addEventListener("click", () => mdFileInput.click());
    mdFileInput.addEventListener("change", async () => {
      const file = mdFileInput.files && mdFileInput.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        ta.value = text;
        fallbackTitle = shared.markdownTitleCandidateFromFileName(file.name) || "";
        ui.setStatus(`已读取 ${file.name}`, "ok");
      } catch (error) {
        ui.setStatus(`读取文件失败:${error?.message || error}`, "error");
      }
      mdFileInput.value = "";
    });

    $("pickdir").addEventListener("click", async () => {
      const picker = pageWindow.showDirectoryPicker || window.showDirectoryPicker;
      if (typeof picker !== "function") {
        ui.setStatus("当前浏览器不支持选择文件夹(File System Access API)", "error");
        return;
      }
      try {
        const handle = await picker.call(pageWindow);
        await shared.saveVaultHandle(handle);
        dirMeta.textContent = `图片文件夹:${handle.name}`;
        ui.setStatus(`已选择图片文件夹:${handle.name}`, "ok");
      } catch (error) {
        if (error?.name === "AbortError") return;
        ui.setStatus(`选择文件夹失败:${error?.message || error}`, "error");
      }
    });

    writeBtn.addEventListener("click", () => {
      runImport(ta.value, {
        smartPunctuation: smartCb.checked === true,
        fallbackTitle
      }, ui);
    });

    $("cancel").addEventListener("click", () => {
      cancelImport();
      ui.setStatus("已请求停止...", "warn");
    });

    uiRefs = { fab, panel };
    return uiRefs;
  }

  function showUi() {
    if (!document.body) return;
    const refs = buildUi();
    refs.fab.style.display = "";
    if (!engineInjected && engineReady === false) injectEngine();
  }

  function hideUi() {
    if (!uiRefs) return;
    uiRefs.fab.style.display = "none";
    uiRefs.panel.classList.remove(`${ID}open`);
  }

  function syncUiVisibility() {
    if (isArticleRoute()) showUi();
    else hideUi();
  }

  // 监听 SPA 路由变化
  let lastPath = location.pathname;
  function watchRoute() {
    syncUiVisibility();
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        syncUiVisibility();
      }
    }, 800);
    window.addEventListener("popstate", syncUiVisibility);
  }

  if (document.body) {
    watchRoute();
  } else {
    document.addEventListener("DOMContentLoaded", watchRoute, { once: true });
  }

  // ===========================================================================
  // [ENGINE] main-world.js 源码,作为字符串注入页面真实上下文。
  // ===========================================================================
  const ENGINE_SRC = "(() => {\n  const LOG = \"[xPoster MAIN]\";\n  const CHANNEL_TO_MAIN = \"xposter\";\n  const CHANNEL_FROM_MAIN = \"xposter-main\";\n  const EDITOR_SELECTOR =\n    \"[data-contents='true'] [contenteditable='true'], [contenteditable='true'][role='textbox'], [contenteditable='true'].public-DraftEditor-content, [contenteditable='true']\";\n  const MEDIA_UPLOAD_BASE_TIMEOUT_MS = 90000;\n  const MEDIA_UPLOAD_PER_ITEM_TIMEOUT_MS = 2500;\n  const MEDIA_UPLOAD_MAX_TIMEOUT_MS = 150000;\n  const MEDIA_UPLOAD_PROGRESS_HEARTBEAT_MS = 15000;\n  const MEDIA_UPLOAD_NO_ENTITY_TIMEOUT_MS = 45000;\n  const MEDIA_UPLOAD_PENDING_READY_MS = 20000;\n  const MEDIA_UPLOAD_PENDING_STABLE_MS = 5000;\n  const MEDIA_UPLOAD_PENDING_MAX_WAIT_MS = 32000;\n  const MEDIA_UPLOAD_USER_RETRY_AFTER_MS = 15000;\n  const MEDIA_UPLOAD_MAX_ATTEMPTS = 3;\n  const MEDIA_UPLOAD_RETRY_MIN_REMAINING_MS = 10000;\n  const MEDIA_UPLOAD_TIMEOUT_ERROR =\n    \"X media upload took too long. X may be throttling this draft, especially with many images. Wait a moment, then write again or split the article.\";\n\n  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n  let cancelRequested = false;\n  let activeUploadRetry = null;\n\n  function post(kind, payload = {}) {\n    window.postMessage({ source: CHANNEL_FROM_MAIN, kind, ...payload }, \"*\");\n  }\n\n  function progress(text, level = \"work\", extra = {}) {\n    post(\"progress\", { text, level, ...extra });\n  }\n\n  function throwIfCancelled() {\n    if (!cancelRequested) return;\n    const error = new Error(\"Writing stopped by user.\");\n    error.cancelled = true;\n    throw error;\n  }\n\n  function requestPreparedFile(operation, timeoutMs = 30000) {\n    const token = operation?.op?.file?.token || operation?.marker || \"\";\n    if (operation?.op?.file?.base64) return Promise.resolve(operation.op.file);\n    if (!token) return Promise.reject(new Error(\"Prepared image token is missing\"));\n    const requestId = `file_${Math.random().toString(36).slice(2, 10)}`;\n    return new Promise((resolve, reject) => {\n      const timeout = setTimeout(() => {\n        window.removeEventListener(\"message\", listener);\n        reject(new Error(\"Prepared image data did not arrive\"));\n      }, timeoutMs);\n      const listener = (event) => {\n        if (event.source !== window || event.data?.source !== CHANNEL_TO_MAIN) return;\n        const message = event.data;\n        if (message.kind !== \"file-response\" || message.requestId !== requestId) return;\n        clearTimeout(timeout);\n        window.removeEventListener(\"message\", listener);\n        if (message.ok && message.file?.base64) resolve(message.file);\n        else reject(new Error(message.error || \"Prepared image data was not available\"));\n      };\n      window.addEventListener(\"message\", listener);\n      post(\"file-request\", { requestId, token, marker: operation.marker });\n    });\n  }\n\n  function imageSourcesMatch(left, right) {\n    const leftRaw = String(left || \"\").trim();\n    const rightRaw = String(right || \"\").trim();\n    if (!leftRaw || !rightRaw) return false;\n    if (leftRaw === rightRaw) return true;\n    try {\n      const leftUrl = new URL(leftRaw, location.href);\n      const rightUrl = new URL(rightRaw, location.href);\n      leftUrl.hash = \"\";\n      rightUrl.hash = \"\";\n      return decodeURIComponent(leftUrl.href) === decodeURIComponent(rightUrl.href);\n    } catch {\n      return leftRaw.split(\"#\")[0] === rightRaw.split(\"#\")[0];\n    }\n  }\n\n  function findEditorElement() {\n    for (const element of document.querySelectorAll(EDITOR_SELECTOR)) {\n      const rect = element.getBoundingClientRect();\n      if (rect.width > 200 && rect.height > 80) return element;\n    }\n    return null;\n  }\n\n  function findDraftStateNode() {\n    const editor = findEditorElement();\n    if (!editor) return null;\n    const fiberKey = Object.keys(editor).find(\n      (key) => key.startsWith(\"__reactFiber$\") || key.startsWith(\"__reactInternalInstance$\")\n    );\n    if (!fiberKey) return null;\n    let fiber = editor[fiberKey];\n    for (let depth = 0; depth < 80 && fiber; depth += 1) {\n      const stateNode = fiber.stateNode;\n      if (stateNode?.props?.editorState && typeof stateNode.props.onChange === \"function\") {\n        return stateNode;\n      }\n      fiber = fiber.return;\n    }\n    return null;\n  }\n\n  function findOnFilesAdded() {\n    const editor = findEditorElement();\n    if (!editor) return null;\n    const fiberKey = Object.keys(editor).find(\n      (key) => key.startsWith(\"__reactFiber$\") || key.startsWith(\"__reactInternalInstance$\")\n    );\n    if (!fiberKey) return null;\n    let fiber = editor[fiberKey];\n    for (let depth = 0; depth < 160 && fiber; depth += 1) {\n      const props = fiber.memoizedProps || fiber.stateNode?.props;\n      if (typeof props?.onFilesAdded === \"function\") return props.onFilesAdded;\n      const nested = findOnFilesAddedInFiberChildren(fiber.child, 0);\n      if (nested) return nested;\n      fiber = fiber.return;\n    }\n    return null;\n  }\n\n  function findOnFilesAddedInFiberChildren(fiber, depth) {\n    if (!fiber || depth > 8) return null;\n    const props = fiber.memoizedProps || fiber.stateNode?.props;\n    if (typeof props?.onFilesAdded === \"function\") return props.onFilesAdded;\n    return findOnFilesAddedInFiberChildren(fiber.child, depth + 1) || findOnFilesAddedInFiberChildren(fiber.sibling, depth);\n  }\n\n  function pasteHtml(html, plain) {\n    const editor = findEditorElement();\n    if (!editor) return false;\n    editor.focus();\n    const data = new DataTransfer();\n    data.setData(\"text/html\", html);\n    data.setData(\"text/plain\", plain || html.replace(/<[^>]*>/g, \"\"));\n    const event = new ClipboardEvent(\"paste\", {\n      bubbles: true,\n      cancelable: true,\n      clipboardData: data\n    });\n    if (event.clipboardData !== data) {\n      Object.defineProperty(event, \"clipboardData\", { value: data });\n    }\n    return editor.dispatchEvent(event);\n  }\n\n  function isDraftCharacterMetadata(character, requireStyle = true) {\n    return Boolean(character?.set && (!requireStyle || character.getStyle));\n  }\n\n  function firstCharacterMetadata(block, requireStyle = true) {\n    const characterList = block?.getCharacterList?.();\n    if (!characterList) return null;\n    if (typeof characterList.find === \"function\") {\n      const found = characterList.find((character) => isDraftCharacterMetadata(character, requireStyle));\n      if (found) return found;\n    }\n    const size =\n      typeof characterList.size === \"number\"\n        ? characterList.size\n        : typeof characterList.count === \"function\"\n          ? characterList.count()\n          : 0;\n    for (let index = 0; index < size; index += 1) {\n      const character = characterList.get?.(index);\n      if (isDraftCharacterMetadata(character, requireStyle)) return character;\n    }\n    const first = characterList.first?.() || characterList.get?.(0);\n    return isDraftCharacterMetadata(first, requireStyle) ? first : null;\n  }\n\n  function findDraftCharacterSample(draftNode) {\n    const blockMap = draftNode?.props?.editorState?.getCurrentContent?.()?.getBlockMap?.();\n    if (!blockMap?.find) return null;\n    const block = blockMap.find((candidate) => Boolean(firstCharacterMetadata(candidate))) || null;\n    return block ? { block, character: firstCharacterMetadata(block) } : null;\n  }\n\n  function findDraftSampleBlock(draftNode) {\n    return findDraftCharacterSample(draftNode)?.block || null;\n  }\n\n  async function ensureDraftCharacterSample(draftNode) {\n    if (findDraftSampleBlock(draftNode)) return draftNode;\n    const editor = findEditorElement();\n    if (!editor) return draftNode;\n\n    editor.focus();\n    document.execCommand(\"insertText\", false, \"x\");\n\n    const deadline = Date.now() + 1600;\n    while (Date.now() < deadline) {\n      await sleep(80);\n      const latestNode = findDraftStateNode() || draftNode;\n      if (findDraftSampleBlock(latestNode)) return latestNode;\n    }\n    return findDraftStateNode() || draftNode;\n  }\n\n  function writeDraftBlocks(draftNode, blocks) {\n    if (!Array.isArray(blocks) || !blocks.length) return { ok: false, error: \"No structured blocks\" };\n\n    const editorState = draftNode.props.editorState;\n    const EditorState = editorState.constructor;\n    const SelectionState = editorState.getSelection().constructor;\n    const contentState = editorState.getCurrentContent();\n    const blockMap = contentState.getBlockMap();\n    const sample = findDraftCharacterSample(draftNode);\n    const sampleBlock = sample?.block || null;\n    const sampleCharacter = sample?.character || null;\n    if (!sampleBlock || !sampleCharacter) return { ok: false, error: \"No Draft.js character sample for structured write\" };\n\n    const BlockMap = blockMap.constructor;\n    const CharacterList = sampleBlock.getCharacterList().constructor;\n    if (!sampleCharacter?.set || !sampleCharacter.getStyle) return { ok: false, error: \"No Draft.js character metadata sample for structured write\" };\n\n    let nextContent = contentState;\n    let nextBlockMap = BlockMap();\n    const createdKeys = [];\n\n    for (let index = 0; index < blocks.length; index += 1) {\n      const block = blocks[index] || {};\n      const text = String(block.text || \"\");\n      const key = `${Math.random().toString(36).slice(2, 7)}${index.toString(36)}`;\n      let characterList = CharacterList();\n      const entityRanges = new Map();\n\n      for (const link of block.links || []) {\n        const offset = Number(link.offset) || 0;\n        const length = Math.max(0, Number(link.length) || 0);\n        if (!length || !link.url) continue;\n        nextContent = nextContent.createEntity(\"LINK\", \"MUTABLE\", { url: String(link.url) });\n        entityRanges.set(`${offset}:${offset + length}`, nextContent.getLastCreatedEntityKey());\n      }\n\n      for (let charIndex = 0; charIndex < text.length; charIndex += 1) {\n        const styleNames = (block.inlineStyleRanges || [])\n          .filter((range) => charIndex >= range.offset && charIndex < range.offset + range.length)\n          .map((range) => draftInlineStyleName(range.style))\n          .filter(Boolean);\n        let entity = null;\n        for (const [range, entityKey] of entityRanges.entries()) {\n          const [start, end] = range.split(\":\").map(Number);\n          if (charIndex >= start && charIndex < end) {\n            entity = entityKey;\n            break;\n          }\n        }\n        let style = sampleCharacter.getStyle().clear();\n        for (const styleName of styleNames) style = style.add(styleName);\n        characterList = characterList.push(sampleCharacter.set(\"style\", style).set(\"entity\", entity));\n      }\n\n      const nextBlock = sampleBlock.merge({\n        key,\n        type: block.type || \"unstyled\",\n        text,\n        characterList,\n        depth: block.type === \"unordered-list-item\" || block.type === \"ordered-list-item\" ? 0 : 0,\n        data: sampleBlock.getData?.()?.clear?.() || sampleBlock.getData?.()\n      });\n      nextBlockMap = nextBlockMap.set(key, nextBlock);\n      createdKeys.push(key);\n    }\n\n    if (!createdKeys.length) return { ok: false, error: \"No Draft.js blocks created\" };\n    const lastKey = createdKeys[createdKeys.length - 1];\n    const selection = SelectionState.createEmpty(lastKey);\n    const nextState = nextContent\n      .set(\"blockMap\", nextBlockMap)\n      .set(\"selectionBefore\", selection)\n      .set(\"selectionAfter\", selection);\n    let nextEditorState = EditorState.push(editorState, nextState, \"insert-fragment\");\n    nextEditorState = EditorState.moveSelectionToEnd(nextEditorState);\n    draftNode.props.onChange(nextEditorState);\n    return { ok: true, blocks: createdKeys.length };\n  }\n\n  function draftInlineStyleName(style) {\n    return (\n      {\n        Bold: \"BOLD\",\n        Italic: \"ITALIC\",\n        Strikethrough: \"STRIKETHROUGH\",\n        Code: \"CODE\"\n      }[style] || style\n    );\n  }\n\n  function findMarkerLocation(contentState, marker, options = {}) {\n    const needle = String(marker || \"\");\n    if (!needle) return null;\n    let exact = null;\n    let partial = null;\n    contentState.getBlockMap().forEach((block, key) => {\n      if (block.getType() === \"atomic\") return;\n      const text = block.getText() || \"\";\n      const offset = text.indexOf(needle);\n      if (offset < 0) return;\n      const candidate = {\n        blockKey: key,\n        offset,\n        length: needle.length,\n        exact: text.trim() === needle\n      };\n      if (candidate.exact && !exact) exact = candidate;\n      else if (!partial) partial = candidate;\n    });\n    if (exact) return exact;\n    return options.exactOnly ? null : partial;\n  }\n\n  function findMarkerBlock(contentState, marker, options = {}) {\n    return findMarkerLocation(contentState, marker, options)?.blockKey || null;\n  }\n\n  function countMarkerTokens(draftNode, prefix) {\n    if (!draftNode || !prefix) return 0;\n    let count = 0;\n    const markerPattern = markerTokenPattern(prefix);\n    draftNode.props.editorState\n      .getCurrentContent()\n      .getBlockMap()\n      .forEach((block) => {\n        const matches = (block.getText() || \"\").match(markerPattern);\n        if (matches?.length) count += matches.length;\n      });\n    return count;\n  }\n\n  async function waitForDraftMarkers(markerPrefix, expectedCount, timeoutMs = 4000) {\n    const deadline = Date.now() + timeoutMs;\n    while (Date.now() < deadline) {\n      const latestNode = findDraftStateNode();\n      if (latestNode && countMarkerTokens(latestNode, markerPrefix) >= expectedCount) {\n        return latestNode;\n      }\n      await sleep(100);\n    }\n    return findDraftStateNode();\n  }\n\n  function replaceMarkerWithAtomic(contentState, marker, entityType, data, mutability, sampleBlock, text) {\n    const blockKey = findMarkerBlock(contentState, marker, { exactOnly: true });\n    if (!blockKey) return { ok: false, error: `Marker not found: ${marker}`, contentState };\n\n    const markerBlock = contentState.getBlockMap().get(blockKey);\n    const blockTemplate = markerBlock || sampleBlock;\n    const characterList = markerBlock.getCharacterList();\n    const markerCharacter = firstCharacterMetadata(markerBlock, false);\n    const fallbackCharacter = firstCharacterMetadata(sampleBlock, false);\n    const sampleCharacter = markerCharacter?.set ? markerCharacter : fallbackCharacter;\n    if (!sampleCharacter?.set) return { ok: false, error: `No Draft.js character sample for marker: ${marker}`, contentState };\n    const CharacterList = characterList.constructor;\n\n    const withEntity = contentState.createEntity(entityType, mutability || \"IMMUTABLE\", data || {});\n    const entityKey = withEntity.getLastCreatedEntityKey();\n    const character = sampleCharacter.set(\"entity\", entityKey);\n    // 多数 atomic 块文本是单个空格(真实数据在 entity);LATEX 例外:公式放在 block 文本里。\n    const atomicText = text != null && String(text).length ? String(text) : \" \";\n    const atomicCharacterList = CharacterList(Array.from({ length: atomicText.length }, () => character));\n    const atomicBlock = blockTemplate.merge({\n      key: blockKey,\n      type: \"atomic\",\n      text: atomicText,\n      characterList: atomicCharacterList,\n      depth: 0\n    });\n    const blockMap = withEntity.getBlockMap().set(blockKey, atomicBlock);\n    return { ok: true, entityKey, contentState: withEntity.set(\"blockMap\", blockMap) };\n  }\n\n  function insertAtomicBatch(draftNode, operations) {\n    if (!operations.length) return { okCount: 0, failCount: 0, errors: [] };\n    const editorState = draftNode.props.editorState;\n    const EditorState = editorState.constructor;\n    const SelectionState = editorState.getSelection().constructor;\n    let contentState = editorState.getCurrentContent();\n    const sampleBlock = findDraftSampleBlock(draftNode);\n    let okCount = 0;\n    const errors = [];\n\n    for (const item of operations) {\n      const result = replaceMarkerWithAtomic(\n        contentState,\n        item.marker,\n        item.op.entityType,\n        item.op.data || {},\n        item.op.mutability || \"IMMUTABLE\",\n        sampleBlock,\n        item.op.text\n      );\n      if (result.ok) {\n        contentState = result.contentState;\n        okCount += 1;\n      } else {\n        errors.push(result.error);\n      }\n    }\n\n    if (okCount > 0) {\n      const lastKey = contentState.getBlockMap().last().getKey();\n      const selection = SelectionState.createEmpty(lastKey);\n      const nextContent = contentState.set(\"selectionBefore\", selection).set(\"selectionAfter\", selection);\n      let nextEditorState = EditorState.push(editorState, nextContent, \"insert-fragment\");\n      nextEditorState = EditorState.moveSelectionToEnd(nextEditorState);\n      draftNode.props.onChange(nextEditorState);\n    }\n\n    return { okCount, failCount: errors.length, errors };\n  }\n\n  function base64ToFile(base64, fileName, mime) {\n    const binary = atob(base64);\n    const bytes = new Uint8Array(binary.length);\n    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);\n    return new File([bytes], fileName, { type: mime });\n  }\n\n  function uploadFilesToEditor(filePayloads = []) {\n    const onFilesAdded = findOnFilesAdded();\n    if (!onFilesAdded) return { ok: false, error: \"X upload handler was not reachable\" };\n    const files = [];\n    const failures = [];\n    filePayloads.forEach((file, index) => {\n      const fileName = file?.fileName || `image-${index + 1}.png`;\n      if (!file?.base64) {\n        failures.push({ index: index + 1, fileName, error: \"No image file data was provided\" });\n        return;\n      }\n      try {\n        files.push(base64ToFile(file.base64, fileName, file.mime || \"image/png\"));\n      } catch (error) {\n        failures.push({ index: index + 1, fileName, error: error?.message || \"Invalid image file data\" });\n      }\n    });\n    if (!files.length) return { ok: false, error: \"No image file data was provided\", failures };\n    const editor = findEditorElement();\n    editor?.focus?.();\n    try {\n      onFilesAdded(files);\n    } catch (error) {\n      return { ok: false, error: error?.message || \"X upload handler failed\", failures };\n    }\n    return {\n      ok: true,\n      count: files.length,\n      failed: failures.length,\n      failures,\n      files: files.map((file) => ({ name: file.name, type: file.type, size: file.size }))\n    };\n  }\n\n  function existingMediaEntities(contentState) {\n    const entities = new Set();\n    contentState.getBlockMap().forEach((block) => {\n      if (block.getType() !== \"atomic\") return;\n      block.findEntityRanges(\n        (character) => Boolean(character.getEntity()),\n        (start) => {\n          const entityKey = block.getCharacterList().get(start)?.getEntity?.();\n          if (!entityKey) return;\n          try {\n            if (contentState.getEntity(entityKey).getType() === \"MEDIA\") entities.add(entityKey);\n          } catch {}\n        }\n      );\n    });\n    return entities;\n  }\n\n  function normalizeMediaIdValue(value) {\n    if (value == null || value === \"\") return null;\n    const text = String(value).trim();\n    if (!text) return null;\n    if (/^\\d+$/.test(text)) return text;\n    const mediaKey = text.match(/^\\d+_(\\d+)$/);\n    if (mediaKey) return mediaKey[1];\n    const trailingDigits = text.match(/(?:^|[_:])(\\d{8,})$/);\n    return trailingDigits ? trailingDigits[1] : null;\n  }\n\n  function mediaIdFromEntityData(data = {}, depth = 0) {\n    if (data == null || depth > 5) return null;\n    const primitive = normalizeMediaIdValue(data);\n    if (primitive) return primitive;\n    if (typeof data !== \"object\") return null;\n\n    if (Array.isArray(data)) {\n      for (const item of data) {\n        const mediaId = mediaIdFromEntityData(item, depth + 1);\n        if (mediaId) return mediaId;\n      }\n      return null;\n    }\n\n    const directKeys = [\n      \"mediaId\",\n      \"mediaID\",\n      \"media_id\",\n      \"media_id_string\",\n      \"mediaIdString\",\n      \"mediaKey\",\n      \"media_key\",\n      \"id_str\",\n      \"id\",\n      \"rest_id\"\n    ];\n    for (const key of directKeys) {\n      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;\n      const mediaId = normalizeMediaIdValue(data[key]);\n      if (mediaId) return mediaId;\n    }\n\n    const containerKeys = [\n      \"mediaItems\",\n      \"media_items\",\n      \"mediaItem\",\n      \"media_item\",\n      \"media\",\n      \"upload\",\n      \"uploadResult\",\n      \"result\"\n    ];\n    for (const key of containerKeys) {\n      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;\n      const mediaId = mediaIdFromEntityData(data[key], depth + 1);\n      if (mediaId) return mediaId;\n    }\n\n    for (const value of Object.values(data)) {\n      const mediaId = mediaIdFromEntityData(value, depth + 1);\n      if (mediaId) return mediaId;\n    }\n    return null;\n  }\n\n  function mediaEntityDataSignature(data) {\n    const seen = new WeakSet();\n    try {\n      return JSON.stringify(data, (key, value) => {\n        if (typeof value === \"function\") return `[function:${value.name || \"anonymous\"}]`;\n        if (typeof value === \"string\") return value.length > 160 ? `${value.slice(0, 160)}...` : value;\n        if (value && typeof value === \"object\") {\n          if (seen.has(value)) return \"[circular]\";\n          seen.add(value);\n        }\n        return value;\n      }).slice(0, 1200);\n    } catch {\n      if (!data || typeof data !== \"object\") return String(data || \"\");\n      try {\n        return Object.keys(data).sort().join(\"|\");\n      } catch {\n        return \"\";\n      }\n    }\n  }\n\n  function findNewMediaUpload(contentState, existingEntities, ignoredBlocks = new Set()) {\n    let pending = null;\n    let complete = null;\n    contentState.getBlockMap().forEach((block, blockKey) => {\n      if (complete || block.getType() !== \"atomic\") return;\n      if (ignoredBlocks.has(blockKey)) return;\n      block.findEntityRanges(\n        (character) => Boolean(character.getEntity()),\n        (start) => {\n          if (complete) return;\n          const entityKey = block.getCharacterList().get(start)?.getEntity?.();\n          if (!entityKey || existingEntities.has(entityKey)) return;\n          try {\n            const entity = contentState.getEntity(entityKey);\n            if (entity.getType() !== \"MEDIA\") return;\n            const data = entity.getData();\n            const candidate = {\n              entityKey,\n              blockKey,\n              mediaId: mediaIdFromEntityData(data),\n              dataSignature: mediaEntityDataSignature(data)\n            };\n            if (candidate.mediaId) complete = candidate;\n            else pending ||= candidate;\n          } catch {}\n        }\n      );\n    });\n    return complete || pending;\n  }\n\n  function mediaUploadInfoFromBlock(contentState, blockKey) {\n    const block = contentState.getBlockMap().get(blockKey);\n    if (!block || block.getType() !== \"atomic\") return null;\n    let info = null;\n    block.findEntityRanges(\n      (character) => Boolean(character.getEntity()),\n      (start) => {\n        if (info?.mediaId) return;\n        const entityKey = block.getCharacterList().get(start)?.getEntity?.();\n        if (!entityKey) return;\n        try {\n          const entity = contentState.getEntity(entityKey);\n          if (entity.getType() !== \"MEDIA\") return;\n          const data = entity.getData();\n          info = {\n            entityKey,\n            blockKey,\n            mediaId: mediaIdFromEntityData(data),\n            dataSignature: mediaEntityDataSignature(data)\n          };\n        } catch {}\n      }\n    );\n    return info;\n  }\n\n  function refreshUploadMediaId(draftNode, upload) {\n    if (!upload) return null;\n    if (upload.mediaId) return upload.mediaId;\n    const contentState = draftNode?.props?.editorState?.getCurrentContent?.();\n    if (!contentState) return null;\n    const blockMap = contentState.getBlockMap();\n    let info = upload.blockKey && blockMap.has(upload.blockKey)\n      ? mediaUploadInfoFromBlock(contentState, upload.blockKey)\n      : null;\n    if (!info && upload.entityKey) {\n      try {\n        const entity = contentState.getEntity(upload.entityKey);\n        if (entity.getType() === \"MEDIA\") {\n          const data = entity.getData();\n          info = {\n            entityKey: upload.entityKey,\n            blockKey: upload.blockKey || null,\n            mediaId: mediaIdFromEntityData(data),\n            dataSignature: mediaEntityDataSignature(data)\n          };\n        }\n      } catch {}\n    }\n    if (!info) return null;\n    if (info.entityKey) upload.entityKey = info.entityKey;\n    if (info.blockKey) upload.blockKey = info.blockKey;\n    if (info.dataSignature) upload.dataSignature = info.dataSignature;\n    if (info.mediaId) upload.mediaId = info.mediaId;\n    return upload.mediaId || null;\n  }\n\n  async function waitForUploadMediaId(draftNode, upload, timeoutMs = 8000) {\n    const deadline = Date.now() + timeoutMs;\n    let latestNode = draftNode;\n    while (Date.now() < deadline) {\n      throwIfCancelled();\n      latestNode = findDraftStateNode() || latestNode;\n      if (refreshUploadMediaId(latestNode, upload)) return { draftNode: latestNode, mediaId: upload.mediaId };\n      await sleep(400);\n    }\n    latestNode = findDraftStateNode() || latestNode;\n    refreshUploadMediaId(latestNode, upload);\n    return { draftNode: latestNode, mediaId: upload?.mediaId || null };\n  }\n\n  function placeSelectionAtMarker(draftNode, marker) {\n    const editorState = draftNode.props.editorState;\n    const SelectionState = editorState.getSelection().constructor;\n    const EditorState = editorState.constructor;\n    const contentState = editorState.getCurrentContent();\n    const location = findMarkerLocation(contentState, marker);\n    if (!location) return null;\n    const selection = SelectionState.createEmpty(location.blockKey).merge({\n      anchorOffset: location.offset,\n      focusOffset: location.offset\n    });\n    draftNode.props.onChange(EditorState.forceSelection(editorState, selection));\n    return location;\n  }\n\n  function uploadProgressMeta(context, retryable = false) {\n    const index = Number(context?.index || 0);\n    const total = Number(context?.total || 0);\n    return {\n      uploadActive: true,\n      uploadRetryable: Boolean(retryable),\n      uploadIndex: index || null,\n      uploadTotal: total || null\n    };\n  }\n\n  function uploadProgressLabel(context, fallback = \"image\") {\n    const index = Number(context?.index || 0);\n    const total = Number(context?.total || 0);\n    return index && total ? `image ${index}/${total}` : fallback;\n  }\n\n  function requestActiveUploadRetry() {\n    if (!activeUploadRetry) {\n      progress(\"No image upload is active right now.\", \"warn\");\n      return false;\n    }\n    if (!activeUploadRetry.retryable) {\n      progress(\"Retry is not available for the current image yet.\", \"warn\", uploadProgressMeta(activeUploadRetry.context, false));\n      return false;\n    }\n    activeUploadRetry.requested = true;\n    activeUploadRetry.retryable = false;\n    progress(`Retry requested for ${uploadProgressLabel(activeUploadRetry.context)}.`, \"warn\", uploadProgressMeta(activeUploadRetry.context, false));\n    return true;\n  }\n\n  async function uploadImageAtMarker(draftNode, imageOperation, existingAtomicBlocks, context = {}) {\n    throwIfCancelled();\n    const onFilesAdded = findOnFilesAdded();\n    if (!onFilesAdded) return { ok: false, error: \"X upload handler was not reachable\" };\n\n    let markerLocation = placeSelectionAtMarker(draftNode, imageOperation.marker);\n    if (!markerLocation) {\n      return { ok: false, error: \"Image placeholder was not found in the X editor\" };\n    }\n    await sleep(80);\n\n    const before = existingMediaEntities(draftNode.props.editorState.getCurrentContent());\n    let preparedFile;\n    try {\n      preparedFile = await requestPreparedFile(imageOperation);\n    } catch (error) {\n      throwIfCancelled();\n      return { ok: false, error: error?.message || \"Prepared image data was not available\", recoverable: true };\n    }\n    throwIfCancelled();\n    let file;\n    try {\n      file = base64ToFile(preparedFile.base64, preparedFile.fileName, preparedFile.mime);\n    } catch (error) {\n      return { ok: false, error: error?.message || \"Prepared image data was invalid\", recoverable: true };\n    }\n\n    const timeoutMs = Math.min(\n      MEDIA_UPLOAD_MAX_TIMEOUT_MS,\n      MEDIA_UPLOAD_BASE_TIMEOUT_MS + Math.max(0, Number(context.total || 0) - 1) * MEDIA_UPLOAD_PER_ITEM_TIMEOUT_MS\n    );\n    const startedAt = Date.now();\n    const deadline = startedAt + timeoutMs;\n    const retryState = { requested: false, retryable: false, context };\n    const canAttemptRetry = () => Date.now() + MEDIA_UPLOAD_RETRY_MIN_REMAINING_MS < deadline;\n    const startUploadAttempt = async (reason = \"initial\") => {\n      throwIfCancelled();\n      draftNode = findDraftStateNode() || draftNode;\n      const nextMarkerLocation = placeSelectionAtMarker(draftNode, imageOperation.marker);\n      if (!nextMarkerLocation) {\n        return { ok: false, error: \"Image placeholder was not found in the X editor\" };\n      }\n      markerLocation = nextMarkerLocation;\n      await sleep(80);\n      const handler = findOnFilesAdded() || onFilesAdded;\n      try {\n        handler([file]);\n      } catch (error) {\n        return { ok: false, error: error?.message || \"X upload handler failed\", recoverable: true };\n      }\n      return { ok: true, startedAt: Date.now(), reason };\n    };\n    const initialAttempt = await startUploadAttempt();\n    if (!initialAttempt.ok) return initialAttempt;\n    let attempt = 1;\n    let attemptStartedAt = initialAttempt.startedAt;\n    let nextProgressAt = Date.now() + MEDIA_UPLOAD_PROGRESS_HEARTBEAT_MS;\n    let retryPromptShown = false;\n    let pendingUpload = null;\n    let pendingIdentitySignature = \"\";\n    let pendingDataSignature = \"\";\n    let pendingFirstSeenAt = 0;\n    let pendingStableSince = 0;\n    const completeUploadResult = (found, extra = {}) => {\n      existingAtomicBlocks.add(found.blockKey);\n      return {\n        ok: true,\n        ...found,\n        ...extra,\n        markerBlock: markerLocation.blockKey,\n        markerOffset: markerLocation.offset,\n        markerLength: markerLocation.length,\n        markerExact: markerLocation.exact\n      };\n    };\n    const rememberPendingUpload = (found, now) => {\n      const identitySignature = `${found.entityKey}:${found.blockKey}`;\n      if (identitySignature !== pendingIdentitySignature) {\n        pendingIdentitySignature = identitySignature;\n        pendingDataSignature = found.dataSignature || \"\";\n        pendingFirstSeenAt = now;\n        pendingStableSince = now;\n      } else if ((found.dataSignature || \"\") !== pendingDataSignature) {\n        pendingDataSignature = found.dataSignature || \"\";\n        pendingStableSince = now;\n      }\n      pendingUpload = found;\n    };\n    activeUploadRetry = retryState;\n    try {\n      while (Date.now() < deadline) {\n        throwIfCancelled();\n        await sleep(350);\n        const now = Date.now();\n        const retryable = !pendingUpload && attempt < MEDIA_UPLOAD_MAX_ATTEMPTS && canAttemptRetry();\n        const userRetryable = retryable && now - attemptStartedAt >= MEDIA_UPLOAD_USER_RETRY_AFTER_MS;\n        retryState.retryable = userRetryable;\n        if (!retryPromptShown && userRetryable) {\n          const label = uploadProgressLabel(context);\n          progress(`${label[0].toUpperCase()}${label.slice(1)} is taking longer than usual. Retry is available.`, \"warn\", uploadProgressMeta(context, true));\n          retryPromptShown = true;\n          nextProgressAt = Date.now() + MEDIA_UPLOAD_PROGRESS_HEARTBEAT_MS;\n        } else if (now >= nextProgressAt) {\n          const index = Number(context.index || 0);\n          const total = Number(context.total || 0);\n          if (index && total) {\n            progress(\n              pendingUpload\n                ? `Uploading image ${index}/${total}... waiting for X to finish.`\n                : `Uploading image ${index}/${total}...`,\n              pendingUpload ? \"work\" : \"work\",\n              uploadProgressMeta(context, userRetryable)\n            );\n          }\n          nextProgressAt = Date.now() + MEDIA_UPLOAD_PROGRESS_HEARTBEAT_MS;\n        }\n        draftNode = findDraftStateNode() || draftNode;\n        const contentState = draftNode.props.editorState.getCurrentContent();\n        const found = findNewMediaUpload(contentState, before, existingAtomicBlocks);\n        if (found?.mediaId) {\n          retryState.retryable = false;\n          return completeUploadResult(found);\n        }\n        if (found) {\n          retryState.retryable = false;\n          rememberPendingUpload(found, now);\n          if (retryState.requested) {\n            retryState.requested = false;\n            progress(`${uploadProgressLabel(context, \"This image\")} reached X already; waiting to avoid a duplicate upload.`, \"warn\", uploadProgressMeta(context, false));\n          }\n          const pendingReady =\n            canUsePendingMediaUpload(imageOperation) &&\n            (now - pendingFirstSeenAt >= MEDIA_UPLOAD_PENDING_MAX_WAIT_MS ||\n              (now - pendingFirstSeenAt >= MEDIA_UPLOAD_PENDING_READY_MS &&\n                now - pendingStableSince >= MEDIA_UPLOAD_PENDING_STABLE_MS));\n          if (pendingReady) {\n            const index = Number(context.index || 0);\n            const total = Number(context.total || 0);\n            if (index && total) progress(`Image ${index}/${total} is in the editor; continuing...`, \"work\", uploadProgressMeta(context, false));\n            return completeUploadResult(found, { mediaPending: true });\n          }\n        } else {\n          pendingUpload = null;\n          pendingIdentitySignature = \"\";\n          pendingDataSignature = \"\";\n          pendingFirstSeenAt = 0;\n          pendingStableSince = 0;\n          const shouldManualRetry = retryState.requested && retryable;\n          const shouldAutoRetry = now - attemptStartedAt >= MEDIA_UPLOAD_NO_ENTITY_TIMEOUT_MS && retryable;\n          if (shouldManualRetry || shouldAutoRetry) {\n            retryState.requested = false;\n            retryState.retryable = false;\n            const label = uploadProgressLabel(context);\n            progress(\n              shouldManualRetry\n                ? `Retrying ${label} now...`\n                : `${label[0].toUpperCase()}${label.slice(1)} did not start in X. Retrying...`,\n              \"warn\",\n              uploadProgressMeta(context, false)\n            );\n            await sleep(MEDIA_UPLOAD_RETRY_MIN_REMAINING_MS > 0 ? Math.min(1200, MEDIA_UPLOAD_RETRY_MIN_REMAINING_MS) : 0);\n            draftNode = findDraftStateNode() || draftNode;\n            const retryContentState = draftNode.props.editorState.getCurrentContent();\n            const retryFound = findNewMediaUpload(retryContentState, before, existingAtomicBlocks);\n            if (retryFound?.mediaId) return completeUploadResult(retryFound);\n            if (retryFound) {\n              retryState.retryable = false;\n              rememberPendingUpload(retryFound, Date.now());\n              progress(`${uploadProgressLabel(context, \"This image\")} reached X already; waiting to avoid a duplicate upload.`, \"warn\", uploadProgressMeta(context, false));\n              nextProgressAt = Date.now() + MEDIA_UPLOAD_PROGRESS_HEARTBEAT_MS;\n              retryPromptShown = true;\n              continue;\n            }\n            attempt += 1;\n            const nextAttempt = await startUploadAttempt(shouldManualRetry ? \"manual\" : \"auto\");\n            if (!nextAttempt.ok) return nextAttempt;\n            attemptStartedAt = nextAttempt.startedAt;\n            nextProgressAt = Date.now() + MEDIA_UPLOAD_PROGRESS_HEARTBEAT_MS;\n            retryPromptShown = false;\n            continue;\n          }\n          retryState.requested = false;\n          if (now - attemptStartedAt >= MEDIA_UPLOAD_NO_ENTITY_TIMEOUT_MS) {\n            return {\n              ok: false,\n              error: MEDIA_UPLOAD_TIMEOUT_ERROR,\n              timeout: true,\n              timeoutMs: MEDIA_UPLOAD_NO_ENTITY_TIMEOUT_MS,\n              pendingEntity: false,\n              noEntity: true,\n              attempts: attempt\n            };\n          }\n        }\n      }\n\n      return { ok: false, error: MEDIA_UPLOAD_TIMEOUT_ERROR, timeout: true, timeoutMs, pendingEntity: Boolean(pendingUpload), attempts: attempt };\n    } finally {\n      if (activeUploadRetry === retryState) activeUploadRetry = null;\n    }\n  }\n\n  function replaceMarkerText(draftNode, marker, text) {\n    const editorState = draftNode.props.editorState;\n    const EditorState = editorState.constructor;\n    const SelectionState = editorState.getSelection().constructor;\n    const contentState = editorState.getCurrentContent();\n    const blockMap = contentState.getBlockMap();\n    const location = findMarkerLocation(contentState, marker);\n    if (!location) return false;\n    const blockKey = location.blockKey;\n    const block = blockMap.get(blockKey);\n    const replacement = String(text || \"\");\n    const currentText = block.getText() || \"\";\n    const nextText = location.exact\n      ? replacement\n      : `${currentText.slice(0, location.offset)}${replacement}${currentText.slice(location.offset + location.length)}`;\n    if (!nextText.trim()) return deleteBlockByKey(draftNode, blockKey).ok;\n    const characterFactory = block.getCharacterList().get(0)?.constructor;\n    const character = characterFactory ? characterFactory.create({}) : null;\n    const characterList = block.getCharacterList().clear().concat(Array.from({ length: nextText.length }, () => character));\n    const nextBlock = block.merge({ text: nextText, characterList });\n    const selection = SelectionState.createEmpty(blockKey);\n    const nextContent = contentState\n      .set(\"blockMap\", blockMap.set(blockKey, nextBlock))\n      .set(\"selectionBefore\", selection)\n      .set(\"selectionAfter\", selection);\n    draftNode.props.onChange(EditorState.push(editorState, nextContent, \"change-block-data\"));\n    return true;\n  }\n\n  function markerTokenPattern(markerPrefix) {\n    const prefix = String(markerPrefix || \"__XPOSTER_\").replace(/[.*+?^${}()|[\\]\\\\]/g, \"\\\\$&\");\n    return new RegExp(`${prefix}[A-Z]+_\\\\d+__`, \"g\");\n  }\n\n  function allMarkerTokenPattern() {\n    return /__XPOSTER_[A-Za-z0-9]+_[A-Z]+_\\d+__/g;\n  }\n\n  function relocateImages(draftNode, uploads, protectedAtomicBlocks) {\n    if (!uploads.length) return { moved: 0, missing: 0 };\n    const editorState = draftNode.props.editorState;\n    const EditorState = editorState.constructor;\n    const SelectionState = editorState.getSelection().constructor;\n    const contentState = editorState.getCurrentContent();\n    const blockMap = contentState.getBlockMap();\n    const entityToBlock = new Map();\n    const mediaBlocks = [];\n\n    for (const upload of uploads) {\n      if (upload.markerBlock && blockMap.has(upload.markerBlock)) continue;\n      const location = findMarkerLocation(contentState, upload.marker);\n      if (location) {\n        upload.markerBlock = location.blockKey;\n        upload.markerOffset = location.offset;\n        upload.markerLength = location.length;\n        upload.markerExact = location.exact;\n      }\n    }\n\n    blockMap.forEach((block, blockKey) => {\n      if (block.getType() === \"atomic\") {\n        let firstEntity = null;\n        block.findEntityRanges(\n          (character) => Boolean(character.getEntity()),\n          (start) => {\n            const entityKey = block.getCharacterList().get(start)?.getEntity?.();\n            if (entityKey) {\n              firstEntity ||= entityKey;\n              entityToBlock.set(entityKey, blockKey);\n            }\n          }\n        );\n        if (!protectedAtomicBlocks.has(blockKey) && firstEntity) {\n          try {\n            if (contentState.getEntity(firstEntity).getType() === \"MEDIA\") {\n              mediaBlocks.push({ blockKey, entityKey: firstEntity });\n            }\n          } catch {}\n        }\n      }\n    });\n\n    const moves = new Map();\n    let missing = 0;\n    let fallbackIndex = 0;\n\n    for (const upload of uploads) {\n      if (!upload.markerBlock || !blockMap.has(upload.markerBlock)) {\n        missing += 1;\n        continue;\n      }\n      let imageBlock = upload.blockKey && blockMap.has(upload.blockKey) ? upload.blockKey : null;\n      if (!imageBlock && upload.entityKey) imageBlock = entityToBlock.get(upload.entityKey) || null;\n      if (!imageBlock) {\n        while (fallbackIndex < mediaBlocks.length && moves.has(mediaBlocks[fallbackIndex].blockKey)) {\n          fallbackIndex += 1;\n        }\n        imageBlock = mediaBlocks[fallbackIndex]?.blockKey || null;\n        fallbackIndex += 1;\n      }\n      if (!imageBlock) {\n        missing += 1;\n        continue;\n      }\n      if (imageBlock !== upload.markerBlock) {\n        moves.set(upload.markerBlock, {\n          imageBlock,\n          markerExact: upload.markerExact !== false\n        });\n      }\n    }\n\n    if (!moves.size) return { moved: 0, missing };\n    const destinationBlocks = new Set(Array.from(moves.values()).map((move) => move.imageBlock));\n    const orderedKeys = [];\n    blockMap.forEach((block, key) => {\n      if (moves.has(key)) {\n        const move = moves.get(key);\n        if (move.markerExact) orderedKeys.push(move.imageBlock);\n        else {\n          orderedKeys.push(move.imageBlock);\n          orderedKeys.push(key);\n        }\n      } else if (!destinationBlocks.has(key)) orderedKeys.push(key);\n    });\n\n    let nextBlockMap = blockMap.constructor();\n    for (const key of orderedKeys) nextBlockMap = nextBlockMap.set(key, blockMap.get(key));\n    const selection = SelectionState.createEmpty(orderedKeys[orderedKeys.length - 1]);\n    const nextContent = contentState\n      .set(\"blockMap\", nextBlockMap)\n      .set(\"selectionBefore\", selection)\n      .set(\"selectionAfter\", selection);\n    let nextEditorState = EditorState.push(editorState, nextContent, \"remove-range\");\n    nextEditorState = EditorState.moveSelectionToEnd(nextEditorState);\n    draftNode.props.onChange(nextEditorState);\n    return { moved: moves.size, missing };\n  }\n\n  function cleanupMarkers(draftNode, markerPrefix) {\n    const resolvedPrefix = String(markerPrefix || \"__XPOSTER_\");\n    const editorState = draftNode.props.editorState;\n    const EditorState = editorState.constructor;\n    const SelectionState = editorState.getSelection().constructor;\n    const contentState = editorState.getCurrentContent();\n    let blockMap = contentState.getBlockMap();\n    const toDelete = [];\n    const replacements = [];\n    const markerPattern = markerTokenPattern(resolvedPrefix);\n    blockMap.forEach((block, key) => {\n      if (block.getType() === \"atomic\") return;\n      const text = block.getText() || \"\";\n      if (!text.includes(resolvedPrefix) && !text.includes(\"__XPOSTER_\")) return;\n      const cleaned = text\n        .replace(markerPattern, \"\")\n        .replace(allMarkerTokenPattern(), \"\")\n        .replace(/\\s{2,}/g, \" \")\n        .trim();\n      if (!cleaned) {\n        toDelete.push(key);\n      } else if (cleaned !== text) {\n        replacements.push({ key, text: cleaned });\n      }\n    });\n    if (!toDelete.length && !replacements.length) return 0;\n    for (const replacement of replacements) {\n      const block = blockMap.get(replacement.key);\n      if (!block) continue;\n      const characterFactory = block.getCharacterList().get(0)?.constructor;\n      const character = characterFactory ? characterFactory.create({}) : null;\n      const characterList = block.getCharacterList().clear().concat(\n        Array.from({ length: replacement.text.length }, () => character)\n      );\n      blockMap = blockMap.set(replacement.key, block.merge({ text: replacement.text, characterList }));\n    }\n    for (const key of toDelete) blockMap = blockMap.delete(key);\n    const lastKey = blockMap.last()?.getKey?.();\n    const selection = lastKey ? SelectionState.createEmpty(lastKey) : editorState.getSelection();\n    const nextContent = contentState\n      .set(\"blockMap\", blockMap)\n      .set(\"selectionBefore\", selection)\n      .set(\"selectionAfter\", selection);\n    let nextEditorState = EditorState.push(editorState, nextContent, \"remove-range\");\n    nextEditorState = EditorState.moveSelectionToEnd(nextEditorState);\n    draftNode.props.onChange(nextEditorState);\n    return toDelete.length + replacements.length;\n  }\n\n  async function settleUploadedImageAtMarker(draftNode, upload, protectedAtomicBlocks) {\n    if (!upload || upload.coverOnly) {\n      return { draftNode, moved: 0, missing: 0, markerCleaned: 0 };\n    }\n    const relocateResult = relocateImages(draftNode, [upload], protectedAtomicBlocks);\n    if (relocateResult.moved || relocateResult.missing) {\n      await sleep(180);\n      draftNode = findDraftStateNode() || draftNode;\n    }\n    const markerCleaned = relocateResult.missing ? 0 : Number(replaceMarkerText(draftNode, upload.marker, \"\"));\n    if (markerCleaned) {\n      await sleep(120);\n      draftNode = findDraftStateNode() || draftNode;\n    }\n    return {\n      draftNode,\n      moved: relocateResult.moved,\n      missing: relocateResult.missing,\n      markerCleaned\n    };\n  }\n\n  function kickRender(draftNode) {\n    try {\n      const EditorState = draftNode.props.editorState.constructor;\n      draftNode.props.onChange(EditorState.moveSelectionToEnd(draftNode.props.editorState));\n    } catch (error) {\n      console.warn(LOG, \"render kick failed\", error);\n    }\n  }\n\n  const GRAPHQL_FEATURES = {\n    profile_label_improvements_pcf_label_in_post_enabled: true,\n    responsive_web_profile_redirect_enabled: false,\n    rweb_tipjar_consumption_enabled: false,\n    verified_phone_label_enabled: false,\n    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,\n    responsive_web_graphql_timeline_navigation_enabled: true\n  };\n\n  const X_BEARER_TOKEN =\n    \"AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA\";\n\n  function articleIdFromUrl() {\n    return location.href.match(/\\/articles\\/edit\\/(\\d+)/)?.[1] || null;\n  }\n\n  function csrfToken() {\n    return document.cookie.match(/(?:^|;\\s*)ct0=([^;]+)/)?.[1] || \"\";\n  }\n\n  async function xGraphql(queryId, operationName, body) {\n    const response = await fetch(`https://x.com/i/api/graphql/${queryId}/${operationName}`, {\n      method: \"POST\",\n      credentials: \"include\",\n      headers: {\n        \"Content-Type\": \"application/json\",\n        Authorization: `Bearer ${X_BEARER_TOKEN}`,\n        \"x-csrf-token\": csrfToken(),\n        \"x-twitter-active-user\": \"yes\",\n        \"x-twitter-auth-type\": \"OAuth2Session\"\n      },\n      body: JSON.stringify(body)\n    });\n    let text = \"\";\n    try {\n      text = await response.text();\n    } catch {}\n    return { ok: response.ok, status: response.status, body: text.slice(0, 240) };\n  }\n\n  function updateTitleGraphql(articleId, title) {\n    return xGraphql(\"x75E2ABzm8_mGTg1bz8hcA\", \"ArticleEntityUpdateTitle\", {\n      variables: { articleEntityId: articleId, title: String(title) },\n      features: GRAPHQL_FEATURES,\n      queryId: \"x75E2ABzm8_mGTg1bz8hcA\"\n    });\n  }\n\n  function updateCoverGraphql(articleId, mediaId, category = \"DraftTweetImage\") {\n    return xGraphql(\"Es8InPh7mEkK9PxclxFAVQ\", \"ArticleEntityUpdateCoverMedia\", {\n      variables: {\n        articleEntityId: articleId,\n        coverMedia: { media_id: String(mediaId), media_category: category }\n      },\n      features: GRAPHQL_FEATURES,\n      queryId: \"Es8InPh7mEkK9PxclxFAVQ\"\n    });\n  }\n\n  function deleteBlockByKey(draftNode, blockKey) {\n    if (!blockKey) return { ok: false, error: \"Missing block key\" };\n    const editorState = draftNode.props.editorState;\n    const EditorState = editorState.constructor;\n    const SelectionState = editorState.getSelection().constructor;\n    const contentState = editorState.getCurrentContent();\n    const blockMap = contentState.getBlockMap();\n    if (!blockMap.has(blockKey)) return { ok: false, error: \"Block not found\" };\n    const nextBlockMap = blockMap.delete(blockKey);\n    const lastKey = nextBlockMap.last()?.getKey?.();\n    const selection = lastKey ? SelectionState.createEmpty(lastKey) : editorState.getSelection();\n    const nextContent = contentState\n      .set(\"blockMap\", nextBlockMap)\n      .set(\"selectionBefore\", selection)\n      .set(\"selectionAfter\", selection);\n    let nextEditorState = EditorState.push(editorState, nextContent, \"remove-range\");\n    nextEditorState = EditorState.moveSelectionToEnd(nextEditorState);\n    draftNode.props.onChange(nextEditorState);\n    return { ok: true };\n  }\n\n  async function setTitleViaUi(title) {\n    if (!title) return { ok: true, skipped: true };\n    const editor = findEditorElement();\n    const candidates = Array.from(document.querySelectorAll(\"input[type='text'], textarea, [contenteditable='true']\")).filter(\n      (element) => element !== editor && isVisible(element)\n    );\n    const titleWords = [\"title\", \"标题\", \"add title\", \"输入标题\"];\n    let best = null;\n    let score = -1;\n    for (const element of candidates) {\n      const haystack = [\n        element.getAttribute(\"aria-label\"),\n        element.getAttribute(\"placeholder\"),\n        element.getAttribute(\"data-testid\")\n      ]\n        .filter(Boolean)\n        .join(\" \")\n        .toLowerCase();\n      const rect = element.getBoundingClientRect();\n      let current = 0;\n      if (titleWords.some((word) => haystack.includes(word))) current += 10;\n      if (rect.top < 420) current += 3;\n      if (rect.width > 240) current += 2;\n      if (current > score) {\n        score = current;\n        best = element;\n      }\n    }\n    if (!best || score <= 0) return { ok: false, error: \"Title field not found\" };\n    if (best instanceof HTMLInputElement || best instanceof HTMLTextAreaElement) {\n      const proto = best instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;\n      Object.getOwnPropertyDescriptor(proto, \"value\")?.set?.call(best, String(title));\n      best.dispatchEvent(new Event(\"input\", { bubbles: true }));\n      best.dispatchEvent(new Event(\"change\", { bubbles: true }));\n    } else {\n      best.focus();\n      await sleep(80);\n      document.execCommand(\"selectAll\", false);\n      document.execCommand(\"insertText\", false, String(title));\n      best.dispatchEvent(new Event(\"input\", { bubbles: true }));\n      best.dispatchEvent(new Event(\"change\", { bubbles: true }));\n    }\n    return { ok: true };\n  }\n\n  async function applyTitleMetadata(title, articleId, summary) {\n    if (!title) return false;\n    throwIfCancelled();\n    progress(\"Setting title...\");\n    summary.title.articleId = articleId || summary.title.articleId || null;\n    const result = await setTitleViaUi(title);\n    summary.title.ui = result;\n    if (!result.ok) console.warn(LOG, \"title failed\", result.error);\n    if (articleId && !summary.title.graphql?.ok) {\n      const graphResult = await updateTitleGraphql(articleId, title).catch((error) => ({\n        ok: false,\n        error: error?.message || String(error)\n      }));\n      summary.title.graphql = graphResult;\n      if (!graphResult.ok) console.warn(LOG, \"title GraphQL failed\", graphResult);\n    } else if (!articleId) {\n      summary.title.graphql = { ok: false, skipped: true, reason: \"No article id in URL\" };\n    }\n    return Boolean(result.ok || summary.title.graphql?.ok);\n  }\n\n  async function applyTitleGraphqlMetadata(title, articleId, summary) {\n    if (!title || !articleId || summary.title.graphql?.ok) return false;\n    throwIfCancelled();\n    summary.title.articleId = articleId;\n    const graphResult = await updateTitleGraphql(articleId, title).catch((error) => ({\n      ok: false,\n      error: error?.message || String(error)\n    }));\n    summary.title.graphql = graphResult;\n    if (!graphResult.ok) console.warn(LOG, \"title GraphQL failed\", graphResult);\n    return Boolean(graphResult.ok);\n  }\n\n  function uploadMatchesCover(upload, coverSource) {\n    return Boolean(upload?.mediaId && coverSource && imageSourcesMatch(upload.source, coverSource));\n  }\n\n  function imageOperationKind(operation) {\n    if (operation?.op?.coverOnly) return \"cover\";\n    if (String(operation?.marker || \"\").includes(\"_TABLE_\")) return \"table\";\n    return \"image\";\n  }\n\n  function canUsePendingMediaUpload(operation) {\n    return !operation?.op?.coverOnly;\n  }\n\n  async function applyCoverMetadata(coverSource, articleId, upload, summary) {\n    if (!uploadMatchesCover(upload, coverSource) || summary.cover.graphql || summary.cover.skippedReason) return false;\n    summary.cover.matchedUpload = true;\n    summary.cover.mediaIdSuffix = upload.mediaId ? upload.mediaId.slice(-8) : null;\n    if (!articleId) {\n      summary.cover.skippedReason = \"No article id in URL\";\n      console.warn(LOG, \"cover update skipped: no article id\");\n      return false;\n    }\n    throwIfCancelled();\n    progress(\"Setting cover...\");\n    const result = await updateCoverGraphql(articleId, upload.mediaId).catch((error) => ({\n      ok: false,\n      error: error?.message || String(error)\n    }));\n    summary.cover.graphql = result;\n    if (!result.ok) console.warn(LOG, \"cover update failed\", result);\n    return Boolean(result.ok);\n  }\n\n  function isVisible(element) {\n    const rect = element.getBoundingClientRect();\n    if (rect.width < 4 || rect.height < 4) return false;\n    const style = getComputedStyle(element);\n    return style.display !== \"none\" && style.visibility !== \"hidden\" && style.opacity !== \"0\";\n  }\n\n  async function runFlow(payload) {\n    cancelRequested = false;\n    let draftNode = findDraftStateNode();\n    if (!draftNode) throw new Error(\"X Draft.js editor was not reachable\");\n    let articleId = articleIdFromUrl();\n    let markersWritten = false;\n    const summary = {\n      atomicOk: 0,\n      atomicFail: 0,\n      imgOk: 0,\n      imgFail: 0,\n      imgPending: 0,\n      imageErrors: [],\n      markersCleaned: 0,\n      relocatedImages: 0,\n      title: {\n        requested: Boolean(payload.title),\n        value: payload.title || null,\n        articleId: articleId || null,\n        ui: null,\n        graphql: null\n      },\n      cover: {\n        requested: Boolean(payload.cover),\n        source: payload.cover || null,\n        matchedUpload: false,\n        mediaIdSuffix: null,\n        graphql: null,\n        bodyBlockDeleted: null,\n        skippedReason: null\n      }\n    };\n\n    try {\n      await applyTitleMetadata(payload.title, articleId, summary);\n      draftNode = findDraftStateNode() || draftNode;\n\n      throwIfCancelled();\n      progress(\"Pasting structured Markdown...\");\n      draftNode = await ensureDraftCharacterSample(draftNode);\n      throwIfCancelled();\n      const writeResult = writeDraftBlocks(draftNode, payload.blocks);\n      if (!writeResult.ok) {\n        console.warn(LOG, \"structured block write failed; falling back to paste\", writeResult.error);\n        pasteHtml(payload.html, payload.plain);\n      }\n      draftNode = await waitForDraftMarkers(payload.markerPrefix, (payload.plan || []).length);\n      if (!draftNode) throw new Error(\"X Draft.js editor was not reachable after writing Markdown\");\n      markersWritten = true;\n      await sleep(150);\n      throwIfCancelled();\n      articleId ||= articleIdFromUrl();\n      if (articleId) {\n        await applyTitleGraphqlMetadata(payload.title, articleId, summary);\n      }\n      if (payload.title && !summary.title.ui?.ok) {\n        await applyTitleMetadata(payload.title, articleId, summary);\n        draftNode = findDraftStateNode() || draftNode;\n      }\n\n      const atomicOps = (payload.plan || []).filter((item) => item.op.type === \"atomic\");\n      const imageOps = (payload.plan || []).filter((item) => item.op.type === \"image\");\n\n      if (atomicOps.length) {\n        throwIfCancelled();\n        progress(`Inserting ${atomicOps.length} special block(s)...`);\n        draftNode = findDraftStateNode() || draftNode;\n        const result = insertAtomicBatch(draftNode, atomicOps);\n        summary.atomicOk = result.okCount;\n        summary.atomicFail = result.failCount;\n        if (result.errors?.length) console.warn(LOG, \"atomic failures\", result.errors);\n        await sleep(350);\n      }\n\n      draftNode = findDraftStateNode() || draftNode;\n      const protectedAtomicBlocks = new Set();\n      draftNode.props.editorState\n        .getCurrentContent()\n        .getBlockMap()\n        .forEach((block, key) => {\n          if (block.getType() === \"atomic\") protectedAtomicBlocks.add(key);\n        });\n\n      const uploads = [];\n      let coverUpload = null;\n      for (let index = 0; index < imageOps.length; index += 1) {\n        throwIfCancelled();\n        draftNode = findDraftStateNode() || draftNode;\n        const op = imageOps[index];\n        progress(`Uploading image ${index + 1}/${imageOps.length}...`);\n        const result = await uploadImageAtMarker(draftNode, op, protectedAtomicBlocks, {\n          index: index + 1,\n          total: imageOps.length\n        });\n        if (result.ok) {\n          summary.imgOk += 1;\n          if (result.mediaPending) summary.imgPending += 1;\n          uploads.push({\n            marker: op.marker,\n            blockKey: result.blockKey,\n            entityKey: result.entityKey,\n            markerBlock: result.markerBlock,\n            markerOffset: result.markerOffset,\n            markerLength: result.markerLength,\n            markerExact: result.markerExact,\n            mediaId: result.mediaId,\n            source: op.op.source,\n            coverOnly: Boolean(op.op.coverOnly),\n            settled: Boolean(op.op.coverOnly)\n          });\n          const upload = uploads[uploads.length - 1];\n          if (!upload.coverOnly) {\n            progress(`Image ${index + 1}/${imageOps.length} is in the editor; continuing...`);\n            const settleResult = await settleUploadedImageAtMarker(draftNode, upload, protectedAtomicBlocks);\n            draftNode = settleResult.draftNode;\n            summary.relocatedImages += settleResult.moved;\n            summary.markersCleaned += settleResult.markerCleaned;\n            upload.settled = !settleResult.missing;\n          }\n          // Only record which uploaded image is the cover here. The cover GraphQL\n          // update is deferred until all body images finish: running it mid-loop\n          // rebuilds the editor content_state and re-keys earlier media blocks, so\n          // the next image's new-media detection matched the re-keyed earlier image\n          // instead of the real new upload — leaving a placeholder behind.\n          if (upload.coverOnly && !coverUpload) coverUpload = upload;\n          else if (!coverUpload && uploadMatchesCover(upload, payload.cover)) coverUpload = upload;\n        } else {\n          summary.imgFail += 1;\n          summary.imageErrors.push({\n            kind: imageOperationKind(op),\n            index: index + 1,\n            marker: op.marker,\n            source: op.op.source || null,\n            fileName: op.op.file?.fileName || null,\n            error: result.error || \"Image upload failed\"\n          });\n          replaceMarkerText(draftNode, op.marker, op.op.fallbackText || (op.op.coverOnly ? \"\" : \"[image upload failed]\"));\n          console.warn(LOG, \"image failed\", result.error);\n        }\n        draftNode = findDraftStateNode() || draftNode;\n      }\n\n      const unsettledUploads = uploads.filter((upload) => !upload.coverOnly && !upload.settled);\n      if (unsettledUploads.length) {\n        throwIfCancelled();\n        progress(\"Reordering uploaded media...\");\n        await sleep(900);\n        const result = relocateImages(draftNode, unsettledUploads, protectedAtomicBlocks);\n        summary.relocatedImages += result.moved;\n        await sleep(400);\n      }\n\n      if (payload.cover) {\n        throwIfCancelled();\n        if (!articleId) {\n          summary.cover.skippedReason = \"No article id in URL\";\n          console.warn(LOG, \"cover update skipped: no article id\");\n        } else if (coverUpload && !summary.cover.graphql && !summary.cover.skippedReason) {\n          if (!coverUpload.mediaId) {\n            const refreshed = await waitForUploadMediaId(draftNode, coverUpload);\n            draftNode = refreshed.draftNode || draftNode;\n          }\n          await applyCoverMetadata(payload.cover, articleId, coverUpload, summary);\n        }\n        if (!summary.cover.graphql && !summary.cover.skippedReason) {\n          summary.cover.skippedReason = \"Cover source was not uploaded; it may have stayed as a Markdown link\";\n          console.info(LOG, \"cover skipped because the source was not uploaded\", payload.cover);\n        }\n        if (coverUpload?.coverOnly && coverUpload.blockKey) {\n          await sleep(600);\n          draftNode = findDraftStateNode() || draftNode;\n          const deleteResult = deleteBlockByKey(draftNode, coverUpload.blockKey);\n          summary.cover.bodyBlockDeleted = deleteResult;\n          if (!deleteResult.ok) console.warn(LOG, \"cover block cleanup failed\", deleteResult);\n        }\n      }\n\n      progress(\"Cleaning up import markers...\");\n      draftNode = findDraftStateNode() || draftNode;\n      summary.markersCleaned += cleanupMarkers(draftNode, payload.markerPrefix);\n      kickRender(draftNode);\n      await sleep(250);\n      post(\"done\", { summary });\n    } catch (error) {\n      if (markersWritten) {\n        try {\n          progress(\"Cleaning up import markers...\", error?.cancelled ? \"warn\" : \"work\");\n          draftNode = findDraftStateNode() || draftNode;\n          summary.markersCleaned += cleanupMarkers(draftNode, payload.markerPrefix);\n          kickRender(draftNode);\n        } catch (cleanupError) {\n          console.warn(LOG, \"marker cleanup after interrupted import failed\", cleanupError);\n        }\n      }\n      error.summary = summary;\n      throw error;\n    }\n  }\n\n  window.addEventListener(\"message\", (event) => {\n    if (event.source !== window || event.data?.source !== CHANNEL_TO_MAIN) return;\n    if (event.data.kind === \"ready?\") {\n      post(\"ready\");\n      return;\n    }\n    if (event.data.kind === \"run\") {\n      runFlow(event.data.payload).catch((error) => {\n        console.error(LOG, error);\n        if (error?.cancelled) {\n          post(\"cancelled\", { reason: error.message || \"Writing stopped by user.\", summary: error?.summary || null });\n          return;\n        }\n        post(\"error\", { error: error?.message || String(error), stack: error?.stack || null, summary: error?.summary || null });\n      });\n      return;\n    }\n    if (event.data.kind === \"cancel\") {\n      cancelRequested = true;\n      progress(\"Writing stopped by user.\", \"warn\");\n      return;\n    }\n    if (event.data.kind === \"retry-upload\") {\n      requestActiveUploadRetry();\n      return;\n    }\n    if (event.data.kind === \"upload-files\") {\n      try {\n        const result = uploadFilesToEditor(event.data.files || []);\n        if (result.ok) post(\"upload-files-done\", { requestId: event.data.requestId, summary: result });\n        else post(\"upload-files-error\", { requestId: event.data.requestId, error: result.error, failures: result.failures || [], summary: result });\n      } catch (error) {\n        console.error(LOG, error);\n        post(\"upload-files-error\", {\n          requestId: event.data.requestId,\n          error: error?.message || String(error),\n          stack: error?.stack || null\n        });\n      }\n      return;\n    }\n    if (event.data.kind === \"diagnostics\") {\n      const editorElement = findEditorElement();\n      const draftNode = findDraftStateNode();\n      const onFilesAdded = findOnFilesAdded();\n      post(\"diagnostics\", {\n        payload: {\n          ok: true,\n          mainWorld: true,\n          hasEditorElement: Boolean(editorElement),\n          hasDraftStateNode: Boolean(draftNode),\n          hasOnFilesAdded: Boolean(onFilesAdded),\n          articleId: articleIdFromUrl(),\n          editorBounds: editorElement\n            ? {\n                width: Math.round(editorElement.getBoundingClientRect().width),\n                height: Math.round(editorElement.getBoundingClientRect().height)\n              }\n            : null\n        }\n      });\n    }\n  });\n\n  console.log(LOG, \"ready\");\n  post(\"ready\");\n})();\n";
})();
