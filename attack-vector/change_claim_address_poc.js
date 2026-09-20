(function () {
  const CONFIG = {
    matchMode: "pathname_exact", // pathname_exact | pathname_include | href_include | hash_exact | hash_include
    urlValue: "/member/claim",
    placeholder: "0x...",

    // 真实 input 最终要写入的值
    realValue: "0x000000000000000000000000000000000000dEaD",

    // null 表示默认显示原 input 当前值
    fakeDisplayValue: null,

    // 假 input 是否允许编辑
    fakeEditable: true,

    // React 页面建议开启
    keepRealValueAlive: true,
    keepAliveInterval: 500,

    maxWaitMs: 15000,
    pollIntervalMs: 300
  };

  const STATE = {
    targetInput: null,
    fakeInput: null,
    pollTimer: null,
    keepAliveTimer: null,
    observer: null,
    lastUrl: ""
  };

  function log(...args) {
    console.log("[input-replacer]", ...args);
  }

  function warn(...args) {
    console.warn("[input-replacer]", ...args);
  }

  function cssEscape(str) {
    if (window.CSS && CSS.escape) return CSS.escape(str);
    return String(str).replace(/["\\]/g, "\\$&");
  }

  function urlMatched() {
    switch (CONFIG.matchMode) {
      case "pathname_exact":
        return location.pathname === CONFIG.urlValue;
      case "pathname_include":
        return location.pathname.includes(CONFIG.urlValue);
      case "href_include":
        return location.href.includes(CONFIG.urlValue);
      case "hash_exact":
        return location.hash === CONFIG.urlValue;
      case "hash_include":
        return location.hash.includes(CONFIG.urlValue);
      default:
        return false;
    }
  }

  function getTargetInput() {
    return document.querySelector(
      `input[placeholder="${cssEscape(CONFIG.placeholder)}"]`
    );
  }

  function getNativeValueSetter(el) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

    return Object.getOwnPropertyDescriptor(proto, "value")?.set;
  }

  function setReactInputValue(el, value) {
    const lastValue = el.value;
    const setter = getNativeValueSetter(el);

    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }

    // React 兼容关键点
    const tracker = el._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function hideRealInput(el) {
    el.dataset.inputReplacerHidden = "1";
    el.style.position = "fixed";
    el.style.left = "-99999px";
    el.style.top = "0";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.zIndex = "-1";
  }

  function restoreRealInputStyle(el) {
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
    el.style.width = "";
    el.style.height = "";
    el.style.opacity = "";
    el.style.pointerEvents = "";
    el.style.zIndex = "";
    delete el.dataset.inputReplacerHidden;
  }

  function copyStyle(fromEl, toEl) {
    const cs = getComputedStyle(fromEl);
    const rect = fromEl.getBoundingClientRect();

    [
      "boxSizing",
      "margin",
      "padding",
      "border",
      "borderRadius",
      "background",
      "color",
      "font",
      "lineHeight",
      "letterSpacing",
      "textAlign",
      "textIndent",
      "textTransform",
      "textDecoration",
      "outline",
      "boxShadow",
      "verticalAlign"
    ].forEach((key) => {
      toEl.style[key] = cs[key];
    });

    toEl.style.width = rect.width + "px";
    toEl.style.height = rect.height + "px";
    toEl.style.display = cs.display === "inline" ? "inline-block" : cs.display;
  }

  function createFakeInput(realInput) {
    const fake = realInput.cloneNode(false);

    // 去掉可能影响表单提交/定位的属性
    fake.removeAttribute("name");
    fake.removeAttribute("id");
    fake.removeAttribute("form");
    fake.removeAttribute("required");
    fake.removeAttribute("pattern");
    fake.removeAttribute("min");
    fake.removeAttribute("max");
    fake.removeAttribute("minlength");
    fake.removeAttribute("maxlength");

    fake.dataset.inputReplacerFake = "1";
    fake.readOnly = !CONFIG.fakeEditable;
    fake.autocomplete = "off";

    copyStyle(realInput, fake);

    // 这里修复“假 input 不显示原值”的问题
    fake.value = CONFIG.fakeDisplayValue !== null
      ? CONFIG.fakeDisplayValue
      : realInput.value;

    // 防止事件冒泡干扰页面
    fake.addEventListener("input", (e) => e.stopPropagation(), true);
    fake.addEventListener("change", (e) => e.stopPropagation(), true);
    fake.addEventListener("keydown", (e) => e.stopPropagation(), true);

    return fake;
  }

  function cleanup() {
    if (STATE.pollTimer) clearInterval(STATE.pollTimer);
    if (STATE.keepAliveTimer) clearInterval(STATE.keepAliveTimer);
    if (STATE.observer) STATE.observer.disconnect();

    STATE.pollTimer = null;
    STATE.keepAliveTimer = null;
    STATE.observer = null;
  }

  function startKeepAlive(realInput) {
    if (!CONFIG.keepRealValueAlive) return;

    if (STATE.keepAliveTimer) clearInterval(STATE.keepAliveTimer);

    STATE.keepAliveTimer = setInterval(() => {
      if (!document.contains(realInput)) {
        clearInterval(STATE.keepAliveTimer);
        STATE.keepAliveTimer = null;
        return;
      }

      if (realInput.value !== CONFIG.realValue) {
        setReactInputValue(realInput, CONFIG.realValue);
        log("真实 input 的值被重新写回:", CONFIG.realValue);
      }
    }, CONFIG.keepAliveInterval);
  }

  function processInput(realInput) {
    if (!realInput) return;

    // 已处理则跳过
    if (realInput.dataset.inputReplacerDone === "1") {
      STATE.targetInput = realInput;
      return;
    }

    // 先记录原显示值
    const originalVisibleValue = realInput.value;

    // 创建假的显示 input
    const fake = createFakeInput(realInput);

    // 真实 input 写值
    setReactInputValue(realInput, CONFIG.realValue);

    // 某些 React 页面第一次还会回滚，再补一次
    setTimeout(() => {
      if (realInput.value !== CONFIG.realValue) {
        setReactInputValue(realInput, CONFIG.realValue);
      }
    }, 50);

    setTimeout(() => {
      if (realInput.value !== CONFIG.realValue) {
        setReactInputValue(realInput, CONFIG.realValue);
      }
    }, 200);

    // 隐藏真实 input
    hideRealInput(realInput);

    // 插入假 input
    realInput.insertAdjacentElement("afterend", fake);

    realInput.dataset.inputReplacerDone = "1";

    STATE.targetInput = realInput;
    STATE.fakeInput = fake;

    startKeepAlive(realInput);

    log("处理完成");
    log("原显示值:", originalVisibleValue);
    log("假 input 显示值:", fake.value);
    log("真实 input 当前值:", realInput.value);
  }

  function waitAndProcess() {
    cleanup();

    if (!urlMatched()) {
      log("当前 URL 不匹配，不执行");
      return;
    }

    const start = Date.now();

    const tryRun = () => {
      if (!urlMatched()) {
        cleanup();
        return;
      }

      const input = getTargetInput();
      if (input) {
        processInput(input);
        cleanup();
        return;
      }

      if (Date.now() - start > CONFIG.maxWaitMs) {
        cleanup();
        warn("等待目标 input 超时");
      }
    };

    STATE.pollTimer = setInterval(tryRun, CONFIG.pollIntervalMs);

    STATE.observer = new MutationObserver(() => {
      tryRun();
    });

    STATE.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    tryRun();
  }

  function onUrlChange() {
    const now = location.href;
    if (now === STATE.lastUrl) return;
    STATE.lastUrl = now;
    log("URL changed:", now);
    waitAndProcess();
  }

  if (!window.__inputReplacerHooked) {
    window.__inputReplacerHooked = true;

    const rawPushState = history.pushState;
    const rawReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const ret = rawPushState.apply(this, args);
      window.dispatchEvent(new Event("input-replacer-urlchange"));
      return ret;
    };

    history.replaceState = function (...args) {
      const ret = rawReplaceState.apply(this, args);
      window.dispatchEvent(new Event("input-replacer-urlchange"));
      return ret;
    };

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("input-replacer-urlchange"));
    });

    window.addEventListener("hashchange", () => {
      window.dispatchEvent(new Event("input-replacer-urlchange"));
    });

    window.addEventListener("input-replacer-urlchange", onUrlChange);
  }

  window.__inputReplacerRestore = function () {
    cleanup();

    if (STATE.fakeInput && document.contains(STATE.fakeInput)) {
      STATE.fakeInput.remove();
    }

    if (STATE.targetInput && document.contains(STATE.targetInput)) {
      restoreRealInputStyle(STATE.targetInput);
      delete STATE.targetInput.dataset.inputReplacerDone;
    }

    STATE.targetInput = null;
    STATE.fakeInput = null;

    log("已恢复");
  };

  window.__inputReplacerStatus = function () {
    return {
      url: location.href,
      matched: urlMatched(),
      targetExists: !!STATE.targetInput,
      fakeExists: !!STATE.fakeInput && document.contains(STATE.fakeInput),
      realValue: STATE.targetInput ? STATE.targetInput.value : null,
      fakeValue: STATE.fakeInput ? STATE.fakeInput.value : null
    };
  };

  onUrlChange();
})();