// User catalog navigation, selection state, and configuration submit flow.
function defaultLineState() {
  return {
    quantity: 1,
    targetAp: null,
    moduleQty: {},
    licenseQty: {},
    licPickOrder: [],
    modPickOrder: [],
    serviceTier: "none",
    serviceProductId: null,
    accessoryQty: {},
    parentProductId: null,
    parentContributions: null,
  };
}

function isAccessoryConfigLine(st) {
  if (!st) return false;
  if (st.parentProductId != null) return true;
  return !!(
    st.parentContributions &&
    Object.keys(st.parentContributions).length > 0
  );
}

function removeParentAccessoryContributions(parentId) {
  const parentKey = String(parentId);
  for (const [accId, accSt] of [...configLineState.entries()]) {
    if (accSt.parentContributions) continue;
    if (Number(accSt.parentProductId) === Number(parentId)) {
      configLineState.delete(Number(accId));
      licenseSuggestFeedbackByProductId.delete(Number(accId));
    }
  }
  for (const [accId, accSt] of [...configLineState.entries()]) {
    const contributions = accSt.parentContributions;
    if (!contributions || contributions[parentKey] == null) continue;
    accSt.quantity =
      (Number(accSt.quantity) || 0) - Number(contributions[parentKey]);
    delete contributions[parentKey];
    if (accSt.quantity <= 0) {
      configLineState.delete(Number(accId));
      licenseSuggestFeedbackByProductId.delete(Number(accId));
      continue;
    }
    const parentIds = Object.keys(contributions);
    accSt.parentProductId =
      parentIds.length === 1 ? Number(parentIds[0]) : null;
  }
}

function reconcileAccessoryLinesForParent(parentId) {
  const parentSt = ensureLineState(parentId);
  const parentQty =
    Number.isFinite(Number(parentSt.quantity)) && Number(parentSt.quantity) > 0
      ? Number(parentSt.quantity)
      : 1;

  removeParentAccessoryContributions(parentId);

  for (const [aid, unitQty] of Object.entries(parentSt.accessoryQty || {})) {
    const accessoryId = Number(aid);
    const perUnit = Number(unitQty);
    if (
      !Number.isFinite(accessoryId) ||
      !Number.isFinite(perUnit) ||
      perUnit < 1
    ) {
      continue;
    }
    const addQty = perUnit * parentQty;
    let accSt = configLineState.get(accessoryId);
    if (!accSt) {
      accSt = defaultLineState();
      accSt.parentContributions = {};
      configLineState.set(accessoryId, accSt);
    }
    if (!accSt.parentContributions) {
      accSt.parentContributions = {};
    }
    accSt.parentContributions[String(parentId)] = addQty;
    accSt.quantity = Object.values(accSt.parentContributions).reduce(
      (sum, qty) => sum + Number(qty),
      0
    );
    const parentIds = Object.keys(accSt.parentContributions);
    accSt.parentProductId =
      parentIds.length === 1 ? Number(parentIds[0]) : null;
  }
}

function accessoryIsSelected(st, productId) {
  const id = Number(productId);
  return Number(st.accessoryQty?.[id] || 0) > 0;
}

function getAccessoryUnitQty(st, productId) {
  const id = Number(productId);
  const qty = Number(st.accessoryQty?.[id] || 0);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

function setAccessoryUnitQty(st, productId, qty) {
  const id = Number(productId);
  if (!st.accessoryQty || typeof st.accessoryQty !== "object") {
    st.accessoryQty = {};
  }
  const n = Number(qty);
  if (!Number.isFinite(n) || n < 1) {
    delete st.accessoryQty[id];
  } else {
    st.accessoryQty[id] = Math.floor(n);
  }
}

function shouldUseEquipmentPickerModal() {
  return getCurrentRoleId() === 2;
}

function orderedServiceAddons(st) {
  if (!st || !st.serviceProductId || st.serviceTier === "none") return [];
  return [
    {
      service_product_id: Number(st.serviceProductId),
      quantity: 1,
    },
  ];
}

function touchLicensePickOrder(st, licenseId, qty) {
  const id = Number(licenseId);
  if (!st.licPickOrder) st.licPickOrder = [];
  const idx = st.licPickOrder.indexOf(id);
  if (qty > 0) {
    if (idx >= 0) st.licPickOrder.splice(idx, 1);
    st.licPickOrder.push(id);
  } else if (idx >= 0) {
    st.licPickOrder.splice(idx, 1);
  }
}

function touchModulePickOrder(st, moduleId, qty) {
  const id = Number(moduleId);
  if (!st.modPickOrder) st.modPickOrder = [];
  const idx = st.modPickOrder.indexOf(id);
  if (qty > 0) {
    if (idx >= 0) st.modPickOrder.splice(idx, 1);
    st.modPickOrder.push(id);
  } else if (idx >= 0) {
    st.modPickOrder.splice(idx, 1);
  }
}

function computeModuleQtySum(st) {
  let s = 0;
  for (const k of Object.keys(st.moduleQty || {})) {
    const q = Number(st.moduleQty[k]);
    if (q > 0) s += q;
  }
  return s;
}

/** @returns {{license_id:number,quantity:number}[]} */
function orderedLicenseAddons(st) {
  const out = [];
  const seen = new Set();
  for (const lid of st.licPickOrder || []) {
    const qty = Number(st.licenseQty[lid]);
    if (qty > 0) {
      out.push({ license_id: Number(lid), quantity: qty });
      seen.add(Number(lid));
    }
  }
  for (const lid of Object.keys(st.licenseQty || {})) {
    const n = Number(lid);
    if (!seen.has(n) && Number(st.licenseQty[lid]) > 0) {
      out.push({ license_id: n, quantity: Number(st.licenseQty[lid]) });
    }
  }
  return out;
}

/** @returns {{module_id:number,quantity:number}[]} */
function orderedModuleAddons(st) {
  const out = [];
  const seen = new Set();
  for (const mid of st.modPickOrder || []) {
    const qty = Number(st.moduleQty[mid]);
    if (qty > 0) {
      out.push({ module_id: Number(mid), quantity: qty });
      seen.add(Number(mid));
    }
  }
  for (const mid of Object.keys(st.moduleQty || {})) {
    const n = Number(mid);
    if (!seen.has(n) && Number(st.moduleQty[mid]) > 0) {
      out.push({ module_id: n, quantity: Number(st.moduleQty[mid]) });
    }
  }
  return out;
}

function ensureLineState(productId) {
  if (!configLineState.has(productId)) {
    configLineState.set(productId, defaultLineState());
  }
  return configLineState.get(productId);
}

function rememberConfigProduct(row) {
  const id = Number(row?.product_id != null ? row.product_id : row?.id);
  if (!Number.isFinite(id)) return;
  const name = (row?.name || "").trim();
  configProductCache.set(id, {
    id,
    name: name || catT("Позиция #", "Line #") + id,
    description: row?.description || "",
    product_category: row?.product_category || null,
  });
}

function productForConfigLine(productId) {
  const id = Number(productId);
  const found = products.find((p) => Number(p.id) === id);
  if (found) {
    rememberConfigProduct(found);
    return found;
  }
  const cached = configProductCache.get(id);
  if (cached) return cached;
  return {
    id,
    name: catT("Позиция #", "Line #") + id,
  };
}

function closeEquipmentPickerOverlayOnly() {
  const overlay = elements.equipmentPickerOverlay;
  const body = elements.equipmentPickerBody;
  if (overlay) overlay.hidden = true;
  if (body) body.innerHTML = "";
  equipmentPickerProductId = null;
}

function removeProductFromConfiguration(productId) {
  const pid = Number(productId);
  const st = configLineState.get(pid);
  if (st && isAccessoryConfigLine(st)) {
    for (const parentId of Object.keys(st.parentContributions || {})) {
      const parentSt = configLineState.get(Number(parentId));
      if (parentSt?.accessoryQty) {
        delete parentSt.accessoryQty[pid];
      }
    }
    if (st.parentProductId != null) {
      const parentSt = configLineState.get(Number(st.parentProductId));
      if (parentSt?.accessoryQty) {
        delete parentSt.accessoryQty[pid];
      }
    }
    configLineState.delete(pid);
    licenseSuggestFeedbackByProductId.delete(pid);
  } else {
    removeParentAccessoryContributions(pid);
    configLineState.delete(pid);
    licenseSuggestFeedbackByProductId.delete(pid);
    for (const [, lineState] of configLineState.entries()) {
      if (!lineState.accessoryQty) continue;
      delete lineState.accessoryQty[pid];
    }
  }
  if (equipmentPickerProductId === pid) {
    closeEquipmentPickerOverlayOnly();
  }
  renderSelectedPills();
  renderProducts();
  updateCounter();
}

function clearAllConfigurationSelections() {
  configLineState = new Map();
  licenseSuggestFeedbackByProductId = new Map();
  closeEquipmentPickerOverlayOnly();
  clearConfigSelectionDraftStorage();
  renderSelectedPills();
  renderProducts();
  updateCounter();
}

function getConfigSelectionDraftStorageKey() {
  if (getCurrentRoleId() !== 2 || !accessToken) return null;
  const data = parseJwt(accessToken);
  const userId = data && data.sub != null ? Number(data.sub) : null;
  if (!userId || userId <= 0) return null;
  return CONFIG_SELECTION_DRAFT_PREFIX + userId;
}

function serializeLineStateForDraft(st) {
  return {
    quantity: Number(st.quantity) > 0 ? Number(st.quantity) : 1,
    targetAp:
      st.targetAp != null && Number(st.targetAp) > 0 ? Number(st.targetAp) : null,
    moduleQty: st.moduleQty || {},
    licenseQty: st.licenseQty || {},
    licPickOrder: Array.isArray(st.licPickOrder) ? st.licPickOrder.slice() : [],
    modPickOrder: Array.isArray(st.modPickOrder) ? st.modPickOrder.slice() : [],
    serviceTier: st.serviceTier || "none",
    serviceProductId:
      st.serviceProductId != null ? Number(st.serviceProductId) : null,
    accessoryQty: st.accessoryQty || {},
    parentProductId:
      st.parentProductId != null ? Number(st.parentProductId) : null,
    parentContributions: st.parentContributions
      ? { ...st.parentContributions }
      : null,
  };
}

function deserializeLineStateFromDraft(raw) {
  const st = defaultLineState();
  if (!raw || typeof raw !== "object") return st;
  if (Number.isFinite(Number(raw.quantity)) && Number(raw.quantity) > 0) {
    st.quantity = Number(raw.quantity);
  }
  if (raw.targetAp != null && Number(raw.targetAp) > 0) {
    st.targetAp = Number(raw.targetAp);
  }
  st.moduleQty =
    raw.moduleQty && typeof raw.moduleQty === "object" ? { ...raw.moduleQty } : {};
  st.licenseQty =
    raw.licenseQty && typeof raw.licenseQty === "object" ? { ...raw.licenseQty } : {};
  st.licPickOrder = Array.isArray(raw.licPickOrder)
    ? raw.licPickOrder.map((x) => Number(x)).filter((x) => Number.isFinite(x))
    : [];
  st.modPickOrder = Array.isArray(raw.modPickOrder)
    ? raw.modPickOrder.map((x) => Number(x)).filter((x) => Number.isFinite(x))
    : [];
  st.serviceTier = raw.serviceTier || "none";
  st.serviceProductId =
    raw.serviceProductId != null && Number(raw.serviceProductId) > 0
      ? Number(raw.serviceProductId)
      : null;
  st.accessoryQty =
    raw.accessoryQty && typeof raw.accessoryQty === "object"
      ? { ...raw.accessoryQty }
      : {};
  st.parentProductId =
    raw.parentProductId != null && Number(raw.parentProductId) > 0
      ? Number(raw.parentProductId)
      : null;
  st.parentContributions =
    raw.parentContributions && typeof raw.parentContributions === "object"
      ? { ...raw.parentContributions }
      : null;
  return st;
}

function clearConfigSelectionDraftStorage() {
  const key = getConfigSelectionDraftStorageKey();
  if (key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore quota / private mode
    }
  }
}

function persistConfigSelectionDraft() {
  const key = getConfigSelectionDraftStorageKey();
  if (!key) return;
  try {
    if (configLineState.size === 0) {
      localStorage.removeItem(key);
      return;
    }
    const products = {};
    for (const pid of configLineState.keys()) {
      rememberConfigProduct(productForConfigLine(pid));
      const cached = configProductCache.get(Number(pid));
      if (cached) {
        products[String(pid)] = cached;
      }
    }
    const lines = [];
    for (const [pid, st] of configLineState.entries()) {
      lines.push([Number(pid), serializeLineStateForDraft(st)]);
    }
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, lines, products })
    );
  } catch (e) {
    console.warn("Could not persist configuration draft:", e);
  }
}

function schedulePersistConfigSelectionDraft() {
  if (getCurrentRoleId() !== 2) return;
  if (persistConfigDraftTimer) {
    clearTimeout(persistConfigDraftTimer);
  }
  persistConfigDraftTimer = setTimeout(() => {
    persistConfigDraftTimer = null;
    persistConfigSelectionDraft();
  }, 250);
}

function restoreConfigSelectionDraft() {
  if (getCurrentRoleId() !== 2) return false;
  const key = getConfigSelectionDraftStorageKey();
  if (!key) return false;
  let raw = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return false;
  }
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.lines)) return false;
    const next = new Map();
    for (const row of parsed.lines) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const pid = Number(row[0]);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      next.set(pid, deserializeLineStateFromDraft(row[1]));
    }
    if (parsed.products && typeof parsed.products === "object") {
      for (const snap of Object.values(parsed.products)) {
        rememberConfigProduct(snap);
      }
    }
    if (next.size === 0) return false;
    configLineState = next;
    return true;
  } catch (e) {
    console.warn("Could not restore configuration draft:", e);
    return false;
  }
}

/**
 * Shared modal confirm (works in embedded browsers that block window.confirm).
 * @returns {Promise<boolean>}
 */
function userConfirmRemoveLine(lineLabel) {
  const label = String(lineLabel || "").trim() || catT("эту позицию", "this line");
  return appConfirmDialog({
    message: catT(
      "Убрать «" + label + "» из конфигурации?",
      'Remove "' + label + '" from the configuration?'
    ),
    confirmLabel: catT("Убрать", "Remove"),
    cancelLabel: catT("Отмена", "Cancel"),
    danger: true,
  });
}

/** Same label as in user configurator (license line). */
function formatLicenseUserLabel(lic) {
  const pack = lic.units_per_pack != null ? lic.units_per_pack : 1;
  return (
    lic.name +
    " (" +
    pack +
    catT(" AP / пакет", " AP per pack") +
    ")"
  );
}

/** Same label as in user configurator (module line). */
function formatModuleUserLabel(m) {
  const speed = m.speed_gbps != null ? m.speed_gbps + " Gbps" : "—";
  const ff = m.form_factor || "—";
  return m.name + " · " + speed + " · " + ff;
}

function isProductSelected(productId) {
  return configLineState.has(productId);
}

function selectionPillCaption(p) {
  const debugUi = document.body.classList.contains("debug-ui-on");
  const st = ensureLineState(p.id);
  if (debugUi) {
    return p.name + " (id=" + p.id + ")";
  }
  if (st.parentProductId != null || isAccessoryConfigLine(st)) {
    const qty = Number(st.quantity);
    const count = Number.isFinite(qty) && qty > 0 ? qty : 1;
    return p.name + " × " + count;
  }
  const opt = optionsCache[p.id];
  const licById = {};
  if (opt && opt.licenses) {
    for (const l of opt.licenses) licById[l.id] = l;
  }
  const modById = {};
  if (opt && opt.modules) {
    for (const m of opt.modules) modById[m.id] = m;
  }
  const chunks = [];
  const qty = Number(st.quantity);
  if (Number.isFinite(qty) && qty > 1) {
    chunks.push(catT("кол-во ", "qty ") + qty);
  }
  if (st.targetAp != null && st.targetAp > 0) {
    chunks.push(
      catT("цель ", "target ") + st.targetAp + " AP"
    );
  }
  const licSeen = new Set();
  for (const lid of st.licPickOrder || []) {
    const q = Number(st.licenseQty[lid]);
    if (q > 0 && licById[lid]) {
      chunks.push(formatLicenseUserLabel(licById[lid]) + " ×" + q);
      licSeen.add(Number(lid));
    }
  }
  for (const lid of Object.keys(st.licenseQty || {})) {
    const n = Number(lid);
    const q = Number(st.licenseQty[lid]);
    if (q > 0 && !licSeen.has(n)) {
      const L = licById[n];
      chunks.push(
        (L ? formatLicenseUserLabel(L) : catT("лицензия ", "license ") + n) +
          " ×" +
          q
      );
      licSeen.add(n);
    }
  }
  const modSeen = new Set();
  for (const mid of st.modPickOrder || []) {
    const q = Number(st.moduleQty[mid]);
    if (q > 0 && modById[mid]) {
      chunks.push(formatModuleUserLabel(modById[mid]) + " ×" + q);
      modSeen.add(Number(mid));
    }
  }
  for (const mid of Object.keys(st.moduleQty || {})) {
    const n = Number(mid);
    const q = Number(st.moduleQty[mid]);
    if (q > 0 && !modSeen.has(n)) {
      const M = modById[n];
      chunks.push(
        (M ? formatModuleUserLabel(M) : catT("модуль ", "module ") + n) +
          " ×" +
          q
      );
      modSeen.add(n);
    }
  }
  if (st.serviceTier && st.serviceTier !== "none" && st.serviceProductId) {
    chunks.push(
      st.serviceTier === "extended"
        ? catT("сервис VPSN", "service VPSN")
        : catT("сервис VPS", "service VPS")
    );
  }
  if (chunks.length === 0) return p.name;
  return p.name + " · " + chunks.join(" · ");
}

function addonCountForProduct(p) {
  return p.addon_options_count != null ? p.addon_options_count : 0;
}

function extractSupportDuration(text) {
  if (!text) return null;
  const m = String(text).match(
    /на\s+(\d+)\s+(год|года|лет|year|years|month|months|мес(?:яц|яца|яцев)?)/i
  );
  if (!m) return null;
  return m[1] + " " + m[2].toLowerCase();
}

/** Break description after ". " so long catalog text is easier to scan. */
function formatProductDescriptionForDisplay(text) {
  if (text == null) return "";
  const raw = String(text).trim();
  if (!raw) return "";
  return raw.replace(/\.\s+/g, ".\n");
}

function formatSupportOptionLabel(svc) {
  if (!svc) return "—";
  const name = svc.article || "—";
  const dur =
    svc.support_duration || extractSupportDuration(svc.description || "");
  if (!dur) return name;
  return name + " · " + catT("срок ", "term ") + dur;
}

function renderLicenseSuggestFeedbackHost(productId, host) {
  host.innerHTML = "";
  const entry = licenseSuggestFeedbackByProductId.get(productId);
  if (!entry || !entry.message) return;
  const div = document.createElement("div");
  div.className = "status-text " + (entry.type || "info");
  div.textContent = entry.message;
  host.appendChild(div);
}

async function renderAddonPanel(panel, p) {
  panel.innerHTML = "";
  const loading = document.createElement("div");
  loading.className = "status-text info";
  loading.textContent = catT("Загрузка опций…", "Loading options…");
  panel.appendChild(loading);

  let data;
  try {
    if (!optionsCache[p.id]) {
      const r = await apiFetch("/products/" + p.id + "/compatible-addons", {
        __globalLoading: false,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      optionsCache[p.id] = await r.json();
    }
    data = optionsCache[p.id];
    rememberConfigProduct(p);
    if (data.support?.standard) {
      rememberConfigProduct({
        id: data.support.standard.product_id,
        name: data.support.standard.article,
        description: data.support.standard.description,
        product_category: "VPS",
      });
    }
    if (data.support?.extended) {
      rememberConfigProduct({
        id: data.support.extended.product_id,
        name: data.support.extended.article,
        description: data.support.extended.description,
        product_category: "VPSN",
      });
    }
    if (Array.isArray(data.accessories)) {
      for (const acc of data.accessories) {
        rememberConfigProduct(acc);
      }
    }
  } catch (err) {
    panel.innerHTML = "";
    const errEl = document.createElement("div");
    errEl.className = "status-text error";
    errEl.textContent = catT(
      "Не удалось загрузить опции для этой позиции.",
      "Could not load options for this line."
    );
    panel.appendChild(errEl);
    return;
  }

  panel.innerHTML = "";
  const st = ensureLineState(p.id);

  const apTargetComboWarn = document.createElement("div");
  apTargetComboWarn.className = "addon-panel-warn-host";

  if (data.licenses && data.licenses.length) {
    const feedbackHost = document.createElement("div");
    feedbackHost.className = "addon-panel-feedback";
    feedbackHost.setAttribute("aria-live", "polite");

    function clearLicenseFeedbackForThisProduct() {
      licenseSuggestFeedbackByProductId.delete(p.id);
      feedbackHost.innerHTML = "";
    }

    function showImmediateLicenseFeedback(message, type) {
      licenseSuggestFeedbackByProductId.delete(p.id);
      feedbackHost.innerHTML = "";
      if (!message) return;
      const div = document.createElement("div");
      div.className = "status-text " + type;
      div.textContent = message;
      feedbackHost.appendChild(div);
    }

    const title = document.createElement("div");
    title.className = "addon-section-title";
    title.textContent = catT("Лицензии (пакеты)", "License packs");
    panel.appendChild(title);

    const suggestRow = document.createElement("div");
    suggestRow.className = "suggest-row";
    const apCol = document.createElement("div");
    apCol.style.display = "flex";
    apCol.style.flexDirection = "column";
    apCol.style.gap = "4px";
    apCol.style.alignItems = "flex-start";
    const apLabel = document.createElement("label");
    apLabel.style.fontSize = "11px";
    apLabel.style.color = "#64748b";
    apLabel.textContent = catT("Целевое число AP:", "Target AP count:");
    apCol.appendChild(apLabel);
    if (data.built_in_license_units != null) {
      const builtInHint = document.createElement("div");
      builtInHint.className = "addon-hint";
      builtInHint.textContent = catT(
        "Встроенная ёмкость лицензий: " +
          data.built_in_license_units +
          " AP.",
        "Built-in licensed capacity: " +
          data.built_in_license_units +
          " AP."
      );
      apCol.appendChild(builtInHint);
    }
    const apInput = document.createElement("input");
    apInput.type = "number";
    apInput.min = "1";
    apInput.step = "1";
    apInput.value = st.targetAp != null ? String(st.targetAp) : "";
    apInput.addEventListener("click", (ev) => ev.stopPropagation());
    apInput.addEventListener("input", () => {
      clearLicenseFeedbackForThisProduct();
      const v = parseInt(apInput.value, 10);
      st.targetAp = Number.isFinite(v) && v > 0 ? v : null;
      refreshApTargetComboWarn();
      renderSelectedPills();
    });
    const suggestBtn = document.createElement("button");
    suggestBtn.type = "button";
    suggestBtn.className = "secondary-btn";
    suggestBtn.textContent = catT("Подобрать пакеты", "Suggest packs");
    suggestBtn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (!st.targetAp || st.targetAp < 1) {
        showImmediateLicenseFeedback(
          catT(
            "Укажите целевое число AP (целое > 0).",
            "Enter target AP (integer > 0)."
          ),
          "error"
        );
        return;
      }
      try {
        const r = await apiFetch(
          "/products/" +
            p.id +
            "/license-pack-suggestion?target_ap_count=" +
            encodeURIComponent(String(st.targetAp)),
          { __globalLoading: false }
        );
        const j = await r.json().catch(() => null);
        if (!r.ok) {
          showImmediateLicenseFeedback(
            (j && j.detail) ||
              catT(
                "Не удалось получить подбор пакетов.",
                "Could not get pack suggestion."
              ),
            "error"
          );
          return;
        }
        const neededExtra =
          j.needed_extra_units != null ? j.needed_extra_units : 0;
        const residual =
          j.residual_units_short != null ? j.residual_units_short : 0;
        const suggestion = j.suggestion || [];

        st.licenseQty = {};
        st.licPickOrder = [];
        for (const row of suggestion) {
          const lid = row.license_id;
          const q = Number(row.quantity) || 0;
          if (q <= 0) continue;
          st.licenseQty[lid] = (st.licenseQty[lid] || 0) + q;
          if (!st.licPickOrder.includes(lid)) {
            st.licPickOrder.push(lid);
          }
        }

        if (residual > 0) {
          licenseSuggestFeedbackByProductId.set(p.id, {
            message: catT(
              (j.note ||
                "Дискретные пакеты не закрывают цель полностью.") +
                " Не хватает " +
                residual +
                " AP; подставлен только частичный набор.",
              (j.note ||
                "Discrete packs do not fully meet the target.") +
                " Short by " +
                residual +
                " AP; partial set applied."
            ),
            type: "error",
          });
          renderProducts();
          return;
        }

        if (neededExtra === 0) {
          licenseSuggestFeedbackByProductId.set(p.id, {
            message: catT(
              "Дополнительные пакеты не нужны: встроенных " +
                (j.built_in_license_units ?? "—") +
                " AP уже достаточно для цели " +
                j.target_ap_count +
                " AP. Поля пакетов оставлены нулями.",
              "No extra packs needed: built-in " +
                (j.built_in_license_units ?? "—") +
                " AP already covers target " +
                j.target_ap_count +
                " AP. Pack fields left at zero."
            ),
            type: "info",
          });
        } else if (suggestion.length === 0) {
          licenseSuggestFeedbackByProductId.set(p.id, {
            message: catT(
              "Подбор не вернул пакеты — проверьте каталог лицензий или целевое число AP.",
              "No packs returned — check the license catalog or target AP."
            ),
            type: "error",
          });
        } else {
          const totalAfterSuggest = data.built_in_license_units != null
            ? data.built_in_license_units
            : 0;
          let extraAfterSuggest = 0;
          for (const lic of data.licenses || []) {
            const q = Number(st.licenseQty[lic.id]) || 0;
            extraAfterSuggest += q * (lic.units_per_pack || 0);
          }
          const finalTotal = totalAfterSuggest + extraAfterSuggest;
          const exceed = st.targetAp > 0 ? Math.max(0, finalTotal - st.targetAp) : 0;
          if (exceed > 0) {
            licenseSuggestFeedbackByProductId.set(p.id, {
              message: catT(
                "Пакеты лицензий подставлены: получится " +
                  finalTotal +
                  " AP при цели " +
                  st.targetAp +
                  " AP; запас +" +
                  exceed +
                  " AP (exceed by " +
                  exceed +
                  ").",
                "License packs applied: total " +
                  finalTotal +
                  " AP for target " +
                  st.targetAp +
                  " AP; surplus +" +
                  exceed +
                  " AP (exceed by " +
                  exceed +
                  ")."
              ),
              type: "info",
            });
          } else {
            licenseSuggestFeedbackByProductId.delete(p.id);
            showToast(
              catT(
                "Пакеты лицензий подставлены в форму.",
                "License packs filled in."
              ),
              "success"
            );
          }
        }
        renderProducts();
        renderSelectedPills();
      } catch (e) {
        console.error(e);
        showImmediateLicenseFeedback(
          catT(
            "Ошибка запроса подбора пакетов.",
            "Pack suggestion request failed."
          ),
          "error"
        );
      }
    });
    suggestRow.appendChild(apCol);
    suggestRow.appendChild(apInput);
    suggestRow.appendChild(suggestBtn);
    panel.appendChild(suggestRow);
    panel.appendChild(feedbackHost);
    renderLicenseSuggestFeedbackHost(p.id, feedbackHost);
    panel.appendChild(apTargetComboWarn);

    function refreshApTargetComboWarn() {
      syncApTargetWarningEl(apTargetComboWarn, st, data);
    }

    for (const lic of data.licenses) {
      if (st.licenseQty[lic.id] == null) st.licenseQty[lic.id] = 0;
      const row = document.createElement("div");
      row.className = "addon-line";
      const lab = document.createElement("span");
      lab.textContent = formatLicenseUserLabel(lic);
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "0";
      inp.step = "1";
      inp.value = String(st.licenseQty[lic.id]);
      inp.addEventListener("click", (ev) => ev.stopPropagation());
      inp.addEventListener("input", () => {
        clearLicenseFeedbackForThisProduct();
        const q = parseInt(inp.value, 10);
        const nq = Number.isFinite(q) && q >= 0 ? q : 0;
        st.licenseQty[lic.id] = nq;
        touchLicensePickOrder(st, lic.id, nq);
        refreshApTargetComboWarn();
        renderSelectedPills();
      });
      row.appendChild(lab);
      row.appendChild(inp);
      panel.appendChild(row);
    }
    refreshApTargetComboWarn();
  }

  if (data.modules && data.modules.length) {
    const titleRow = document.createElement("div");
    titleRow.className = "addon-section-title-row";
    const title = document.createElement("div");
    title.className = "addon-section-title";
    title.textContent = catT(
      "Модули / трансиверы",
      "Modules / transceivers"
    );
    titleRow.appendChild(title);
    let moduleSlotCountEl = null;
    if (data.max_module_slots != null) {
      moduleSlotCountEl = document.createElement("span");
      moduleSlotCountEl.className = "addon-module-slot-count";
      titleRow.appendChild(moduleSlotCountEl);
    }
    panel.appendChild(titleRow);
    const moduleSlotsWarn = document.createElement("div");
    moduleSlotsWarn.className = "addon-panel-warn-host";
    function updateModuleSlotCounter() {
      if (!moduleSlotCountEl || data.max_module_slots == null) return;
      moduleSlotCountEl.textContent =
        computeModuleQtySum(st) + "/" + data.max_module_slots;
    }
    function refreshModuleSlots() {
      updateModuleSlotCounter();
      syncModuleSlotsWarningEl(moduleSlotsWarn, data.max_module_slots, st);
    }
    for (const m of data.modules) {
      if (st.moduleQty[m.id] == null) st.moduleQty[m.id] = 0;
      const row = document.createElement("div");
      row.className = "addon-line";
      const lab = document.createElement("span");
      lab.textContent = formatModuleUserLabel(m);
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "0";
      inp.step = "1";
      inp.value = String(st.moduleQty[m.id]);
      inp.addEventListener("click", (ev) => ev.stopPropagation());
      inp.addEventListener("input", () => {
        const q = parseInt(inp.value, 10);
        const nq = Number.isFinite(q) && q >= 0 ? q : 0;
        st.moduleQty[m.id] = nq;
        touchModulePickOrder(st, m.id, nq);
        refreshModuleSlots();
        renderSelectedPills();
      });
      row.appendChild(lab);
      row.appendChild(inp);
      panel.appendChild(row);
    }
    panel.appendChild(moduleSlotsWarn);
    refreshModuleSlots();
  }

  if (data.service_attachable) {
    const svcTitle = document.createElement("div");
    svcTitle.className = "addon-section-title";
    svcTitle.textContent = catT("Поддержка", "Support");
    panel.appendChild(svcTitle);
    const svcSelect = document.createElement("select");
    svcSelect.addEventListener("click", (ev) => ev.stopPropagation());
    const optNone = document.createElement("option");
    optNone.value = "none";
    optNone.textContent = catT("Без поддержки", "No support");
    const optStd = document.createElement("option");
    optStd.value = "standard";
    optStd.textContent = catT(
      "Стандартная поддержка (VPS)",
      "Standard support (VPS)"
    );
    const optExt = document.createElement("option");
    optExt.value = "extended";
    optExt.textContent = catT(
      "Расширенная поддержка (VPSN)",
      "Extended support (VPSN)"
    );
    svcSelect.appendChild(optNone);
    svcSelect.appendChild(optStd);
    svcSelect.appendChild(optExt);
    svcSelect.value = st.serviceTier || "none";
    panel.appendChild(svcSelect);

    const svcHint = document.createElement("div");
    svcHint.className = "addon-hint";
    const svcData = data.support || null;
      const std = svcData && svcData.standard;
      const ext = svcData && svcData.extended;
      if (!std) optStd.disabled = true;
      if (!ext) optExt.disabled = true;
      if (st.serviceTier === "standard" && std) {
        st.serviceProductId = std.product_id;
      } else if (st.serviceTier === "extended" && ext) {
        st.serviceProductId = ext.product_id;
    } else if (st.serviceTier === "none" || !st.serviceTier) {
      st.serviceTier = "none";
        st.serviceProductId = null;
      svcSelect.value = "none";
      } else if (std) {
        st.serviceTier = "standard";
        st.serviceProductId = std.product_id;
        svcSelect.value = "standard";
      } else {
        st.serviceTier = "none";
        st.serviceProductId = null;
        svcSelect.value = "none";
      }
      svcHint.textContent = catT(
      (std
        ? "Стандарт: " + formatSupportOptionLabel(std)
        : "Стандарт недоступен") +
        " · " +
        (ext
          ? "Расширенный: " + formatSupportOptionLabel(ext)
          : "Расширенный недоступен"),
      (std
        ? "Standard: " + formatSupportOptionLabel(std)
        : "Standard N/A") +
        " · " +
        (ext
          ? "Extended: " + formatSupportOptionLabel(ext)
          : "Extended N/A")
    );
    panel.appendChild(svcHint);
      svcSelect.addEventListener("change", () => {
        st.serviceTier = svcSelect.value;
        if (st.serviceTier === "standard" && std) {
          st.serviceProductId = std.product_id;
        svcHint.textContent = catT(
          "Стандарт: " + formatSupportOptionLabel(std),
          "Standard: " + formatSupportOptionLabel(std)
        );
        } else if (st.serviceTier === "extended" && ext) {
          st.serviceProductId = ext.product_id;
        svcHint.textContent = catT(
          "Расширенный: " + formatSupportOptionLabel(ext),
          "Extended: " + formatSupportOptionLabel(ext)
        );
        } else {
          st.serviceProductId = null;
        svcHint.textContent = catT(
          "Поддержка не выбрана.",
          "No support selected."
        );
        }
        renderSelectedPills();
      });
  }

  if (data.accessories && data.accessories.length) {
    const accTitle = document.createElement("div");
    accTitle.className = "addon-section-title";
    accTitle.textContent = catT(
      "Совместимые аксессуары",
      "Compatible accessories"
    );
    panel.appendChild(accTitle);
    const accHint = document.createElement("div");
    accHint.className = "addon-hint";
    accHint.textContent = catT(
      "Отметьте позиции и укажите количество на один коммутатор. Рекомендуемое значение подставляется автоматически.",
      "Check items and set quantity per switch. Suggested values are filled in automatically."
    );
    panel.appendChild(accHint);
    if (!st.accessoryQty || typeof st.accessoryQty !== "object") {
      st.accessoryQty = {};
    }
    for (const acc of data.accessories) {
      const accId = Number(acc.product_id);
      const suggested =
        Number(acc.suggested_quantity) > 0
          ? Number(acc.suggested_quantity)
          : 1;
      const row = document.createElement("div");
      row.className = "equipment-picker-accessory-line";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = accessoryIsSelected(st, accId);
      cb.addEventListener("click", (ev) => ev.stopPropagation());
      const qtyWrap = document.createElement("div");
      qtyWrap.className = "equipment-picker-accessory-qty";
      const qtyLab = document.createElement("label");
      qtyLab.textContent = catT("Кол-во", "Qty");
      const qtyInp = document.createElement("input");
      qtyInp.type = "number";
      qtyInp.min = "1";
      qtyInp.step = "1";
      qtyInp.disabled = !cb.checked;
      qtyInp.value = String(
        getAccessoryUnitQty(st, accId) || suggested
      );
      qtyInp.title = catT(
        "Рекомендуется: " + suggested + " на коммутатор",
        "Suggested: " + suggested + " per switch"
      );
      qtyInp.addEventListener("click", (ev) => ev.stopPropagation());
      const syncAccessorySelection = () => {
        if (cb.checked) {
          const q = parseInt(qtyInp.value, 10);
          setAccessoryUnitQty(
            st,
            accId,
            Number.isFinite(q) && q > 0 ? q : suggested
          );
          qtyInp.value = String(getAccessoryUnitQty(st, accId));
          qtyInp.disabled = false;
        } else {
          setAccessoryUnitQty(st, accId, 0);
          qtyInp.disabled = true;
        }
        renderSelectedPills();
      };
      cb.addEventListener("change", syncAccessorySelection);
      qtyInp.addEventListener("input", () => {
        if (!cb.checked) return;
        const q = parseInt(qtyInp.value, 10);
        setAccessoryUnitQty(
          st,
          accId,
          Number.isFinite(q) && q > 0 ? q : 1
        );
        renderSelectedPills();
      });
      const lab = document.createElement("label");
      lab.textContent =
        (acc.name || "#" + acc.product_id) +
        (acc.description ? " — " + String(acc.description).slice(0, 120) : "");
      lab.addEventListener("click", (ev) => {
        ev.preventDefault();
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change"));
      });
      qtyWrap.appendChild(qtyLab);
      qtyWrap.appendChild(qtyInp);
      row.appendChild(cb);
      row.appendChild(lab);
      row.appendChild(qtyWrap);
      panel.appendChild(row);
    }
  }

  renderSelectedPills();
}

function closeEquipmentPickerModal(confirmed) {
  const pid = equipmentPickerProductId;
  const overlay = elements.equipmentPickerOverlay;
  const body = elements.equipmentPickerBody;
  if (overlay) overlay.hidden = true;
  if (body) body.innerHTML = "";
  equipmentPickerProductId = null;

  if (pid != null) {
    const p = products.find((x) => Number(x.id) === Number(pid));
    if (!confirmed) {
      configLineState.delete(pid);
      licenseSuggestFeedbackByProductId.delete(pid);
    } else {
      reconcileAccessoryLinesForParent(pid);
      if (p && shouldUseUserToasts()) {
        showToast(
          catT("Позиция добавлена в конфигурацию.", "Line added to configuration."),
          "success"
        );
      }
    }
  }
  renderSelectedPills();
  renderProducts();
  updateCounter();
}

async function openEquipmentPickerModal(p) {
  if (!p || !elements.equipmentPickerOverlay || !elements.equipmentPickerBody) {
    return;
  }
  equipmentPickerProductId = p.id;
  if (elements.equipmentPickerTitle) {
    elements.equipmentPickerTitle.textContent = p.name || "—";
  }
  if (elements.equipmentPickerLead) {
    elements.equipmentPickerLead.textContent = catT(
      "Выберите совместимые компоненты или подтвердите только оборудование. Количество можно изменить ниже.",
      "Pick compatible add-ons or confirm equipment only. You can set quantity below."
    );
  }
  if (elements.equipmentPickerCancel) {
    elements.equipmentPickerCancel.textContent = catT("Отмена", "Cancel");
  }
  if (elements.equipmentPickerConfirm) {
    elements.equipmentPickerConfirm.textContent = catT(
      "Подтвердить выбор",
      "Confirm selection"
    );
  }
  const body = elements.equipmentPickerBody;
  body.innerHTML = "";
  const st = ensureLineState(p.id);
  const parentQty =
    Number.isFinite(Number(st.quantity)) && Number(st.quantity) > 0
      ? Number(st.quantity)
      : 1;
  for (const [cid, cst] of configLineState.entries()) {
    const contrib = cst.parentContributions?.[String(p.id)];
    if (contrib != null) {
      const perUnit = Math.max(1, Math.round(Number(contrib) / parentQty));
      setAccessoryUnitQty(st, Number(cid), perUnit);
      continue;
    }
    if (Number(cst.parentProductId) === Number(p.id)) {
      const total = Number(cst.quantity) || 1;
      const perUnit = Math.max(1, Math.round(total / parentQty));
      setAccessoryUnitQty(st, Number(cid), perUnit);
    }
  }

  const qtyRow = document.createElement("div");
  qtyRow.className = "equipment-picker-qty-row";
  const qtyLab = document.createElement("label");
  qtyLab.textContent = catT("Количество:", "Quantity:");
  const qtyInp = document.createElement("input");
  qtyInp.type = "number";
  qtyInp.min = "1";
  qtyInp.step = "1";
  qtyInp.value = String(st.quantity != null && st.quantity > 0 ? st.quantity : 1);
  qtyInp.addEventListener("input", () => {
    const q = parseInt(qtyInp.value, 10);
    st.quantity = Number.isFinite(q) && q > 0 ? q : 1;
    renderSelectedPills();
  });
  qtyRow.appendChild(qtyLab);
  qtyRow.appendChild(qtyInp);
  body.appendChild(qtyRow);

  const panel = document.createElement("div");
  panel.className = "equipment-addon-panel";
  body.appendChild(panel);
  elements.equipmentPickerOverlay.hidden = false;
  await renderAddonPanel(panel, p);
}

function isSwitchesGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "switches");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "switches");
}

function activeCatalogSubgroup() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogSubgroupFilter) return null;
    return (
      catalogGroups
        .flatMap((g) => g.subgroups || [])
        .find((s) => String(s.id) === String(adminCatalogSubgroupFilter)) ||
      null
    );
  }
  return selectedCatalogSubgroup();
}

function isSwitchesEquipmentCatalogContext() {
  if (!isSwitchesGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isSwitchesAccessoriesCatalogContext() {
  if (!isSwitchesGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "accessories");
}

function isWifiGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "wifi");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "wifi");
}

function isWifiEquipmentCatalogContext() {
  if (!isWifiGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isWifiAccessoriesCatalogContext() {
  if (!isWifiGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "accessories");
}

function isWifiSupportCatalogContext() {
  if (!isWifiGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "support");
}

function isLoadBalancerGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "load_balancer");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "load_balancer");
}

function isLoadBalancerEquipmentCatalogContext() {
  if (!isLoadBalancerGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isLoadBalancerSupportCatalogContext() {
  if (!isLoadBalancerGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "support");
}

function isManagementGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "management");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "management");
}

function isManagementEquipmentCatalogContext() {
  if (!isManagementGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isFirewallGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "firewall");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "firewall");
}

function isFirewallEquipmentCatalogContext() {
  if (!isFirewallGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isFirewallSupportCatalogContext() {
  if (!isFirewallGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "support");
}

function isServerGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "server");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "server");
}

function isServerSupportCatalogContext() {
  if (!isServerGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "support");
}

function isTelephonyGroupContext() {
  if (getCurrentRoleId() === 1) {
    if (!adminCatalogGroupFilter) return false;
    const group = catalogGroups.find(
      (g) => String(g.id) === String(adminCatalogGroupFilter)
    );
    return !!(group && group.code === "telephony");
  }
  const group = findCatalogGroup(catalogGroupId);
  return !!(group && group.code === "telephony");
}

function isTelephonyEquipmentCatalogContext() {
  if (!isTelephonyGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isTelephonySupportCatalogContext() {
  if (!isTelephonyGroupContext()) return false;
  const sub = activeCatalogSubgroup();
  return !!(sub && String(sub.code || "").toLowerCase() === "support");
}

function visibleCatalogSubgroups(group) {
  const subs = Array.isArray(group?.subgroups) ? group.subgroups : [];
  return subs.filter((sub) => Number(sub.product_count || 0) > 0);
}

function activeCatalogFilterDefs() {
  return catalogFilterDefs;
}

function buildProductCatalogScopeParams() {
  const params = new URLSearchParams();
  const isAdmin = getCurrentRoleId() === 1;
  if (isAdmin) {
    if (adminCatalogSubgroupFilter) {
      params.set("subgroup_id", adminCatalogSubgroupFilter);
    } else if (adminCatalogGroupFilter) {
      params.set("group_id", adminCatalogGroupFilter);
    }
  } else if (catalogSubgroupId) {
    params.set("subgroup_id", String(catalogSubgroupId));
  }

  const activeSub = isAdmin
    ? adminCatalogSubgroupFilter
      ? catalogGroups
          .flatMap((g) => g.subgroups || [])
          .find((s) => String(s.id) === String(adminCatalogSubgroupFilter))
      : null
    : selectedCatalogSubgroup();
  const globalSearch = userCatalogGlobalSearchActive();
  if (!isAdmin && !globalSearch && isConfiguratorEquipmentSubgroup(activeSub)) {
    params.set("configurator_only", "true");
  }
  if (isAdmin && adminCatalogCategoryFilter) {
    params.set("product_category", adminCatalogCategoryFilter);
  }
  if (!isAdmin && catalogCategoryFilter) {
    params.set("product_category", catalogCategoryFilter);
  }
  return params;
}

async function loadCatalogSpecFilterOptions() {
  const scope = buildProductCatalogScopeParams();
  if (!scope.has("subgroup_id") && !scope.has("group_id")) {
    catalogFilterDefs = [];
    catalogFilters = {};
    return;
  }

  const preserved = { ...catalogFilters };
  try {
    const response = await apiFetch(
      "/products/spec-filter-options?" + scope.toString(),
      { method: "GET", __globalLoading: false }
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data)) {
      catalogFilterDefs = [];
      catalogFilters = {};
      return;
    }

    catalogFilterDefs = data.map((item) => {
      const name = item.name || item.code || "";
      const values = Array.isArray(item.values) ? item.values : [];
      return {
        code: item.code,
        labelRu: name,
        labelEn: name,
        options: values.map((value) => ({
          value,
          labelRu: value,
          labelEn: value,
        })),
      };
    });
    catalogFilters = {};
    for (const def of catalogFilterDefs) {
      catalogFilters[def.code] = preserved[def.code] || "";
    }
  } catch (error) {
    console.error("Failed to load spec filter options:", error);
    catalogFilterDefs = [];
    catalogFilters = {};
  }
}

function formatProductSpecValuesLine(p) {
  const specs = Array.isArray(p.technical_spec_values)
    ? p.technical_spec_values
    : [];
  if (!specs.length) return "";
  return specs
    .map((row) => {
      const label = row.parameter_name || row.parameter_code || "";
      const value = row.value != null ? String(row.value).trim() : "";
      if (!label || !value) return "";
      return label + ": " + value;
    })
    .filter(Boolean)
    .join(" · ");
}

function activeCatalogFilterState() {
  return catalogFilters;
}

function buildCatalogFilterControls(host, idPrefix, filterDefs, filterState) {
  if (!host) return;
  host.innerHTML = "";
  const isEn = uiLang === "en";
  for (const def of filterDefs) {
    const sel = document.createElement("select");
    sel.className = "catalog-native-select";
    sel.id = idPrefix + "-catalog-filter-" + def.code;
    sel.dataset.filterCode = def.code;
    sel.setAttribute("aria-label", isEn ? def.labelEn : def.labelRu);
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = isEn ? def.labelEn : def.labelRu;
    sel.appendChild(placeholder);
    for (const optDef of def.options) {
    const opt = document.createElement("option");
      opt.value = optDef.value;
      opt.textContent = isEn ? optDef.labelEn : optDef.labelRu;
    sel.appendChild(opt);
    }
    sel.value = filterState[def.code] || "";
    sel.addEventListener("change", () => {
      applyProductCatalogQuery(true);
    });
    host.appendChild(sel);
    fitNativeSelectToContent(sel);
  }
}

function renderCatalogFilterControls() {
  const defs = activeCatalogFilterDefs();
  const state = activeCatalogFilterState();
  buildCatalogFilterControls(elements.userSwitchFiltersHost, "user", defs, state);
  buildCatalogFilterControls(elements.adminSwitchFiltersHost, "admin", defs, state);
}

function syncCatalogFiltersVisibility() {
  const show = activeCatalogFilterDefs().length > 0;
  if (elements.userSwitchFiltersHost) {
    elements.userSwitchFiltersHost.hidden = !show;
  }
  if (elements.adminSwitchFiltersHost) {
    elements.adminSwitchFiltersHost.hidden = !show;
  }
  if (elements.catalogProductsToolbar) {
    elements.catalogProductsToolbar.classList.toggle("has-spec-filters", show);
  }
  const adminToolbar = document.querySelector(".admin-catalog-toolbar");
  if (adminToolbar) {
    adminToolbar.classList.toggle("has-spec-filters", show);
  }
}

function syncProductFilterInputsFromState() {
  const searchVal = productSearchTerm || "";
  if (elements.productsSearchInput) {
    elements.productsSearchInput.value = searchVal;
  }
  if (elements.adminProductsSearchInput) {
    elements.adminProductsSearchInput.value = searchVal;
  }
  for (const host of [
    elements.userSwitchFiltersHost,
    elements.adminSwitchFiltersHost,
  ]) {
    if (!host) continue;
    const state = activeCatalogFilterState();
    host.querySelectorAll("select[data-filter-code]").forEach((sel) => {
      const code = sel.dataset.filterCode;
      if (!code) return;
      sel.value = state[code] || "";
    });
  }
}

function hasActiveCatalogFilters() {
  const defs = activeCatalogFilterDefs();
  const state = activeCatalogFilterState();
  return (
    defs.some((def) => Boolean((state[def.code] || "").trim())) ||
    Boolean(adminCatalogCategoryFilter) ||
    Boolean(catalogCategoryFilter)
  );
}

function syncProductSpecFilterUi() {
  const hasFilter =
    Boolean((productSearchTerm || "").trim()) || hasActiveCatalogFilters();
  if (elements.productsSpecFilterClear) {
    elements.productsSpecFilterClear.hidden = !hasFilter;
  }
  if (elements.adminProductsSpecFilterClear) {
    elements.adminProductsSpecFilterClear.hidden = !hasFilter;
  }
}

function readProductFiltersFromInputs() {
  productSearchTerm =
    (elements.productsSearchInput && elements.productsSearchInput.value) ||
    (elements.adminProductsSearchInput && elements.adminProductsSearchInput.value) ||
    "";
  const activeHost =
    getCurrentRoleId() === 1
      ? elements.adminSwitchFiltersHost
      : elements.userSwitchFiltersHost;
  const state = activeCatalogFilterState();
  if (activeHost) {
    activeHost.querySelectorAll("select[data-filter-code]").forEach((sel) => {
      const code = sel.dataset.filterCode;
      if (!code) return;
      state[code] = sel.value || "";
    });
  }
}

function applyProductCatalogQuery(resetPage) {
  readProductFiltersFromInputs();
  syncProductFilterInputsFromState();
  syncProductSpecFilterUi();
  syncUserCatalogPanels();
  renderCatalogNavigation();
  void loadProducts();
}

function clearProductSpecFilter() {
  productSearchTerm = "";
  adminCatalogCategoryFilter = "";
  catalogCategoryFilter = "";
  if (elements.adminCatalogCategorySelect) {
    elements.adminCatalogCategorySelect.value = "";
  }
  if (elements.catalogCategorySelect) {
    elements.catalogCategorySelect.value = "";
  }
  for (const def of catalogFilterDefs) {
    catalogFilters[def.code] = "";
  }
  renderCatalogFilterControls();
  syncProductFilterInputsFromState();
  syncProductSpecFilterUi();
  syncUserCatalogPanels();
  renderCatalogNavigation();
  void loadProducts();
}

function findCatalogGroup(groupId) {
  return catalogGroups.find((g) => Number(g.id) === Number(groupId)) || null;
}

function findCatalogSubgroup(groupId, subgroupId) {
  const group = findCatalogGroup(groupId);
  if (!group || !Array.isArray(group.subgroups)) return null;
  return (
    group.subgroups.find((s) => Number(s.id) === Number(subgroupId)) || null
  );
}

function selectedCatalogSubgroup() {
  if (!catalogGroupId || !catalogSubgroupId) return null;
  return findCatalogSubgroup(catalogGroupId, catalogSubgroupId);
}

function isConfiguratorEquipmentSubgroup(sub) {
  return !!(sub && String(sub.code || "").toLowerCase() === "equipment");
}

function isUserCatalogWizard() {
  const roleId = getCurrentRoleId();
  return roleId != null && roleId !== 1;
}

function userCatalogAtProductsLevel() {
  return isUserCatalogWizard() && Boolean(catalogGroupId && catalogSubgroupId);
}

function userCatalogGlobalSearchActive() {
  return isUserCatalogWizard() && Boolean((productSearchTerm || "").trim());
}

function syncUserCatalogPanels() {
  const wizard = isUserCatalogWizard();
  const globalSearch = userCatalogGlobalSearchActive();
  const atProducts = userCatalogAtProductsLevel();
  const showProductResults = atProducts || globalSearch;
  const showGroups = wizard && !catalogGroupId && !globalSearch;
  const showSubgroups = wizard && catalogGroupId && !catalogSubgroupId && !globalSearch;

  if (elements.catalogNav) {
    elements.catalogNav.hidden = !wizard || showProductResults;
  }
  if (elements.catalogBreadcrumb) {
    elements.catalogBreadcrumb.hidden =
      !wizard || (!catalogGroupId && !globalSearch);
  }
  if (elements.catalogProductsToolbar) {
    elements.catalogProductsToolbar.hidden = !wizard;
  }
  if (elements.catalogCategorySelect) {
    elements.catalogCategorySelect.hidden = !wizard || !showProductResults;
  }
  if (elements.userProductsPanel) {
    elements.userProductsPanel.hidden = wizard ? !showProductResults : false;
  }
  syncCatalogFiltersVisibility();
  renderCatalogFilterControls();
  if (elements.catalogGroupsGrid) {
    elements.catalogGroupsGrid.hidden = !showGroups;
  }
  if (elements.catalogSubgroupsGrid) {
    elements.catalogSubgroupsGrid.hidden = !showSubgroups;
  }
}

function renderCatalogBreadcrumb() {
  const el = elements.catalogBreadcrumb;
  if (!el) return;
  el.innerHTML = "";
  const globalSearch = userCatalogGlobalSearchActive();
  if (!catalogGroupId && !globalSearch) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const rootBtn = document.createElement("button");
  rootBtn.type = "button";
  rootBtn.textContent = catT("Все группы", "All groups");
  rootBtn.addEventListener("click", () => {
    catalogGroupId = null;
    catalogSubgroupId = null;
    productSearchTerm = "";
    syncProductFilterInputsFromState();
    syncProductSpecFilterUi();
    syncUserCatalogPanels();
    renderCatalogNavigation();
    void loadProducts();
  });
  el.appendChild(rootBtn);
  if (!catalogGroupId && globalSearch) {
    el.appendChild(document.createTextNode(" / "));
    const span = document.createElement("span");
    span.textContent =
      catT("Поиск", "Search") + ": " + (productSearchTerm || "").trim();
    el.appendChild(span);
    return;
  }
  const group = findCatalogGroup(catalogGroupId);
  if (!group) return;
  el.appendChild(document.createTextNode(" / "));
  const groupBtn = document.createElement("button");
  groupBtn.type = "button";
  groupBtn.textContent = catalogGroupDisplayName(group);
  groupBtn.addEventListener("click", () => {
    catalogSubgroupId = null;
    productSearchTerm = "";
    syncProductFilterInputsFromState();
    syncProductSpecFilterUi();
    syncUserCatalogPanels();
    renderCatalogNavigation();
    void loadProducts();
  });
  el.appendChild(groupBtn);
  if (catalogSubgroupId) {
    const sub = findCatalogSubgroup(catalogGroupId, catalogSubgroupId);
    if (sub) {
      el.appendChild(document.createTextNode(" / "));
      const span = document.createElement("span");
      span.textContent = catalogSubgroupDisplayName(sub, group);
      el.appendChild(span);
    }
  }
}

function renderCatalogGroupCards() {
  const grid = elements.catalogGroupsGrid;
  if (!grid) return;
  grid.innerHTML = "";
  if (!isUserCatalogWizard() || catalogGroupId) {
    return;
  }
  if (!catalogGroups.length) {
    const empty = document.createElement("div");
    empty.className = "catalog-nav-card-meta";
    empty.textContent = catT(
      "Группы каталога пока не настроены.",
      "Catalog groups are not configured yet."
    );
    grid.appendChild(empty);
    return;
  }
  catalogGroups.forEach((group) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "catalog-nav-card";
    const title = document.createElement("div");
    title.className = "catalog-nav-card-title";
    title.textContent = catalogGroupDisplayName(group);
    const meta = document.createElement("div");
    meta.className = "catalog-nav-card-meta";
    const visibleSubs = visibleCatalogSubgroups(group);
    const subCount = visibleSubs.length;
    const visibleProductCount = visibleSubs.reduce(
      (sum, sub) => sum + Number(sub.product_count || 0),
      0
    );
    meta.textContent =
      catT("Подгрупп: ", "Subgroups: ") +
      subCount +
      " · " +
      catT("товаров: ", "products: ") +
      visibleProductCount;
    card.appendChild(title);
    card.appendChild(meta);
    card.addEventListener("click", () => {
      catalogGroupId = Number(group.id);
      catalogSubgroupId = null;
      syncUserCatalogPanels();
      renderCatalogNavigation();
      void loadProducts();
    });
    grid.appendChild(card);
  });
}

function renderCatalogSubgroupCards() {
  const grid = elements.catalogSubgroupsGrid;
  if (!grid) return;
  grid.innerHTML = "";
  if (!isUserCatalogWizard() || !catalogGroupId || catalogSubgroupId) {
    return;
  }
  const group = findCatalogGroup(catalogGroupId);
  if (!group) return;
  const subs = visibleCatalogSubgroups(group);
  if (!subs.length) {
    const empty = document.createElement("div");
    empty.className = "catalog-nav-card-meta";
    empty.textContent = catT(
      "В этой группе пока нет подгрупп.",
      "This group has no subgroups yet."
    );
    grid.appendChild(empty);
    return;
  }
  subs.forEach((sub) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "catalog-nav-card";
    const title = document.createElement("div");
    title.className = "catalog-nav-card-title";
    title.textContent = catalogSubgroupDisplayName(sub, group);
    const meta = document.createElement("div");
    meta.className = "catalog-nav-card-meta";
    meta.textContent =
      catT("Товаров: ", "Products: ") +
      (sub.product_count != null ? sub.product_count : 0);
    card.appendChild(title);
    card.appendChild(meta);
    card.addEventListener("click", () => {
      catalogSubgroupId = Number(sub.id);
      syncUserCatalogPanels();
      renderCatalogFilterControls();
      renderCatalogNavigation();
      void loadProducts();
    });
    grid.appendChild(card);
  });
}

function renderCatalogNavigation() {
  renderCatalogBreadcrumb();
  renderCatalogGroupCards();
  renderCatalogSubgroupCards();
  syncUserCatalogPanels();
  const subtitle = document.getElementById("products-card-subtitle");
  if (subtitle) {
    if (userCatalogGlobalSearchActive() && !catalogGroupId) {
      subtitle.hidden = false;
      subtitle.textContent = catT(
        "Результаты поиска по всему каталогу",
        "Search results across the catalog"
      );
    } else {
      subtitle.textContent = "";
      subtitle.hidden = true;
    }
  }
  requestAnimationFrame(syncProductsSectionHeight);
}

async function loadCatalogGroups() {
  try {
    const res = await apiFetch("/catalog-groups", { __globalLoading: false });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.detail) || "groups load failed");
    catalogGroups = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(e);
    catalogGroups = [];
  }
  await loadEquipmentTypeOptions();
  renderCatalogNavigation();
  populateAdminCatalogGroupSelect();
  renderAdminGroupsTable();
}

function syncModuleSlotsWarningEl(warnEl, maxSlots, st) {
  if (!warnEl) return;
  warnEl.innerHTML = "";
  if (maxSlots == null) {
    warnEl.__moduleSlotsWarnHash = "";
    return;
  }
  const sum = computeModuleQtySum(st);
  if (sum > maxSlots) {
    const msg = catT(
      "Сумма количеств модулей (" +
        sum +
        ") превышает лимит слотов для этого продукта (" +
        maxSlots +
        "). Лимит считается по всем типам трансиверов вместе, не по каждому отдельно.",
      "Total module quantities (" +
        sum +
        ") exceed the slot limit for this product (" +
        maxSlots +
        "). The limit applies to all transceiver types together, not per type."
    );
    const msgHash = msg;
    if (warnEl.__moduleSlotsWarnHash !== msgHash) {
      warnEl.__moduleSlotsWarnHash = msgHash;
      showToast(msg, "error");
    }
    return;
  }
  warnEl.__moduleSlotsWarnHash = "";
}

function syncApTargetWarningEl(warnEl, st, data) {
  if (!warnEl) return;
  warnEl.innerHTML = "";
  if (!st.targetAp || st.targetAp < 1) return;
  if (!data || !data.licenses || !data.licenses.length) return;
  const built =
    data.built_in_license_units != null ? data.built_in_license_units : 0;
  let extra = 0;
  for (const lic of data.licenses) {
    const q = Number(st.licenseQty[lic.id]) || 0;
    extra += q * (lic.units_per_pack || 0);
  }
  const total = built + extra;
  const infoEl = document.createElement("div");
  infoEl.className = "status-text info";
  if (total > st.targetAp) {
    const exceed = total - st.targetAp;
    infoEl.textContent = catT(
      "Итого по лицензиям: " +
        total +
        " AP при цели " +
        st.targetAp +
        " AP; запас +" +
        exceed +
        " AP (exceed by " +
        exceed +
        ").",
      "License total: " +
        total +
        " AP for target " +
        st.targetAp +
        " AP; surplus +" +
        exceed +
        " AP (exceed by " +
        exceed +
        ")."
    );
    warnEl.appendChild(infoEl);
  }
  if (total < st.targetAp) {
    const msg = catT(
      "По выбранным пакетам и встроенной ёмкости получается " +
        total +
        " AP, а цель " +
        st.targetAp +
        " AP. Эту цель нельзя закрыть текущим набором пакетов.",
      "With selected packs and built-in capacity you reach " +
        total +
        " AP, but the target is " +
        st.targetAp +
        " AP. This target cannot be met with the current pack set."
    );
    const errEl = document.createElement("div");
    errEl.className = "status-text error";
    errEl.textContent = msg;
    warnEl.appendChild(errEl);
    const msgHash = msg;
    if (warnEl.__apTargetWarnHash !== msgHash) {
      warnEl.__apTargetWarnHash = msgHash;
      showToast(msg, "error");
    }
    return;
  }
  warnEl.__apTargetWarnHash = "";
}

function hasBlockingSelectionWarnings() {
  for (const [pid, st] of configLineState.entries()) {
    const data = optionsCache[pid];
    if (!data) continue;
    if (
      data.max_module_slots != null &&
      computeModuleQtySum(st) > data.max_module_slots
    ) {
      return true;
    }
    if (st.targetAp && st.targetAp > 0 && data.licenses && data.licenses.length) {
      const built =
        data.built_in_license_units != null ? data.built_in_license_units : 0;
      let extra = 0;
      for (const lic of data.licenses) {
        const q = Number(st.licenseQty[lic.id]) || 0;
        extra += q * (lic.units_per_pack || 0);
      }
      if (built + extra < st.targetAp) return true;
    }
  }
  return false;
}

function updateCreateConfigBtnState() {
  if (!elements.createConfigBtn) return;
  if (getCurrentRoleId() === 1) {
    elements.createConfigBtn.disabled = true;
    return;
  }
  const nothingSelected = configLineState.size === 0;
  const hasBlockingWarning = hasBlockingSelectionWarnings();
  const projectNameOk =
    (elements.projectNameInput?.value || "").trim().length > 0;
  elements.createConfigBtn.disabled =
    nothingSelected || hasBlockingWarning || !projectNameOk;
}

function syncProductsSectionHeight() {
  const productsSection = document.getElementById("products-section");
  const configSection = document.querySelector(".configurator-ops-card");
  if (!productsSection || !configSection) return;
  if (window.matchMedia("(max-width: 800px)").matches) {
    productsSection.style.height = "";
    productsSection.style.minHeight = "";
    return;
  }
  const configHeight = Math.ceil(configSection.getBoundingClientRect().height);
  if (configHeight > 0) {
    // Match right column height but keep enough room for catalog nav + scrollable list.
    const minCatalogHeight = isUserCatalogWizard() ? 420 : 320;
    const targetHeight = Math.max(configHeight, minCatalogHeight);
    productsSection.style.height = targetHeight + "px";
    productsSection.style.minHeight = minCatalogHeight + "px";
  }
}

function renderProducts() {
  if (!elements.productsList) return;
  if (
    isUserCatalogWizard() &&
    !userCatalogAtProductsLevel() &&
    !userCatalogGlobalSearchActive()
  ) {
    elements.productsList.innerHTML = "";
    return;
  }
  elements.productsList.innerHTML = "";
  const hasSpecFilter =
    Boolean((productSearchTerm || "").trim()) || hasActiveCatalogFilters();
  const visibleProducts = products;

  if (visibleProducts.length === 0) {
    const li = document.createElement("li");
    li.className = "product-item";
    li.style.cursor = "default";
    li.style.opacity = "0.85";
    li.textContent = hasSpecFilter
      ? catT(
          "Нет товаров с такими характеристиками. Измените фильтр или сбросьте его.",
          "No products match these characteristics. Change or clear the filter."
        )
      : catT(
          "Ничего не найдено. Попробуйте другой запрос.",
          "No matches found. Try another search."
        );
    elements.productsList.appendChild(li);
    requestAnimationFrame(syncProductsSectionHeight);
    return;
  }

  visibleProducts.forEach((p) => {
    const li = document.createElement("li");
    li.className =
      "product-item" + (isProductSelected(p.id) ? " selected" : "");

    const row = document.createElement("div");
    row.className = "product-item-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "product-checkbox";
    checkbox.checked = isProductSelected(p.id);

    const main = document.createElement("div");
    main.className = "product-main";

    const name = document.createElement("div");
    name.className = "product-name";
    name.textContent = p.name;
    main.appendChild(name);

    if (
      userCatalogGlobalSearchActive() &&
      (p.group_name || p.subgroup_name || p.group_code || p.subgroup_code)
    ) {
      const pathEl = document.createElement("div");
      pathEl.className = "product-catalog-path";
      pathEl.textContent = catalogProductGroupPath(p);
      main.appendChild(pathEl);
    }

    const descText = (p.description ?? "").trim();
    const desc = document.createElement("div");
    desc.className = "product-desc";
    if (descText) {
      desc.textContent = formatProductDescriptionForDisplay(descText);
    }

    const specLine = formatProductSpecValuesLine(p);
    if (specLine) {
      const specEl = document.createElement("div");
      specEl.className = "product-spec-values";
      specEl.textContent = specLine;
      desc.appendChild(specEl);
    }

    const cat = (p.product_category || "").toUpperCase();
    if (cat === "VPS" || cat === "VPSN") {
      const dur =
        extractSupportDuration(descText) ||
        (p.support_duration && String(p.support_duration)) ||
        null;
      if (dur) {
        const durEl = document.createElement("div");
        durEl.className = "product-support-duration";
        durEl.textContent =
          catT("Срок поддержки: ", "Support period: ") + dur;
        desc.appendChild(durEl);
      }
    }

    const meta = document.createElement("div");
    meta.className = "product-meta debug-only";
    const ac = addonCountForProduct(p);
    meta.textContent =
      "ID: " +
      p.id +
      (p.product_category ? " · cat: " + p.product_category : "") +
      (p.product_kind ? " · " + p.product_kind : "") +
      (ac ? " · options: " + ac : "");

    main.appendChild(desc);
    main.appendChild(meta);

    row.appendChild(checkbox);
    row.appendChild(main);
    li.appendChild(row);

    const n = addonCountForProduct(p);
    const showInlineAddons =
      !shouldUseEquipmentPickerModal() &&
      n > 0 &&
      isProductSelected(p.id);
    if (showInlineAddons) {
      const panel = document.createElement("div");
      panel.className = "equipment-addon-panel";
      panel.addEventListener("click", (ev) => ev.stopPropagation());
      li.appendChild(panel);
      renderAddonPanel(panel, p);
    }

    const toggleSelect = () => {
        configLineState.set(p.id, defaultLineState());
      renderSelectedPills();
      renderProducts();
      updateCounter();
      if (shouldUseEquipmentPickerModal()) {
        void openEquipmentPickerModal(p);
      }
    };

    const toggleDeselect = () => {
      configLineState.delete(p.id);
      licenseSuggestFeedbackByProductId.delete(p.id);
      renderSelectedPills();
      renderProducts();
      updateCounter();
    };

    const toggle = () => {
      if (isProductSelected(p.id)) {
        toggleDeselect();
      } else {
        toggleSelect();
      }
    };

    const openPickerForEdit = () => {
      if (!shouldUseEquipmentPickerModal()) return;
      void openEquipmentPickerModal(p);
    };

    li.addEventListener("click", (e) => {
      if (e.target.closest(".equipment-addon-panel")) return;
      if (isProductSelected(p.id) && shouldUseEquipmentPickerModal()) {
        openPickerForEdit();
        return;
      }
      if (e.target === checkbox) {
        toggle();
      } else {
        checkbox.checked = !checkbox.checked;
        toggle();
      }
    });

    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      if (checkbox.checked) {
        if (!isProductSelected(p.id)) toggleSelect();
      } else if (isProductSelected(p.id)) {
        toggleDeselect();
      }
    });

    elements.productsList.appendChild(li);
  });
  requestAnimationFrame(syncProductsSectionHeight);
}

function renderSelectedPills() {
  elements.selectedPills.innerHTML = "";
  const debugUi = document.body.classList.contains("debug-ui-on");
  const selectedIds = Array.from(configLineState.keys()).sort(
    (a, b) => Number(a) - Number(b)
  );
  for (const pid of selectedIds) {
    const p = productForConfigLine(pid);
      const pill = document.createElement("span");
      pill.className = debugUi ? "pill removable" : "pill removable-user";
      pill.textContent = selectionPillCaption(p);
      pill.title = debugUi
        ? "Remove from configuration (id " + p.id + ")"
        : catT("Убрать из выбранных", "Remove from selection");
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
      void (async () => {
        const ok = await userConfirmRemoveLine(selectionPillCaption(p));
        if (!ok) return;
        removeProductFromConfiguration(p.id);
      })();
      });
      elements.selectedPills.appendChild(pill);
  }
  updateCreateConfigBtnState();
  schedulePersistConfigSelectionDraft();
}

function updateCounter() {
  const count = configLineState.size;
  if (elements.productsCounter) {
    elements.productsCounter.textContent =
      count === 0
        ? catT("0 выбрано", "0 selected")
        : catT(count + " выбрано", count + " selected");
  }
  if (elements.selectedItemsCount) {
    if (count === 0) {
      elements.selectedItemsCount.textContent = catT(
        "Не выбрано",
        "None selected"
      );
    } else if (count === 1) {
      elements.selectedItemsCount.textContent = catT(
        "Выбрана 1 позиция",
        "1 line selected"
      );
    } else {
      elements.selectedItemsCount.textContent = catT(
        "Выбрано позиций: " + count,
        count + " lines selected"
      );
    }
  }
  updateCreateConfigBtnState();
}

function parseApiUtcDate(iso) {
  if (!iso) return null;
  const s = String(iso).trim();
  if (!s) return null;
  // Backend stores UTC; API may return +03:00 or bare UTC without suffix.
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s);
  }
  return new Date(s + "Z");
}

function formatRecentConfigDate(iso) {
  if (!iso) return "—";
  try {
    const d = parseApiUtcDate(iso);
    if (!d || Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(uiLang === "en" ? "en-GB" : "ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Moscow",
    });
  } catch {
    return String(iso);
  }
}

async function loadRecentConfigurations() {
  if (getCurrentRoleId() === 1) return;
  if (!elements.recentConfigurationsList) return;
  if (!accessToken) return;
  if (elements.recentConfigurationsEmpty) {
    elements.recentConfigurationsEmpty.style.display = "none";
  }
  try {
    const res = await apiFetch("/configurations/me/recent?limit=3");
    const data = await res.json().catch(() => null);
    elements.recentConfigurationsList.innerHTML = "";
    const rows = Array.isArray(data) ? data : [];
    if (!res.ok) {
      if (elements.recentConfigurationsEmpty) {
        elements.recentConfigurationsEmpty.textContent = catT(
          "Пока не удалось загрузить историю.",
          "History could not be loaded right now."
        );
        elements.recentConfigurationsEmpty.style.display = "block";
      }
      return;
    }
    if (rows.length === 0) {
      if (elements.recentConfigurationsEmpty) {
        elements.recentConfigurationsEmpty.textContent = catT(
          "Пока ничего нет.",
          "Nothing here yet."
        );
        elements.recentConfigurationsEmpty.style.display = "block";
      }
      return;
    }
    if (elements.recentConfigurationsEmpty) {
      elements.recentConfigurationsEmpty.style.display = "none";
    }
    for (const row of rows) {
      const li = document.createElement("li");
      li.className = "recent-config-row";
      const titleLine = document.createElement("div");
      titleLine.className = "recent-config-row-title";
      const projectName =
        (row.project_name && String(row.project_name).trim()) ||
        catT("без названия проекта", "no project name");
      titleLine.textContent =
        projectName + " " + formatRecentConfigDate(row.created_at);
      li.appendChild(titleLine);
      const meta = document.createElement("div");
      meta.className = "recent-config-meta";
      meta.textContent =
        "#" +
        (row.id ?? "—") +
        " · " +
        catT(
          "позиций в составе: " + (row.items_count ?? "—"),
          "lines in spec: " + (row.items_count ?? "—")
        );
      li.appendChild(meta);
      if (row.id != null) {
        appendRecentConfigExportActions(li, Number(row.id));
      }
      elements.recentConfigurationsList.appendChild(li);
    }
  } catch (e) {
    console.error(e);
    if (elements.recentConfigurationsEmpty) {
      elements.recentConfigurationsEmpty.textContent = catT(
        "Пока не удалось загрузить историю.",
        "History could not be loaded right now."
      );
      elements.recentConfigurationsEmpty.style.display = "block";
    }
  }
}

async function loadProducts() {
  setProductsStatus("", "info");
  const isAdmin = getCurrentRoleId() === 1;
  const globalSearch = userCatalogGlobalSearchActive();
  const userNeedsSubgroup =
    isUserCatalogWizard() && !userCatalogAtProductsLevel() && !globalSearch;

  if (userNeedsSubgroup) {
    products = [];
    productsTotal = 0;
    await Promise.all([loadCatalogGroups()]);
    syncUserCatalogPanels();
    renderCatalogNavigation();
    renderProducts();
    renderSelectedPills();
    updateCounter();
    return;
  }

  elements.productsSource.textContent =
    "GET /products (пробуем запрос к backend)";

  let httpStatus = null;
  let serverDetail = "";

  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("page_size", String(productsPageSize));
  const q = (productSearchTerm || "").trim();
  if (q) params.set("q", q);
  for (const def of activeCatalogFilterDefs()) {
    const val = (catalogFilters[def.code] || "").trim();
    if (val) params.set(def.code, val);
  }

  if (isAdmin) {
    if (adminCatalogSubgroupFilter) {
      params.set("subgroup_id", adminCatalogSubgroupFilter);
    } else if (adminCatalogGroupFilter) {
      params.set("group_id", adminCatalogGroupFilter);
    }
    if (adminCatalogCategoryFilter) {
      params.set("product_category", adminCatalogCategoryFilter);
    }
  } else if (catalogSubgroupId) {
    params.set("subgroup_id", String(catalogSubgroupId));
  }
  if (!isAdmin && catalogCategoryFilter) {
    params.set("product_category", catalogCategoryFilter);
  }

  const activeSub = isAdmin
    ? adminCatalogSubgroupFilter
      ? catalogGroups
          .flatMap((g) => g.subgroups || [])
          .find((s) => String(s.id) === String(adminCatalogSubgroupFilter))
      : null
    : selectedCatalogSubgroup();
  if (!isAdmin && !globalSearch && isConfiguratorEquipmentSubgroup(activeSub)) {
    params.set("configurator_only", "true");
  }

  setPanelLoading(
    elements.userProductsLoading,
    true,
    catT("Загрузка…", "Loading…")
  );
  setPanelLoading(
    elements.adminProductsLoading,
    true,
    catT("Загрузка…", "Loading…")
  );
  try {
    const response = await apiFetch("/products?" + params.toString(), {
      method: "GET",
      __globalLoading: false,
    });
    httpStatus = response.status;
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const d = data && data.detail;
      if (typeof d === "string") {
        serverDetail = d;
      } else if (Array.isArray(d)) {
        serverDetail = d
          .map((x) =>
            x && typeof x.msg === "string" ? x.msg : JSON.stringify(x)
          )
          .join("; ");
      } else if (d != null) {
        serverDetail = String(d);
      } else {
        serverDetail = response.statusText || "";
      }
      throw new Error("HTTP " + httpStatus);
    }

    if (data && Array.isArray(data.items)) {
      products = data.items;
      productsTotal = Number(data.total) || products.length;
    } else {
      products = Array.isArray(data) ? data : [];
      productsTotal = products.length;
    }
    for (const item of products) {
      rememberConfigProduct(item);
    }

    elements.productsSource.textContent =
      "GET /products (данные из backend)";
    setProductsStatus("", "info");
  } catch (error) {
    console.error("Failed to load products from backend:", error);
    products = [];
    productsTotal = 0;
    const parts = [
      catT(
        "Не удалось загрузить каталог продуктов.",
        "Could not load the product catalog."
      ),
      httpStatus != null ? "HTTP " + httpStatus + "." : "",
      serverDetail ? serverDetail : "",
      error &&
      error.message &&
      error.message !== "HTTP " + httpStatus &&
      error.message !== "empty_list"
        ? error.message
        : "",
    ];
    if (error && error.message === "empty_list") {
      setProductsStatus(
        catT(
          "Каталог пуст или ничего не найдено по фильтрам.",
          "Catalog is empty or no matches for current filters."
        ),
        "info"
      );
    } else {
      setProductsStatus(
        parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
        "error"
      );
    }
    elements.productsSource.textContent =
      catT("GET /products — ошибка", "GET /products — error") +
      (httpStatus != null ? " (" + httpStatus + ")" : "");
  } finally {
    setPanelLoading(elements.userProductsLoading, false);
    setPanelLoading(elements.adminProductsLoading, false);
  }

  await Promise.all([
    loadCatalogGroups(),
    loadCatalogSpecFilterOptions(),
    loadSpecParametersForAdmin(),
  ]);
  renderCatalogFilterControls();
  syncCatalogFiltersVisibility();
  syncProductFilterInputsFromState();
  syncProductSpecFilterUi();
  syncUserCatalogPanels();
  renderCatalogNavigation();
  renderProducts();
  renderSelectedPills();
  updateCounter();
  refreshAdminProductUi();
}

function appendConfirmSummaryRow(container, label, value) {
  const row = document.createElement("div");
  row.style.marginBottom = "6px";
  const strong = document.createElement("strong");
  strong.textContent = label + " ";
  row.appendChild(strong);
  const span = document.createElement("span");
  span.textContent =
    value != null && String(value).trim() ? String(value).trim() : "—";
  row.appendChild(span);
  container.appendChild(row);
}

function fillConfirmSubmitScroll(payload, submitterEmail) {
  const host = elements.confirmSubmitScroll;
  if (!host) return;
  host.textContent = "";
  appendConfirmSummaryRow(
    host,
    catT("Проект:", "Project:"),
    payload.project_name
  );
  appendConfirmSummaryRow(
    host,
    catT("Контакт:", "Contact:"),
    payload.project_contact_name
  );
  const explicitEmail = (payload.project_contact_email || "").trim();
  const contactEmailDisplay = explicitEmail
    ? explicitEmail
    : submitterEmail
      ? catT(
          "(не указан — будет использована почта учётной записи)",
          "(not set — your account email will be used)"
        )
      : "—";
  appendConfirmSummaryRow(
    host,
    catT("Email контакта:", "Contact email:"),
    contactEmailDisplay
  );
  appendConfirmSummaryRow(
    host,
    catT("Заметки:", "Notes:"),
    payload.project_notes
  );
  if (submitterEmail) {
    appendConfirmSummaryRow(
      host,
      catT("Почта учётной записи:", "Account email:"),
      submitterEmail
    );
  }
  const head = document.createElement("div");
  head.style.marginTop = "10px";
  head.style.fontWeight = "600";
  head.textContent = catT("Состав:", "Contents:");
  host.appendChild(head);
  const ul = document.createElement("ul");
  ul.style.margin = "6px 0 0";
  ul.style.paddingLeft = "1.1em";
  for (const line of payload.lines || []) {
    const pid = line.equipment_product_id;
    const p = productForConfigLine(pid);
    const li = document.createElement("li");
    li.textContent = selectionPillCaption(p);
    ul.appendChild(li);
  }
  host.appendChild(ul);
}

function beginCreateConfigurationFlow() {
  if (!accessToken) {
    redirectToLogin();
    return;
  }

  let userId = Number(elements.userIdInput.value || "0");
  if (!userId || userId <= 0) {
    setStatus(
      catT(
        "Укажи корректный user_id (целое число).",
        "Enter a valid user id (integer)."
      ),
      "error"
    );
    return;
  }

  if (configLineState.size === 0) {
    setStatus(
      catT(
        "Выбери хотя бы одну позицию для конфигурации.",
        "Select at least one line for the configuration."
      ),
      "error"
    );
    return;
  }

  if (accessToken) {
    const tokenData = parseJwt(accessToken);
    const tokenUserId = tokenData && tokenData.sub ? Number(tokenData.sub) : null;
    if (tokenUserId && tokenUserId > 0) {
      userId = tokenUserId;
    }
  }

  const lines = [];
  for (const [pid, st] of configLineState) {
    const licAdds = orderedLicenseAddons(st);
    const modAdds = orderedModuleAddons(st);
    const svcAdds = orderedServiceAddons(st);
    const addons = licAdds.concat(modAdds).concat(svcAdds);
    const line = {
      equipment_product_id: pid,
      addons,
    };
    const eqQty = Number(st.quantity);
    if (Number.isFinite(eqQty) && eqQty > 1) {
      line.quantity = eqQty;
    }
    if (st.targetAp != null && st.targetAp > 0) {
      line.target_ap_count = st.targetAp;
    }
    lines.push(line);
  }

  const projectName = (elements.projectNameInput?.value || "").trim();
  if (!projectName) {
    setStatus(
      catT(
        "Укажи название проекта перед отправкой.",
        "Enter a project name before submitting."
      ),
      "error"
    );
    return;
  }

  const contactName = (elements.projectContactNameInput?.value || "").trim();
  const contactEmailRaw = (elements.projectContactEmailInput?.value || "")
    .trim()
    .toLowerCase();
  if (contactEmailRaw && !contactEmailRaw.includes("@")) {
    setStatus(
      catT(
        "Контактный email проекта выглядит некорректно.",
        "The project contact email does not look valid."
      ),
      "error"
    );
    return;
  }

  const submitterEmail = getSubmitterEmailFromToken();
  const payload = {
    user_id: userId,
    lines,
    project_name: projectName,
    project_contact_name: contactName || undefined,
    project_notes: (elements.projectNotesInput?.value || "").trim() || undefined,
  };
  if (contactEmailRaw) {
    payload.project_contact_email = contactEmailRaw;
  }
  if (submitterEmail) {
    payload.submitter_email = submitterEmail;
  }

  pendingConfigurationPayload = payload;
  fillConfirmSubmitScroll(payload, submitterEmail);
  if (elements.confirmSubmitTitle) {
    elements.confirmSubmitTitle.textContent = catT(
      "Подтверждение отправки",
      "Confirm submission"
    );
  }
  if (elements.confirmSubmitQuestion) {
    elements.confirmSubmitQuestion.textContent = catT(
      "Отправить эту конфигурацию? Проверьте состав и данные проекта.",
      "Submit this configuration? Please review the lines and project details."
    );
  }

  if (
    elements.confirmSubmitDialog &&
    typeof elements.confirmSubmitDialog.showModal === "function"
  ) {
    elements.confirmSubmitDialog.showModal();
  } else {
    const ok = window.confirm(
      catT("Отправить конфигурацию?", "Submit this configuration?")
    );
    if (ok) {
      void executeCreateConfiguration(payload);
    } else {
      pendingConfigurationPayload = null;
    }
  }
}

function configExportLeadText(exportCtx) {
  const isEn = uiLang === "en";
  const id =
    exportCtx && exportCtx.configurationId != null
      ? String(exportCtx.configurationId)
      : "";
  const project =
    exportCtx &&
    exportCtx.projectName &&
    String(exportCtx.projectName).trim();
  const idPart = id
    ? isEn
      ? "Configuration #" + id
      : "Конфигурация №" + id
    : "";
  const projectPart = project
    ? (isEn ? "Project: " : "Проект: ") + project
    : "";
  const emailRecipient =
    exportCtx &&
    exportCtx.emailRecipient &&
    String(exportCtx.emailRecipient).trim();
  let emailPart = "";
  if (exportCtx && exportCtx.emailSent && emailRecipient) {
    emailPart = isEn
      ? "Specification was emailed to " + emailRecipient
      : "Спецификация отправлена на " + emailRecipient;
  } else if (exportCtx && exportCtx.emailError) {
    emailPart = isEn
      ? "Email delivery failed: " + exportCtx.emailError
      : "Не удалось отправить на почту: " + exportCtx.emailError;
  }
  const intro = isEn
    ? "You can also download the specification as Excel or CSV."
    : "При необходимости скачайте спецификацию в Excel или CSV.";
  return [idPart, projectPart, emailPart, intro].filter(Boolean).join(". ");
}

function setConfigExportButtonsBusy(busy) {
  const buttons = [
    elements.configExportXlsxBtn,
    elements.configExportCsvBtn,
  ];
  for (const btn of buttons) {
    if (!btn) continue;
    btn.disabled = !!busy;
  }
}

function syncConfigExportDialogLabels(exportCtx) {
  const isEn = uiLang === "en";
  if (elements.configExportTitle) {
    elements.configExportTitle.textContent = isEn
      ? "Configuration submitted"
      : "Конфигурация отправлена";
  }
  if (elements.configExportLead) {
    elements.configExportLead.textContent = configExportLeadText(
      exportCtx || pendingConfigurationExport
    );
  }
  if (elements.configExportXlsxBtn) {
    elements.configExportXlsxBtn.textContent = isEn
      ? "Download Excel (.xlsx)"
      : "Скачать Excel (.xlsx)";
  }
  if (elements.configExportCsvBtn) {
    elements.configExportCsvBtn.textContent = isEn
      ? "Download CSV (Google Sheets)"
      : "Скачать CSV (Google Таблицы)";
  }
  if (elements.configExportCloseBtn) {
    elements.configExportCloseBtn.textContent = isEn ? "Close" : "Закрыть";
  }
}

function showConfigurationExportDialog(exportCtx) {
  if (!exportCtx || !exportCtx.configurationId) return;
  pendingConfigurationExport = exportCtx;
  setConfigExportButtonsBusy(false);
  syncConfigExportDialogLabels(exportCtx);
  if (elements.configExportDialog && typeof elements.configExportDialog.showModal === "function") {
    elements.configExportDialog.showModal();
  }
}

function appendRecentConfigExportActions(parent, configurationId) {
  if (!parent || !configurationId) return;
  const actions = document.createElement("div");
  actions.className = "recent-config-export-actions";
  const xlsxBtn = document.createElement("button");
  xlsxBtn.type = "button";
  xlsxBtn.className = "secondary-btn recent-config-export-btn";
  xlsxBtn.textContent = catT("Скачать Excel", "Download Excel");
  xlsxBtn.addEventListener("click", () => {
    void downloadConfigurationExportFile(configurationId, "xlsx");
  });
  const csvBtn = document.createElement("button");
  csvBtn.type = "button";
  csvBtn.className = "secondary-btn recent-config-export-btn";
  csvBtn.textContent = catT("Скачать CSV", "Download CSV");
  csvBtn.addEventListener("click", () => {
    void downloadConfigurationExportFile(configurationId, "csv");
  });
  actions.appendChild(xlsxBtn);
  actions.appendChild(csvBtn);
  parent.appendChild(actions);
}

async function downloadConfigurationExportFile(configurationId, format) {
  if (!configurationId || !accessToken) return false;
  const ext = format === "csv" ? "csv" : "xlsx";
  const dialogOpen =
    elements.configExportDialog &&
    elements.configExportDialog.open;
  if (dialogOpen) setConfigExportButtonsBusy(true);
  try {
    const response = await apiFetch(
      "/configurations/" +
        encodeURIComponent(String(configurationId)) +
        "/specification." +
        ext,
      { method: "GET" }
    );
    if (!response.ok) {
      let detail = "";
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) detail = String(errJson.detail);
      } catch {
        detail = response.statusText || "";
      }
      setStatus(
        catT(
          "Не удалось скачать файл спецификации.",
          "Could not download the specification file."
        ) +
          (detail ? " " + detail : ""),
        "error"
      );
      return false;
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      setStatus(
        catT(
          "Файл спецификации пустой.",
          "The specification file is empty."
        ),
        "error"
      );
      return false;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "configuration-" + configurationId + "-spec." + ext;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
    }, 2000);
    showToast(
      catT(
        "Файл спецификации скачан.",
        "Specification file downloaded."
      ),
      "success"
    );
    return true;
  } catch (error) {
    console.error("Specification export download failed:", error);
    setStatus(
      catT(
        "Не удалось скачать файл спецификации.",
        "Could not download the specification file."
      ),
      "error"
    );
    return false;
  } finally {
    if (dialogOpen) setConfigExportButtonsBusy(false);
  }
}

async function executeCreateConfiguration(payload) {
  if (!accessToken) {
    redirectToLogin();
    return;
  }

  elements.createConfigBtn.disabled = true;
  setStatus(
    catT("Отправляем конфигурацию…", "Submitting configuration…"),
    "info"
  );

  try {
    const response = await apiFetch("/configurations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      let message = catT(
        "Ошибка при создании конфигурации.",
        "Could not create the configuration."
      );
      if (json && json.detail) {
        message += " " + json.detail;
      }
      setStatus(message, "error");
      return;
    }

    const emailSent = !!(json && json.email_sent);
    const emailRecipient =
      json && json.email_recipient
        ? String(json.email_recipient).trim()
        : "";
    const emailError =
      json && json.email_error ? String(json.email_error).trim() : "";

    if (emailSent && emailRecipient) {
      setStatus(
        catT(
          "Конфигурация отправлена. Excel отправлен на " + emailRecipient + ".",
          "Configuration submitted. Excel was emailed to " + emailRecipient + "."
        ),
        "success"
      );
    } else if (json && json.submitted_to_sales && emailError) {
      setStatus(
        catT(
          "Конфигурация сохранена, но письмо не отправлено: " + emailError,
          "Configuration saved, but email was not sent: " + emailError
        ),
        "error"
      );
    } else {
    setStatus(
      catT(
        "Конфигурация успешно создана.",
        "Configuration created successfully."
      ),
      "success"
    );
    }

    clearAllConfigurationSelections();

    const configurationId =
      json && json.configuration_id != null ? Number(json.configuration_id) : null;
    if (configurationId && Number.isFinite(configurationId)) {
      const projectName =
        json &&
        json.project &&
        json.project.project_name &&
        String(json.project.project_name).trim();
      showConfigurationExportDialog({
        configurationId,
        projectName: projectName || payload.project_name || "",
        emailSent,
        emailRecipient,
        emailError,
      });
    }

    if (getCurrentRoleId() !== 1) {
      void loadRecentConfigurations();
    }
  } catch (error) {
    console.error("Failed to create configuration:", error);
    setStatus(
      catT(
        "Не удалось отправить запрос к backend. Проверь, что backend запущен.",
        "Could not reach the server. Check that the backend is running."
      ),
      "error"
    );
  } finally {
    updateCreateConfigBtnState();
  }
}
