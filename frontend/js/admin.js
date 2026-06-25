// Admin panel: companies, users, catalog editor, submissions.

function formatSpecParameterOptionLabel(sp) {
  if (!sp) return "";
  const name = (sp.name || sp.code || "").trim();
  const code = (sp.code || "").trim();
  if (name && code && name !== code) {
    return name + " (" + code + ")";
  }
  return name || code || ("#" + sp.id);
}

/** @type {Record<number, string[]>} */
let adminSpecValueOptionsByParamId = {};

async function loadAdminSpecValueOptionsForEditor() {
  adminSpecValueOptionsByParamId = {};
  try {
    const res = await apiFetch("/products/spec-filter-options", {
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) return;
    for (const item of data) {
      const sp = specParameters.find((x) => x.code === item.code);
      if (!sp || !Array.isArray(item.values) || !item.values.length) continue;
      adminSpecValueOptionsByParamId[sp.id] = item.values.slice();
    }
  } catch (_) {}
}

function navigateToAdminCatalogGroups() {
  adminEditingProductId = null;
  closeAdminProductDrawer();
  const foldSummary = document.getElementById("admin-fold-groups");
  const fold = foldSummary ? foldSummary.closest("details") : null;
  if (fold) {
    fold.open = true;
    fold.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const codeInput = document.getElementById("admin-new-group-code");
  if (codeInput) {
    window.setTimeout(() => codeInput.focus(), 300);
  }
}

function closeAdminProductDrawer() {
  const overlay = elements.adminProductDrawerOverlay;
  const body = elements.adminProductDrawerBody;
  if (!overlay || !body) return;
  adminCreatingProduct = false;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  body.innerHTML = "";
  if (adminProductDrawerEscHandler) {
    document.removeEventListener("keydown", adminProductDrawerEscHandler);
    adminProductDrawerEscHandler = null;
  }
}

async function openAdminProductDrawer(p, opts) {
  const overlay = elements.adminProductDrawerOverlay;
  const drawer = elements.adminProductDrawer;
  const body = elements.adminProductDrawerBody;
  const createMode = !!(opts && opts.createMode);
  if (!overlay || !drawer || !body) return;
  adminCreatingProduct = createMode;
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  body.innerHTML =
    "<p class=\"field-description\">" +
    (uiLang === "en" ? "Loading…" : "Загрузка…") +
    "</p>";
  if (adminProductDrawerEscHandler) {
    document.removeEventListener("keydown", adminProductDrawerEscHandler);
  }
  adminProductDrawerEscHandler = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      adminEditingProductId = null;
      closeAdminProductDrawer();
    }
  };
  document.addEventListener("keydown", adminProductDrawerEscHandler);
  await loadAdminSpecValueOptionsForEditor();
  if (overlay.hidden) return;
  body.innerHTML = "";
  body.appendChild(buildAdminProductEditPanel(p, { createMode }));
  if (elements.adminProductDrawerClose) elements.adminProductDrawerClose.focus();
}

function syncAdminProductDrawer() {
  if (adminCreatingProduct) return;
  if (getCurrentRoleId() !== 1 || !adminEditingProductId) {
    closeAdminProductDrawer();
    return;
  }
  const p = products.find((x) => Number(x.id) === Number(adminEditingProductId));
  if (!p) {
    adminEditingProductId = null;
    closeAdminProductDrawer();
    return;
  }
  openAdminProductDrawer(p);
}

function openAdminProductCreateDrawer() {
  adminEditingProductId = null;
  const draft = {
    id: null,
    name: (elements.adminProductName && elements.adminProductName.value) || "",
    description:
      (elements.adminProductDesc && elements.adminProductDesc.value) || "",
    technical_specs:
      (elements.adminProductSpecs && elements.adminProductSpecs.value) || "",
    technical_spec_values: [],
    product_category:
      (elements.adminProductCategory && elements.adminProductCategory.value) || "",
    built_in_license_units:
      (elements.adminProductBuiltIn && elements.adminProductBuiltIn.value) || null,
    max_module_slots:
      (elements.adminProductMaxSlots && elements.adminProductMaxSlots.value) || null,
    module_speeds_json:
      (elements.adminProductSpeedsJson && elements.adminProductSpeedsJson.value) || "",
    rules_json: "",
  };
  openAdminProductDrawer(draft, { createMode: true });
}

function populateAdminCatalogCategorySelect() {
  const sel = elements.adminCatalogCategorySelect;
  if (!sel) return;
  const prev = adminCatalogCategoryFilter || sel.value || "";
  const allLabel = catT("Все типы", "All types");
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = allLabel;
  sel.appendChild(allOpt);
  equipmentTypeOptions.forEach((row) => {
    const code = (row.code || "").trim();
    if (!code) return;
    const opt = document.createElement("option");
    opt.value = code;
    const label = (row.label_ru || row.label || code).trim();
    opt.textContent = label === code ? code : code + " — " + label;
    sel.appendChild(opt);
  });
  if (prev && Array.from(sel.options).some((o) => o.value === prev)) {
    sel.value = prev;
  } else {
    sel.value = "";
    adminCatalogCategoryFilter = "";
  }
  fitNativeSelectToContent(sel);
}

async function loadEquipmentTypeOptions() {
  try {
    const res = await apiFetch("/products/equipment-types", {
      method: "GET",
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data)) {
      equipmentTypeOptions = [];
      return;
    }
    equipmentTypeOptions = data;
  } catch (e) {
    console.error(e);
    equipmentTypeOptions = [];
  }
  populateAdminCatalogCategorySelect();
  populateUserCatalogCategorySelect();
}

function populateUserCatalogCategorySelect() {
  const sel = elements.catalogCategorySelect;
  if (!sel) return;
  const prev = catalogCategoryFilter || sel.value || "";
  const allLabel = catT("Все типы", "All types");
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = allLabel;
  sel.appendChild(allOpt);
  equipmentTypeOptions.forEach((row) => {
    const code = (row.code || "").trim();
    if (!code) return;
    const opt = document.createElement("option");
    opt.value = code;
    const label = (row.label_ru || row.label || code).trim();
    opt.textContent = label === code ? code : code + " — " + label;
    sel.appendChild(opt);
  });
  if (prev && Array.from(sel.options).some((o) => o.value === prev)) {
    sel.value = prev;
  } else {
    sel.value = "";
    catalogCategoryFilter = "";
  }
  fitNativeSelectToContent(sel);
}

function populateAdminCatalogGroupSelect() {
  const sel = elements.adminCatalogGroupSelect;
  if (!sel) return;
  const prev = adminCatalogGroupFilter || sel.value || "";
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = catT("Все группы", "All groups");
  sel.appendChild(allOpt);
  catalogGroups.forEach((group) => {
    const opt = document.createElement("option");
    opt.value = String(group.id);
    opt.textContent = catalogGroupDisplayName(group);
    sel.appendChild(opt);
  });
  if (prev && Array.from(sel.options).some((o) => o.value === prev)) {
    sel.value = prev;
  } else {
    sel.value = "";
    adminCatalogGroupFilter = "";
  }
  populateAdminCatalogSubgroupSelect();
  fitNativeSelectsInContainer(elements.adminCatalogGroupSelect?.closest(".catalog-toolbar-filters--admin-nav"));
}

function populateAdminCatalogSubgroupSelect() {
  const sel = elements.adminCatalogSubgroupSelect;
  if (!sel) return;
  const prev = adminCatalogSubgroupFilter || sel.value || "";
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = catT("Все подгруппы", "All subgroups");
  sel.appendChild(allOpt);
  const group = findCatalogGroup(adminCatalogGroupFilter);
  const subs = group && Array.isArray(group.subgroups) ? group.subgroups : [];
  if (!adminCatalogGroupFilter) {
    catalogGroups.forEach((g) => {
      visibleCatalogSubgroups(g).forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = String(sub.id);
        opt.textContent =
          catalogGroupDisplayName(g) +
          " / " +
          catalogSubgroupDisplayName(sub, g);
        sel.appendChild(opt);
      });
    });
  } else {
    visibleCatalogSubgroups(group).forEach((sub) => {
      const opt = document.createElement("option");
      opt.value = String(sub.id);
      opt.textContent = catalogSubgroupDisplayName(sub, group);
      sel.appendChild(opt);
    });
  }
  if (prev && Array.from(sel.options).some((o) => o.value === prev)) {
    sel.value = prev;
  } else {
    sel.value = "";
    adminCatalogSubgroupFilter = "";
  }
  fitNativeSelectToContent(sel);
}

function renderAdminGroupsTable() {
  const tbody = elements.adminGroupsTbody;
  if (!tbody) return;
  tbody.innerHTML = "";
  catalogGroups.forEach((group) => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = (group.name || "—") + " (" + (group.code || "—") + ")";
    const tdSubs = document.createElement("td");
    const ul = document.createElement("ul");
    ul.className = "admin-subgroup-list";
    (group.subgroups || []).forEach((sub) => {
      const li = document.createElement("li");
      li.textContent =
        (sub.name || sub.code) +
        " · " +
        catT("товаров", "products") +
        ": " +
        (sub.product_count != null ? sub.product_count : 0);
      ul.appendChild(li);
    });
    tdSubs.appendChild(ul);
    const tdCount = document.createElement("td");
    tdCount.textContent =
      group.product_count != null ? String(group.product_count) : "0";
    const tdActions = document.createElement("td");
    const addSubBtn = document.createElement("button");
    addSubBtn.type = "button";
    addSubBtn.className = "ghost-btn";
    addSubBtn.textContent = catT("Добавить подгруппу", "Add subgroup");
    addSubBtn.addEventListener("click", () => {
      void addAdminSubgroup(group.id);
    });
    tdActions.appendChild(addSubBtn);
    tr.appendChild(tdName);
    tr.appendChild(tdSubs);
    tr.appendChild(tdCount);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

async function addAdminGroup() {
  const code = (elements.adminNewGroupCode && elements.adminNewGroupCode.value) || "";
  const name = (elements.adminNewGroupName && elements.adminNewGroupName.value) || "";
  if (!code.trim() || !name.trim()) {
    setCatalogStatus(
      "admin-groups-status",
      catT("Укажите код и название группы.", "Enter group code and name."),
      "error"
    );
    return;
  }
  try {
    const res = await apiFetch("/catalog-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim().toLowerCase(),
        name: name.trim(),
        sort_order: catalogGroups.length * 10 + 10,
        subgroups: [
          { code: "equipment", name: "Оборудование", sort_order: 10 },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.detail) || "create failed");
    if (elements.adminNewGroupCode) elements.adminNewGroupCode.value = "";
    if (elements.adminNewGroupName) elements.adminNewGroupName.value = "";
    setCatalogStatus("admin-groups-status", catT("Группа создана.", "Group created."), "info");
    await loadCatalogGroups();
  } catch (e) {
    setCatalogStatus(
      "admin-groups-status",
      catT("Не удалось создать группу: ", "Could not create group: ") +
        (e && e.message ? e.message : ""),
      "error"
    );
  }
}

async function addAdminSubgroup(groupId) {
  const code = window.prompt(
    catT("Код подгруппы (латиница):", "Subgroup code (latin):")
  );
  if (!code || !code.trim()) return;
  const name = window.prompt(
    catT("Название подгруппы:", "Subgroup name:")
  );
  if (!name || !name.trim()) return;
  try {
    const res = await apiFetch("/catalog-groups/" + groupId + "/subgroups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim().toLowerCase(),
        name: name.trim(),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.detail) || "create failed");
    setCatalogStatus(
      "admin-groups-status",
      catT("Подгруппа создана.", "Subgroup created."),
      "info"
    );
    await loadCatalogGroups();
  } catch (e) {
    setCatalogStatus(
      "admin-groups-status",
      catT("Не удалось создать подгруппу: ", "Could not create subgroup: ") +
        (e && e.message ? e.message : ""),
      "error"
    );
  }
}

async function reclassifyCatalogProducts() {
  try {
    const res = await apiFetch("/catalog-groups/reclassify-products?force=true", {
      method: "POST",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.detail) || "reclassify failed");
    setCatalogStatus(
      "admin-groups-status",
      catT(
        "Переклассификация: назначено " +
          (data.assigned || 0) +
          ", без группы " +
          (data.unmapped || 0),
        "Reclassified: assigned " +
          (data.assigned || 0) +
          ", unmapped " +
          (data.unmapped || 0)
      ),
      "info"
    );
    await loadCatalogGroups();
    await loadProducts();
  } catch (e) {
    setCatalogStatus(
      "admin-groups-status",
      catT("Ошибка переклассификации: ", "Reclassify error: ") +
        (e && e.message ? e.message : ""),
      "error"
    );
  }
}

async function loadSpecParametersForAdmin() {
  if (getCurrentRoleId() !== 1) return;
  try {
    const res = await apiFetch("/products/spec-parameters?include_inactive=true");
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.detail) || "spec params load failed");
    specParameters = Array.isArray(data) ? data : [];
    renderAdminSpecParametersTable();
  } catch (e) {
    console.error(e);
    specParameters = [];
  }
}

function refreshAdminProductUserPreview() {
  const host = elements.adminProductUserPreview;
  if (!host) return;
  host.innerHTML = "";
  const nm = (elements.adminProductName && elements.adminProductName.value) || "";
  const ds = (elements.adminProductDesc && elements.adminProductDesc.value) || "";
  const nameTrim = nm.trim();
  const descTrim = ds.trim();
  const prevEn = uiLang === "en";
  if (!nameTrim && !descTrim) {
    const ph = document.createElement("div");
    ph.className = "admin-user-product-preview-placeholder";
    ph.textContent = prevEn
      ? "Enter a name and description to see a preview here."
      : "Введите название и описание — здесь появится превью.";
    host.appendChild(ph);
  } else {
    const title = document.createElement("div");
    title.className = "product-name";
    title.textContent =
      nameTrim || (prevEn ? "(no name)" : "(без названия)");
    const desc = document.createElement("div");
    desc.className = "product-desc";
    desc.textContent = formatProductDescriptionForDisplay(descTrim) || "—";
    host.appendChild(title);
    host.appendChild(desc);
  }
  const cap = document.createElement("div");
  cap.className = "admin-user-product-preview-caption";
  cap.textContent = prevEn
    ? "This is how the card appears in the user’s product list:"
    : "Так карточка выглядит у пользователя в списке:";
  host.appendChild(cap);
}

function companyLabel(companyId) {
  const c = companiesList.find((x) => x.id === companyId);
  return c ? c.name + " · " + c.domain : "id " + companyId;
}

function roleLabel(roleId) {
  if (roleId === 1) return catT("Админ", "Admin");
  if (roleId === 2) return catT("Пользователь", "User");
  return String(roleId ?? "—");
}

function fillAdminUsersCompanySelect() {
  const sel = elements.adminUsersCompanySelect;
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = uiLang === "en" ? "All companies" : "Все компании";
  sel.appendChild(allOpt);
  companiesList.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = String(c.id);
    opt.textContent = c.name + " (" + c.domain + ")";
    sel.appendChild(opt);
  });
  if (prev !== undefined && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
  }
}

function fillAdminNewUserCompanySelect() {
  const sel = elements.adminNewUserCompanySelect;
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  if (!companiesList.length) {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = catT("Нет организаций", "No companies");
    sel.appendChild(emptyOpt);
    return;
  }
  companiesList.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = String(c.id);
    opt.textContent = c.name + " (" + c.domain + ")";
    sel.appendChild(opt);
  });
  if (prev && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
  } else if (sel.options.length) {
    sel.selectedIndex = 0;
  }
}

function fillAdminNewUserRoleSelect() {
  const sel = elements.adminNewUserRoleSelect;
  if (!sel) return;
  const prev = sel.value === "1" ? "1" : "2";
  sel.innerHTML = "";
  const userOpt = document.createElement("option");
  userOpt.value = "2";
  userOpt.textContent = catT("Пользователь", "User");
  const adminOpt = document.createElement("option");
  adminOpt.value = "1";
  adminOpt.textContent = catT("Администратор", "Admin");
  sel.appendChild(userOpt);
  sel.appendChild(adminOpt);
  sel.value = prev;
}

function syncAdminNewUserEmailHint() {
  const hint = document.getElementById("admin-new-user-domain-hint");
  if (!hint) return;
  const sel = elements.adminNewUserCompanySelect;
  if (!sel || !sel.value) {
    hint.textContent = catT(
      "Email должен совпадать с доменом выбранной организации.",
      "Email must match the selected company domain."
    );
    return;
  }
  const company = companiesList.find((c) => String(c.id) === sel.value);
  if (!company) {
    hint.textContent = catT(
      "Email должен совпадать с доменом выбранной организации.",
      "Email must match the selected company domain."
    );
    return;
  }
  hint.textContent = catT(
    "Домен email: @" + company.domain,
    "Email domain: @" + company.domain
  );
}

function fillAdminSubmissionsCompanySelect() {
  const sel = elements.adminSubmissionsCompanySelect;
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = uiLang === "en" ? "All companies" : "Все компании";
  sel.appendChild(allOpt);
  companiesList.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = String(c.id);
    opt.textContent = c.name + " (" + c.domain + ")";
    sel.appendChild(opt);
  });
  if (prev !== undefined && [...sel.options].some((o) => o.value === prev)) {
    sel.value = prev;
  }
}

function syncAdminSubmissionsPeriodSelectLabels() {
  const sel = elements.adminSubmissionsPeriodSelect;
  if (!sel || sel.options.length < 4) return;
  const labels = uiLang === "en"
    ? ["All time", "Last 7 days", "Last 30 days", "Last 90 days"]
    : ["За всё время", "За 7 дней", "За 30 дней", "За 90 дней"];
  [...sel.options].forEach((opt, idx) => {
    if (labels[idx]) opt.textContent = labels[idx];
  });
}

function adminSubmissionsFiltersActive() {
  const company =
    elements.adminSubmissionsCompanySelect &&
    elements.adminSubmissionsCompanySelect.value;
  const period =
    elements.adminSubmissionsPeriodSelect &&
    elements.adminSubmissionsPeriodSelect.value;
  return Boolean(
    (adminSubmissionsSearchTerm || "").trim() || company || period
  );
}

function syncAdminSubmissionsClearFiltersBtn() {
  if (!elements.adminSubmissionsClearFiltersBtn) return;
  elements.adminSubmissionsClearFiltersBtn.hidden =
    !adminSubmissionsFiltersActive();
}

function applyAdminSubmissionsSearch() {
  adminSubmissionsSearchTerm = (
    elements.adminSubmissionsSearchInput?.value || ""
  ).trim();
  syncAdminSubmissionsClearFiltersBtn();
  void loadAdminSubmissions();
}

function clearAdminSubmissionsFilters() {
  adminSubmissionsSearchTerm = "";
  if (elements.adminSubmissionsSearchInput) {
    elements.adminSubmissionsSearchInput.value = "";
  }
  if (elements.adminSubmissionsCompanySelect) {
    elements.adminSubmissionsCompanySelect.value = "";
  }
  if (elements.adminSubmissionsPeriodSelect) {
    elements.adminSubmissionsPeriodSelect.value = "";
  }
  syncAdminSubmissionsClearFiltersBtn();
  void loadAdminSubmissions();
}

function hideAdminCompanyEdit() {
  if (elements.adminCompanyEditWrap) {
    elements.adminCompanyEditWrap.style.display = "none";
  }
  if (elements.adminCompanyEditId) elements.adminCompanyEditId.value = "";
  if (elements.adminCompanyEditName) elements.adminCompanyEditName.value = "";
  if (elements.adminCompanyEditDomain) elements.adminCompanyEditDomain.value = "";
}

function openAdminCompanyEdit(c) {
  if (!elements.adminCompanyEditWrap) return;
  elements.adminCompanyEditId.value = String(c.id);
  elements.adminCompanyEditName.value = c.name || "";
  elements.adminCompanyEditDomain.value = c.domain || "";
  elements.adminCompanyEditWrap.style.display = "";
  elements.adminCompanyEditName.focus();
}

function renderAdminCompaniesTable() {
  const tb = elements.adminCompaniesTbody;
  if (!tb) return;
  tb.innerHTML = "";
  if (!adminCompaniesTableList.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = catT(
      "Организации не найдены.",
      "No companies match your search."
    );
    tr.appendChild(td);
    tb.appendChild(tr);
    return;
  }
  adminCompaniesTableList.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      c.id +
      "</td><td>" +
      escapeHtml(c.name) +
      "</td><td>" +
      escapeHtml(c.domain) +
      "</td><td></td>";
    const tdBtn = tr.querySelector("td:last-child");
    tdBtn.style.whiteSpace = "nowrap";
    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "ghost-btn";
    btnEdit.textContent = uiLang === "en" ? "Edit" : "Изменить";
    btnEdit.addEventListener("click", () => openAdminCompanyEdit(c));
    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "ghost-btn danger";
    btnDel.style.marginLeft = "6px";
    btnDel.textContent = uiLang === "en" ? "Delete" : "Удалить";
    btnDel.addEventListener("click", () => deleteAdminCompany(c));
    tdBtn.appendChild(btnEdit);
    tdBtn.appendChild(btnDel);
    tb.appendChild(tr);
  });
}


async function refreshCompaniesListForSelect() {
  if (getCurrentRoleId() !== 1) return;
  try {
    const res = await apiFetch("/companies", {
      method: "GET",
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;
    companiesList = Array.isArray(data) ? data : [];
    fillAdminUsersCompanySelect();
    fillAdminNewUserCompanySelect();
    syncAdminNewUserEmailHint();
  } catch (e) {
    console.error(e);
  }
}

async function loadAdminCompanies() {
  if (getCurrentRoleId() !== 1) return;
  const params = new URLSearchParams();
  const search = (adminCompaniesSearchTerm || "").trim();
  if (search) params.set("q", search);
  const q = params.toString() ? "?" + params.toString() : "";
  setPanelLoading(
    elements.adminCompaniesLoading,
    true,
    catT("Загрузка…", "Loading…")
  );
  try {
    const res = await apiFetch("/companies" + q, {
      method: "GET",
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-companies-status",
        (data && data.detail) ||
          catT("Не удалось загрузить организации", "Could not load companies"),
        "error"
      );
      return;
    }
    adminCompaniesTableList = Array.isArray(data) ? data : [];
    if (!search) {
      companiesList = adminCompaniesTableList;
      fillAdminUsersCompanySelect();
      fillAdminNewUserCompanySelect();
      syncAdminNewUserEmailHint();
      fillAdminSubmissionsCompanySelect();
    }
    renderAdminCompaniesTable();
    setCatalogStatus("admin-companies-status", "", "info");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-companies-status",
      catT(
        "Сеть: не удалось загрузить организации",
        "Network: could not load companies"
      ),
      "error"
    );
  } finally {
    setPanelLoading(elements.adminCompaniesLoading, false);
  }
}

function applyAdminCompaniesSearch() {
  adminCompaniesSearchTerm = (
    elements.adminCompaniesSearchInput?.value || ""
  ).trim();
  void loadAdminCompanies();
}

function syncAdminUsersPendingBadge() {
  const badge = elements.adminUsersPendingBadge;
  if (!badge) return;
  const count = adminUsersPendingCount;
  const show = count > 0 && !adminUsersPendingBadgeDismissed;
  badge.hidden = !show;
  if (!show) return;
  badge.textContent =
    count === 1
      ? catT("Новое", "New")
      : catT("Новых: " + count, count + " new");
}

async function refreshAdminUsersPendingCount() {
  if (getCurrentRoleId() !== 1) return;
  try {
    const res = await apiFetch("/users/pending-count", {
      method: "GET",
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return;
    const count = Number(data && data.pending_count) || 0;
    if (count > lastAdminUsersPendingCount) {
      adminUsersPendingBadgeDismissed = false;
    }
    lastAdminUsersPendingCount = count;
    adminUsersPendingCount = count;
    syncAdminUsersPendingBadge();
  } catch (e) {
    console.error(e);
  }
}

async function loadAdminUsers(options) {
  if (getCurrentRoleId() !== 1) return;
  const toastOnSuccess = options && options.toastOnSuccess;
  const sel = elements.adminUsersCompanySelect;
  const params = new URLSearchParams();
  if (sel && sel.value && sel.value !== "") {
    params.set("company_id", sel.value);
  }
  const search = (adminUsersSearchTerm || "").trim();
  if (search) params.set("q", search);
  const q = params.toString() ? "?" + params.toString() : "";
  setPanelLoading(
    elements.adminUsersLoading,
    true,
    catT("Загрузка…", "Loading…")
  );
  try {
    const res = await apiFetch("/users" + q, {
      method: "GET",
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-users-status",
        (data && data.detail) ||
          catT("Не удалось загрузить пользователей", "Could not load users"),
        "error"
      );
      return;
    }
    adminUsersList = Array.isArray(data) ? data : [];
    renderAdminUsersTable();
    await refreshAdminUsersPendingCount();
    setCatalogStatus("admin-users-status", "", "info");
    if (toastOnSuccess) {
      showToast(
        catT("Список пользователей обновлён", "Users list updated"),
        "success"
      );
    }
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-users-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  } finally {
    setPanelLoading(elements.adminUsersLoading, false);
  }
}

function applyAdminUsersSearch() {
  adminUsersSearchTerm = (
    elements.adminUsersSearchInput?.value || ""
  ).trim();
  void loadAdminUsers();
}

function syncAdminSubmissionsUiVisibility() {
  if (!elements.adminSubmissionsFold) return;
  elements.adminSubmissionsFold.hidden = !ADMIN_SALES_SUBMISSIONS_UI;
}

function formatAdminSubmissionWhen(value) {
  const text = value == null ? "" : String(value).trim();
  if (!text) return "—";
  return text.replace("T", " ").replace(/\+.*$/, "");
}

function formatAdminSubmissionContact(project) {
  const p = project && typeof project === "object" ? project : {};
  const name = (p.project_contact_name || "").trim();
  const email = (p.project_contact_email || "").trim();
  if (name && email) return name + " · " + email;
  return name || email || "—";
}

async function loadAdminSubmissions(options) {
  if (!ADMIN_SALES_SUBMISSIONS_UI || getCurrentRoleId() !== 1) return;
  const toastOnSuccess = options && options.toastOnSuccess;
  const params = new URLSearchParams();
  const search = (adminSubmissionsSearchTerm || "").trim();
  if (search) params.set("q", search);
  const companySel = elements.adminSubmissionsCompanySelect;
  if (companySel && companySel.value) {
    params.set("company_id", companySel.value);
  }
  const periodSel = elements.adminSubmissionsPeriodSelect;
  if (periodSel && periodSel.value) {
    params.set("since_days", periodSel.value);
  }
  const q = params.toString() ? "?" + params.toString() : "";
  setPanelLoading(
    elements.adminSubmissionsLoading,
    true,
    catT("Загрузка…", "Loading…")
  );
  try {
    const res = await apiFetch("/configurations/submissions" + q, {
      method: "GET",
      __globalLoading: false,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-submissions-status",
        (data && data.detail) ||
          catT(
            "Не удалось загрузить заявки",
            "Could not load sales submissions"
          ),
        "error"
      );
      return;
    }
    adminSubmissionsList = Array.isArray(data) ? data : [];
    renderAdminSubmissionsTable();
    syncAdminSubmissionsClearFiltersBtn();
    setCatalogStatus("admin-submissions-status", "", "info");
    if (toastOnSuccess) {
      showToast(
        catT("Список заявок обновлён", "Submissions list updated"),
        "success"
      );
    }
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-submissions-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  } finally {
    setPanelLoading(elements.adminSubmissionsLoading, false);
  }
}

function renderAdminSubmissionsTable() {
  const tb = elements.adminSubmissionsTbody;
  if (!tb) return;
  tb.innerHTML = "";
  if (!adminSubmissionsList.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.textContent = adminSubmissionsFiltersActive()
      ? catT(
          "По вашему запросу заявок не найдено.",
          "No submissions match your filters."
        )
      : catT("Заявок пока нет.", "No sales submissions yet.");
    tr.appendChild(td);
    tb.appendChild(tr);
    return;
  }
  adminSubmissionsList.forEach((row) => {
    const tr = document.createElement("tr");
    const project = row.project || {};
    const user = row.user || {};
    const company = row.company || {};
    const configId = row.configuration_id;

    function addCell(text, className) {
      const td = document.createElement("td");
      if (className) td.className = className;
      td.textContent = text;
      tr.appendChild(td);
    }

    addCell(String(configId || "—"));
    addCell(formatAdminSubmissionWhen(row.submitted_at || row.created_at));
    addCell(truncateCellText(project.project_name, 48));
    addCell(
      truncateCellText(
        (user.name || "—") +
          (user.email ? " · " + user.email : ""),
        56
      )
    );
    addCell(truncateCellText(company.name || "—", 32));
    addCell(truncateCellText(formatAdminSubmissionContact(project), 48));

    const itemsTd = document.createElement("td");
    itemsTd.textContent =
      row.items_count != null ? String(row.items_count) : "—";
    tr.appendChild(itemsTd);

    const notesTd = document.createElement("td");
    notesTd.className = "admin-submission-notes";
    const notes = (project.project_notes || "").trim();
    notesTd.textContent = notes ? truncateCellText(notes, 80) : "—";
    if (notes) notesTd.title = notes;
    tr.appendChild(notesTd);

    const exportTd = document.createElement("td");
    exportTd.className = "admin-submissions-export-cell";
    appendRecentConfigExportActions(exportTd, configId);
    tr.appendChild(exportTd);

    const actionsTd = document.createElement("td");
    actionsTd.className = "admin-submission-actions";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-btn danger";
    deleteBtn.textContent = catT("Удалить", "Delete");
    deleteBtn.addEventListener("click", () => {
      void deleteAdminSubmission(row);
    });
    actionsTd.appendChild(deleteBtn);
    tr.appendChild(actionsTd);

    tb.appendChild(tr);
  });
}

async function deleteAdminSubmission(row) {
  const configId = Number(row && row.configuration_id);
  if (!configId) return;
  const projectName = ((row.project || {}).project_name || "").trim();
  const label = projectName || "#" + configId;
  if (
    !(await adminConfirmDelete(
      catT(
        'Удалить заявку "' + label + '" (id ' + configId + ")?",
        'Delete submission "' + label + '" (id ' + configId + ")?"
      ),
      [
        catT(
          "Конфигурация и строки спецификации будут удалены без восстановления.",
          "The configuration and its specification lines will be permanently deleted."
        ),
      ]
    ))
  ) {
    return;
  }
  try {
    const res = await apiFetch(
      "/configurations/" + encodeURIComponent(String(configId)),
      { method: "DELETE", __globalLoading: false }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-submissions-status",
        (data && data.detail) || catT("Не удалось удалить", "Delete failed"),
        "error"
      );
      return;
    }
    await loadAdminSubmissions();
    showToast(catT("Заявка удалена", "Submission deleted"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-submissions-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

function renderAdminUsersTable() {
  const tb = elements.adminUsersTbody;
  if (!tb) return;
  tb.innerHTML = "";
  if (!adminUsersList.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = catT(
      "Пользователи не найдены.",
      "No users match your search."
    );
    tr.appendChild(td);
    tb.appendChild(tr);
    return;
  }
  adminUsersList.forEach((u) => {
    const tr = document.createElement("tr");

    function addCell(text) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }

    addCell(String(u.id));
    addCell(u.name || "—");
    addCell(u.email || "—");
    addCell(roleLabel(u.role_id));
    addCell(companyLabel(u.company_id));

    const statusTd = document.createElement("td");
    const approved = u.is_approved !== false;
    statusTd.textContent = approved
      ? catT("Одобрен", "Approved")
      : catT("Ожидает", "Pending");
    statusTd.className = approved
      ? "admin-user-status-approved"
      : "admin-user-status-pending";
    tr.appendChild(statusTd);

    const actionsTd = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "admin-user-actions";
    if (!approved && u.role_id !== 1) {
      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "secondary-btn";
      approveBtn.textContent = catT("Одобрить", "Approve");
      approveBtn.addEventListener("click", () => {
        void patchAdminUser(u.id, { is_approved: true });
      });
      actionsWrap.appendChild(approveBtn);
    }
    if (Number(u.id) !== 1) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "ghost-btn danger";
      deleteBtn.textContent = catT("Удалить", "Delete");
      deleteBtn.addEventListener("click", () => {
        void deleteAdminUser(u);
      });
      actionsWrap.appendChild(deleteBtn);
    }
    if (!actionsWrap.childElementCount) {
      actionsWrap.textContent = "—";
    }
    actionsTd.appendChild(actionsWrap);
    tr.appendChild(actionsTd);

    const commentTd = document.createElement("td");
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.className = "admin-user-comment-input";
    commentInput.value = u.admin_comment || "";
    commentInput.placeholder = catT(
      "Заметка (не видна пользователю)",
      "Note (hidden from user)"
    );
    commentInput.addEventListener("change", () => {
      void patchAdminUser(u.id, {
        admin_comment: commentInput.value.trim() || null,
      });
    });
    commentTd.appendChild(commentInput);
    tr.appendChild(commentTd);

    tb.appendChild(tr);
  });
}

async function createAdminUser() {
  const name = (elements.adminNewUserName?.value || "").trim();
  const email = (elements.adminNewUserEmail?.value || "").trim();
  const password = elements.adminNewUserPassword?.value || "";
  const companyId = Number(elements.adminNewUserCompanySelect?.value || 0);
  const roleId = Number(elements.adminNewUserRoleSelect?.value || 2);

  if (!name || !email || !password) {
    setCatalogStatus(
      "admin-users-status",
      catT(
        "Укажите имя, email и пароль.",
        "Enter name, email and password."
      ),
      "error"
    );
    return;
  }
  if (!companyId) {
    setCatalogStatus(
      "admin-users-status",
      catT("Выберите организацию.", "Select a company."),
      "error"
    );
    return;
  }
  if (password.length < 6) {
    setCatalogStatus(
      "admin-users-status",
      catT(
        "Пароль должен быть не короче 6 символов.",
        "Password must be at least 6 characters."
      ),
      "error"
    );
    return;
  }

  try {
    const res = await apiFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role_id: roleId,
        company_id: companyId,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data && data.detail;
      setCatalogStatus(
        "admin-users-status",
        typeof detail === "string"
          ? detail
          : catT("Не удалось создать пользователя", "Could not create user"),
        "error"
      );
      return;
    }
    if (elements.adminNewUserName) elements.adminNewUserName.value = "";
    if (elements.adminNewUserEmail) elements.adminNewUserEmail.value = "";
    if (elements.adminNewUserPassword) elements.adminNewUserPassword.value = "";
    if (elements.adminNewUserRoleSelect) elements.adminNewUserRoleSelect.value = "2";
    adminUsersSearchTerm = email;
    if (elements.adminUsersSearchInput) {
      elements.adminUsersSearchInput.value = email;
    }
    await loadAdminUsers();
    setCatalogStatus("admin-users-status", "", "info");
    showToast(catT("Пользователь создан", "User created"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-users-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function patchAdminUser(userId, body) {
  try {
    const res = await apiFetch("/users/" + encodeURIComponent(String(userId)), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-users-status",
        (data && data.detail) || catT("Не удалось обновить", "Update failed"),
        "error"
      );
      return;
    }
    await loadAdminUsers();
    showToast(catT("Пользователь обновлён", "User updated"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-users-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function deleteAdminUser(u) {
  const userId = Number(u.id);
  if (!userId || userId === 1) return;
  const label = (u.name || u.email || "#" + userId).trim();
  if (
    !(await adminConfirmDelete(
      catT(
        'Удалить пользователя "' + label + '" (id ' + userId + ")?",
        'Delete user "' + label + '" (id ' + userId + ")?"
      ),
      [
        catT(
          "Будут удалены конфигурации и сессии этого пользователя.",
          "This user's configurations and sessions will be deleted."
        ),
      ]
    ))
  ) {
    return;
  }
  try {
    const res = await apiFetch("/users/" + encodeURIComponent(String(userId)), {
      method: "DELETE",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-users-status",
        (data && data.detail) || catT("Не удалось удалить", "Delete failed"),
        "error"
      );
      return;
    }
    await loadAdminUsers();
    showToast(catT("Пользователь удалён", "User deleted"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-users-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

function renderAdminSpecParametersTable() {
  const tb = elements.adminSpecParamsTbody;
  if (!tb) return;
  tb.innerHTML = "";
  specParameters.forEach((sp) => {
    const tr = document.createElement("tr");
    [
      String(sp.id),
      sp.code || "—",
      sp.name || "—",
      String(sp.sort_order != null ? sp.sort_order : "—"),
      sp.is_active ? catT("Да", "Yes") : catT("Нет", "No"),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    const actTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ghost-btn danger";
    delBtn.textContent = catT("Удалить", "Delete");
    delBtn.addEventListener("click", () => {
      void deleteAdminSpecParameter(sp.id);
    });
    actTd.appendChild(delBtn);
    tr.appendChild(actTd);
    tb.appendChild(tr);
  });
}

async function createAdminSpecParameter() {
  const code = (elements.adminSpecParamCode?.value || "").trim();
  const name = (elements.adminSpecParamName?.value || "").trim();
  const sortRaw = (elements.adminSpecParamSort?.value || "").trim();
  if (!code || !name) {
    setCatalogStatus(
      "admin-spec-params-status",
      catT("Укажите код и название.", "Enter code and name."),
      "error"
    );
    return;
  }
  const body = { code, name, sort_order: sortRaw ? parseInt(sortRaw, 10) || 0 : 0 };
  try {
    const res = await apiFetch("/products/spec-parameters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-spec-params-status",
        (data && data.detail) || catT("Ошибка", "Error"),
        "error"
      );
      return;
    }
    if (elements.adminSpecParamCode) elements.adminSpecParamCode.value = "";
    if (elements.adminSpecParamName) elements.adminSpecParamName.value = "";
    if (elements.adminSpecParamSort) elements.adminSpecParamSort.value = "";
    await loadSpecParametersForAdmin();
    renderAdminSpecParametersTable();
    setCatalogStatus("admin-spec-params-status", "", "info");
    showToast(catT("Параметр добавлен", "Parameter added"), "success");
  } catch (e) {
    console.error(e);
  }
}

async function deleteAdminSpecParameter(parameterId) {
  if (
    !(await adminConfirmDelete(
      catT("Удалить параметр?", "Delete this parameter?")
    ))
  ) {
    return;
  }
  try {
    const res = await apiFetch(
      "/products/spec-parameters/" + encodeURIComponent(String(parameterId)),
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-spec-params-status",
        (data && data.detail) || catT("Ошибка", "Error"),
        "error"
      );
      return;
    }
    await loadSpecParametersForAdmin();
    renderAdminSpecParametersTable();
  } catch (e) {
    console.error(e);
  }
}

async function deleteAdminCompany(c) {
  const id = c.id;
  if (
    !(await adminConfirmDelete(
      catT(
        'Удалить организацию "' + (c.name || id) + '" (id ' + id + ")?",
        'Delete company "' + (c.name || id) + '" (id ' + id + ")?"
      ),
      [
        catT(
          "Пользователи с этой организацией могут потерять доступ или данные — проверьте политику API.",
          "Users in this company may lose access or data — check API policy."
        ),
      ]
    ))
  ) {
    return;
  }
  try {
    const res = await apiFetch("/companies/" + id, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-companies-status",
        (data && data.detail) || catT("Ошибка удаления", "Delete failed"),
        "error"
      );
      return;
    }
    if (
      elements.adminCompanyEditId &&
      String(elements.adminCompanyEditId.value) === String(id)
    ) {
      hideAdminCompanyEdit();
    }
    await loadAdminCompanies();
    await refreshCompaniesListForSelect();
    await loadAdminUsers();
    setCatalogStatus("admin-companies-status", "", "info");
    showToast(catT("Организация удалена", "Company deleted"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-companies-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function saveAdminCompany() {
  const id = Number(elements.adminCompanyEditId && elements.adminCompanyEditId.value);
  const name = (elements.adminCompanyEditName.value || "").trim();
  const domain = (elements.adminCompanyEditDomain.value || "").trim();
  if (!id || id <= 0) {
    setCatalogStatus(
      "admin-companies-status",
      catT("Не выбрана организация.", "No company selected."),
      "error"
    );
    return;
  }
  if (!name || !domain) {
    setCatalogStatus(
      "admin-companies-status",
      catT("Укажите название и домен.", "Enter company name and domain."),
      "error"
    );
    return;
  }
  try {
    const res = await apiFetch("/companies/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-companies-status",
        (data && data.detail) || catT("Ошибка сохранения", "Save failed"),
        "error"
      );
      return;
    }
    hideAdminCompanyEdit();
    await loadAdminCompanies();
    await refreshCompaniesListForSelect();
    await loadAdminUsers();
    setCatalogStatus("admin-companies-status", "", "info");
    showToast(catT("Организация обновлена", "Company updated"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-companies-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function addAdminCompany() {
  const name = (elements.adminCompanyName.value || "").trim();
  const domain = (elements.adminCompanyDomain.value || "").trim();
  if (!name || !domain) {
    setCatalogStatus(
      "admin-companies-status",
      catT("Укажите название и домен.", "Enter company name and domain."),
      "error"
    );
    return;
  }
  try {
    const res = await apiFetch("/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-companies-status",
        (data && data.detail) || catT("Ошибка", "Error"),
        "error"
      );
      return;
    }
    elements.adminCompanyName.value = "";
    elements.adminCompanyDomain.value = "";
    await loadAdminCompanies();
    await refreshCompaniesListForSelect();
    await loadAdminUsers();
    setCatalogStatus("admin-companies-status", "", "info");
    showToast(catT("Организация добавлена", "Company added"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-companies-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

function getProductCatalogMeta(p) {
  if (!p || p.rules_json == null || p.rules_json === "") return {};
  try {
    const rules =
      typeof p.rules_json === "string" ? JSON.parse(p.rules_json) : p.rules_json;
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) return {};
    return rules.catalog && typeof rules.catalog === "object" ? rules.catalog : {};
  } catch {
    return {};
  }
}

function getProductSectionTitle(p) {
  const meta = getProductCatalogMeta(p);
  if (meta.section_title && String(meta.section_title).trim()) {
    return String(meta.section_title).trim();
  }
  const legacy = p.technical_specs && String(p.technical_specs).trim();
  if (!legacy || legacy === "—") return "—";
  const dot = legacy.indexOf(". ");
  if (dot >= 0 && dot < legacy.length - 2) {
    return legacy.slice(dot + 2).trim();
  }
  return "—";
}

function formatProductExtraParams(p) {
  const parts = [];
  const specs = Array.isArray(p.technical_spec_values)
    ? p.technical_spec_values
    : [];
  specs.forEach((x) => {
    if (!x) return;
    const code = String(x.parameter_code || "").toLowerCase();
    if (code === "equipment_type") return;
    const label = x.parameter_name || x.parameter_code || "param";
    parts.push(label + ": " + (x.value || "—"));
  });
  if (p.built_in_license_units != null && p.built_in_license_units !== "") {
    parts.push(
      catT("Встроенные AP", "Built-in AP") + ": " + String(p.built_in_license_units)
    );
  }
  if (p.max_module_slots != null && p.max_module_slots !== "") {
    parts.push(catT("Слоты модулей", "Module slots") + ": " + String(p.max_module_slots));
  }
  if (Number(p.addon_options_count) > 0) {
    parts.push(catT("Опции", "Add-ons") + ": " + String(p.addon_options_count));
  }
  return parts.length ? parts.join("; ") : "—";
}

function renderAdminProductsTable() {
  const tb = elements.adminProductsTbody;
  if (!tb) return;
  tb.innerHTML = "";
  if (!products.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.textContent = catT(
      "Каталог пуст или ничего не найдено по фильтрам.",
      "Catalog is empty or no matches for current filters."
    );
    tr.appendChild(td);
    tb.appendChild(tr);
    return;
  }
  products.forEach((p) => {
    const tr = document.createElement("tr");
    const descText =
      p.description && String(p.description).trim()
        ? String(p.description).trim()
        : "—";
    const sectionText = getProductSectionTitle(p);
    const legacySpecs =
      p.technical_specs && String(p.technical_specs).trim()
        ? String(p.technical_specs).trim()
        : "—";
    const extraParamsText = formatProductExtraParams(p);

    function addCell(text, opts) {
      const td = document.createElement("td");
      if (opts && opts.className) td.className = opts.className;
      if (opts && opts.title) td.title = opts.title;
      td.textContent = text;
      tr.appendChild(td);
    }

    addCell(String(p.id));
    addCell(p.name || "—", { className: "cell-wrap" });
    addCell(
      p.product_category && String(p.product_category).trim()
        ? String(p.product_category).trim()
        : "—"
    );
    const groupLabel = catalogProductGroupPath(p);
    addCell(groupLabel, { className: "cell-wrap cell-muted" });
    addCell(p.product_kind || "equipment");
    addCell(truncateCellText(descText, 100), {
      className: "cell-wrap cell-muted",
      title: descText !== "—" ? descText : "",
    });
    addCell(truncateCellText(sectionText, 80), {
      className: "cell-wrap cell-muted",
      title: sectionText !== "—" ? sectionText : "",
    });
    addCell(truncateCellText(legacySpecs, 100), {
      className: "cell-wrap cell-muted",
      title: legacySpecs !== "—" ? legacySpecs : "",
    });
    addCell(truncateCellText(extraParamsText, 120), {
      className: "cell-wrap cell-muted",
      title: extraParamsText !== "—" ? extraParamsText : "",
    });

    const tdAct = document.createElement("td");
    tdAct.style.whiteSpace = "nowrap";
    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "ghost-btn";
    btnEdit.textContent = uiLang === "en" ? "Edit" : "Изменить";
    btnEdit.addEventListener("click", () => {
      adminEditingProductId = p.id;
      syncAdminProductDrawer();
    });
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ghost-btn danger";
    btn.textContent = uiLang === "en" ? "Delete" : "Удалить";
    btn.addEventListener("click", () => deleteAdminProduct(p));
    tdAct.appendChild(btnEdit);
    tdAct.appendChild(document.createTextNode(" "));
    tdAct.appendChild(btn);
    tr.appendChild(tdAct);
    tb.appendChild(tr);
  });
}

/**
 * Admin-only catalog rows (all modules, no speed filter). Reloads after edits.
 * @param {number} productId
 * @param {HTMLElement} host
 */
async function loadProductCatalogEditorUi(productId, host) {
  const isEn = uiLang === "en";
  host.innerHTML = "";
  const loading = document.createElement("div");
  loading.className = "status-text info";
  loading.textContent = isEn
    ? "Loading catalog options..."
    : "Загрузка опций каталога…";
  host.appendChild(loading);

  function parseOptInt(v) {
    const s = String(v ?? "").trim();
    if (s === "") return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  }

  function syncModuleUserLabelSpan(span, inName, inSp, inFf) {
    const nm =
      inName.value.trim() ||
      (isEn ? "(no name)" : "(без названия)");
    span.textContent = formatModuleUserLabel({
      name: nm,
      speed_gbps: parseOptInt(inSp.value),
      form_factor: inFf.value.trim() === "" ? null : inFf.value.trim(),
    });
  }

  function syncLicenseUserLabelSpan(span, inName, inU) {
    const nm =
      inName.value.trim() ||
      (isEn ? "(no name)" : "(без названия)");
    const u = parseInt(inU.value, 10);
    const pack = Number.isFinite(u) && u >= 1 ? u : 1;
    span.textContent = formatLicenseUserLabel({
      name: nm,
      units_per_pack: pack,
    });
  }

  let data;
  try {
    const res = await apiFetch(
      "/products/" + productId + "/catalog-editor"
    );
    data = await res.json().catch(() => null);
    if (!res.ok) {
      host.innerHTML = "";
      const errEl = document.createElement("div");
      errEl.className = "status-text error";
      errEl.textContent =
        (data && data.detail) ||
          catT("Не удалось загрузить каталог.", "Could not load catalog options.");
      host.appendChild(errEl);
      return;
    }
  } catch (e) {
    console.error(e);
    host.innerHTML = "";
    const errEl = document.createElement("div");
    errEl.className = "status-text error";
    errEl.textContent = catT("Сеть.", "Network error.");
    host.appendChild(errEl);
    return;
  }

  async function afterCatalogMutation() {
    await loadProducts();
    await loadProductCatalogEditorUi(productId, host);
  }

  host.innerHTML = "";
  host.classList.remove("admin-catalog-editor--dirty");
  let unsavedToastShown = false;

  function markCatalogEditorDirty(dirtyInput) {
    host.classList.add("admin-catalog-editor--dirty");
    if (dirtyInput) dirtyInput.classList.add("admin-catalog-field-dirty");
    if (unsavedToastShown) return;
    unsavedToastShown = true;
    showToast(
      isEn
        ? "Changes in module/license rows are not auto-saved: click Save in the row."
        : "Правки в строках модулей и лицензий не сохраняются сами: нажмите «Сохранить» в строке (поля продукта выше — отдельная кнопка «Сохранить»).",
      "warning"
    );
  }

  function markCatalogRowDirty(tr, dirtyInput) {
    markCatalogEditorDirty(dirtyInput);
    if (tr) {
      const saveBtn = tr.querySelector("button.admin-catalog-row-save");
      if (saveBtn) saveBtn.classList.add("admin-catalog-save-pending");
    }
  }

  const titleM = document.createElement("h4");
  titleM.className =
    "admin-form-block-title admin-form-block-title--compact";
  titleM.textContent = isEn ? "Modules (transceivers etc.)" : "Модули (трансиверы и др.)";
  host.appendChild(titleM);

  const tblM = document.createElement("table");
  tblM.className = "admin-table";
  tblM.innerHTML =
    isEn
      ? "<thead><tr><th>ID</th><th>User label</th><th>Name (catalog)</th><th>Speed Gbps</th><th>Form factor</th><th></th></tr></thead>"
      : "<thead><tr><th>ID</th><th>Как у пользователя</th><th>Название (каталог)</th><th>Скорость Гбит/с</th><th>Form factor</th><th></th></tr></thead>";
  const tbM = document.createElement("tbody");
  tblM.appendChild(tbM);
  (data.modules || []).forEach((mod) => {
    const tr = document.createElement("tr");
    const tdId = document.createElement("td");
    tdId.textContent = String(mod.id);
    const tdUser = document.createElement("td");
    const spanUser = document.createElement("div");
    spanUser.className = "admin-addon-user-label";
    tdUser.appendChild(spanUser);
    const tdName = document.createElement("td");
    const inName = document.createElement("input");
    inName.type = "text";
    inName.value = mod.name || "";
    tdName.appendChild(inName);
    const tdSp = document.createElement("td");
    const inSp = document.createElement("input");
    inSp.type = "number";
    inSp.min = "0";
    inSp.step = "1";
    inSp.placeholder = isEn ? "optional" : "необяз.";
    if (mod.speed_gbps != null) inSp.value = String(mod.speed_gbps);
    tdSp.appendChild(inSp);
    const tdFf = document.createElement("td");
    const inFf = document.createElement("input");
    inFf.type = "text";
    inFf.placeholder = isEn ? "e.g. SFP" : "напр. SFP";
    inFf.value = mod.form_factor || "";
    tdFf.appendChild(inFf);
    const syncM = () =>
      syncModuleUserLabelSpan(spanUser, inName, inSp, inFf);
    function onModFieldInput(ev) {
      syncM();
      markCatalogRowDirty(tr, ev.target);
    }
    inName.addEventListener("input", onModFieldInput);
    inSp.addEventListener("input", onModFieldInput);
    inFf.addEventListener("input", onModFieldInput);
    syncM();
    const tdAct = document.createElement("td");
    tdAct.style.whiteSpace = "nowrap";
    const btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "ghost-btn admin-catalog-row-save";
    btnSave.textContent = uiLang === "en" ? "Save" : "Сохранить";
    btnSave.addEventListener("click", async () => {
      const nm = inName.value.trim();
      if (!nm) {
        setCatalogStatus(
          "admin-products-status",
          "У модуля нужно название.",
          "error"
        );
        return;
      }
      const body = {
        name: nm,
        speed_gbps: parseOptInt(inSp.value),
        form_factor:
          inFf.value.trim() === "" ? null : inFf.value.trim(),
        max_quantity: null,
      };
      try {
        const res = await apiFetch("/products/modules/" + mod.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok) {
          setCatalogStatus(
            "admin-products-status",
            (j && j.detail) || catT("Ошибка модуля", "Module error"),
            "error"
          );
          return;
        }
        setCatalogStatus("admin-products-status", "", "info");
        showToast(catT("Модуль сохранён", "Module saved"), "success");
        await afterCatalogMutation();
      } catch (e) {
        console.error(e);
        setCatalogStatus(
          "admin-products-status",
          catT("Сеть.", "Network error."),
          "error"
        );
      }
    });
    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "ghost-btn danger";
    btnDel.textContent = uiLang === "en" ? "Delete" : "Удалить";
    btnDel.addEventListener("click", async () => {
      if (
        !(await adminConfirmDelete(
          "Удалить модуль \"" + (mod.name || mod.id) + "\" (id " + mod.id + ")?",
          ["Строки конфигураций с этим модулем будут очищены."]
        ))
      ) {
        return;
      }
      try {
        const res = await apiFetch("/products/modules/" + mod.id, {
          method: "DELETE",
        });
        const j = await res.json().catch(() => null);
        if (!res.ok) {
          setCatalogStatus(
            "admin-products-status",
            (j && j.detail) || "Ошибка",
            "error"
          );
          return;
        }
        setCatalogStatus("admin-products-status", "", "info");
        showToast(catT("Модуль удалён", "Module deleted"), "success");
        await afterCatalogMutation();
      } catch (e) {
        console.error(e);
        setCatalogStatus(
          "admin-products-status",
          catT("Сеть.", "Network error."),
          "error"
        );
      }
    });
    tdAct.appendChild(btnSave);
    tdAct.appendChild(document.createTextNode(" "));
    tdAct.appendChild(btnDel);
    tr.appendChild(tdId);
    tr.appendChild(tdUser);
    tr.appendChild(tdName);
    tr.appendChild(tdSp);
    tr.appendChild(tdFf);
    tr.appendChild(tdAct);
    tbM.appendChild(tr);
  });
  host.appendChild(tblM);

  const addRowM = document.createElement("div");
  addRowM.className = "admin-inline";
  addRowM.style.flexWrap = "wrap";
  addRowM.style.gap = "8px";
  addRowM.style.alignItems = "flex-end";
  function mkIn(ph, type) {
    const w = document.createElement("div");
    w.className = "field-group";
    w.style.flex = "1";
    w.style.minWidth = "120px";
    const lab = document.createElement("div");
    lab.className = "field-label";
    lab.textContent = ph;
    const inp = document.createElement("input");
    inp.type = type;
    if (type === "number") {
      inp.min = "0";
      inp.step = "1";
    }
    w.appendChild(lab);
    w.appendChild(inp);
    return { wrap: w, inp: inp };
  }
  const aName = mkIn(isEn ? "New module - name" : "Новый модуль — название", "text");
  const aSp = mkIn(isEn ? "Speed Gbps" : "Скорость Гбит/с", "number");
  const aFf = mkIn("Form factor", "text");
  addRowM.appendChild(aName.wrap);
  addRowM.appendChild(aSp.wrap);
  addRowM.appendChild(aFf.wrap);
  const addModPreviewWrap = document.createElement("div");
  addModPreviewWrap.className = "field-group";
  addModPreviewWrap.style.flex = "1 1 200px";
  addModPreviewWrap.style.minWidth = "180px";
  addModPreviewWrap.style.marginBottom = "0";
  const addModPreviewLab = document.createElement("div");
  addModPreviewLab.className = "field-label";
  addModPreviewLab.textContent = isEn ? "User preview" : "Превью у пользователя";
  const addModPreviewVal = document.createElement("div");
  addModPreviewVal.className = "admin-addon-user-label";
  addModPreviewVal.style.marginTop = "4px";
  function syncAddModPreview() {
    syncModuleUserLabelSpan(addModPreviewVal, aName.inp, aSp.inp, aFf.inp);
    if (
      (aName.inp.value || "").trim() ||
      (aSp.inp.value || "").trim() ||
      (aFf.inp.value || "").trim()
    ) {
      markCatalogEditorDirty();
    }
  }
  aName.inp.addEventListener("input", syncAddModPreview);
  aSp.inp.addEventListener("input", syncAddModPreview);
  aFf.inp.addEventListener("input", syncAddModPreview);
  syncAddModPreview();
  addModPreviewWrap.appendChild(addModPreviewLab);
  addModPreviewWrap.appendChild(addModPreviewVal);
  const btnAddM = document.createElement("button");
  btnAddM.type = "button";
  btnAddM.className = "secondary-btn";
  btnAddM.textContent = isEn ? "Add module" : "Добавить модуль";
  btnAddM.addEventListener("click", async () => {
    const nm = aName.inp.value.trim();
    if (!nm) {
      setCatalogStatus(
        "admin-products-status",
        "Укажите название нового модуля.",
        "error"
      );
      return;
    }
    const body = {
      name: nm,
      speed_gbps: parseOptInt(aSp.inp.value),
      form_factor:
        aFf.inp.value.trim() === "" ? null : aFf.inp.value.trim(),
      max_quantity: null,
    };
    try {
      const res = await apiFetch(
        "/products/" + productId + "/modules",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setCatalogStatus(
          "admin-products-status",
          (j && j.detail) || "Ошибка",
          "error"
        );
        return;
      }
      aName.inp.value = "";
      aSp.inp.value = "";
      aFf.inp.value = "";
      setCatalogStatus("admin-products-status", "", "info");
      showToast(catT("Модуль добавлен", "Module added"), "success");
      await afterCatalogMutation();
    } catch (e) {
      console.error(e);
      setCatalogStatus(
        "admin-products-status",
        catT("Сеть.", "Network error."),
        "error"
      );
    }
  });
  const addModActionsRow = document.createElement("div");
  addModActionsRow.className = "admin-catalog-add-preview-actions";
  addModActionsRow.appendChild(addModPreviewWrap);
  addModActionsRow.appendChild(btnAddM);
  host.appendChild(addRowM);
  host.appendChild(addModActionsRow);

  const titleL = document.createElement("h4");
  titleL.className =
    "admin-form-block-title admin-form-block-title--compact";
  titleL.style.marginTop = "10px";
  titleL.textContent = isEn ? "License packs" : "Пакеты лицензий";
  host.appendChild(titleL);
  const hintL = document.createElement("p");
  hintL.className = "field-description";
  hintL.textContent = isEn
    ? "Pack size (units_per_pack): how many AP (or other units) one order row adds."
    : "Размер пакета (units_per_pack) — сколько AP (или других единиц) даёт одна строка заказа.";
  host.appendChild(hintL);

  const tblL = document.createElement("table");
  tblL.className = "admin-table";
  tblL.innerHTML =
    isEn
      ? "<thead><tr><th>ID</th><th>User label</th><th>Name (catalog)</th><th>Units per pack</th><th></th></tr></thead>"
      : "<thead><tr><th>ID</th><th>Как у пользователя</th><th>Название (каталог)</th><th>Единиц в пакете</th><th></th></tr></thead>";
  const tbL = document.createElement("tbody");
  tblL.appendChild(tbL);
  (data.licenses || []).forEach((lic) => {
    const tr = document.createElement("tr");
    const tdId = document.createElement("td");
    tdId.textContent = String(lic.id);
    const tdUser = document.createElement("td");
    const spanLUser = document.createElement("div");
    spanLUser.className = "admin-addon-user-label";
    tdUser.appendChild(spanLUser);
    const tdName = document.createElement("td");
    const inName = document.createElement("input");
    inName.type = "text";
    inName.value = lic.name || "";
    tdName.appendChild(inName);
    const tdU = document.createElement("td");
    const inU = document.createElement("input");
    inU.type = "number";
    inU.min = "1";
    inU.step = "1";
    inU.value = String(lic.units_per_pack ?? 1);
    tdU.appendChild(inU);
    const syncL = () =>
      syncLicenseUserLabelSpan(spanLUser, inName, inU);
    function onLicFieldInput(ev) {
      syncL();
      markCatalogRowDirty(tr, ev.target);
    }
    inName.addEventListener("input", onLicFieldInput);
    inU.addEventListener("input", onLicFieldInput);
    syncL();
    const tdAct = document.createElement("td");
    tdAct.style.whiteSpace = "nowrap";
    const btnSave = document.createElement("button");
    btnSave.type = "button";
    btnSave.className = "ghost-btn admin-catalog-row-save";
    btnSave.textContent = uiLang === "en" ? "Save" : "Сохранить";
    btnSave.addEventListener("click", async () => {
      const nm = inName.value.trim();
      if (!nm) {
        setCatalogStatus(
          "admin-products-status",
          "У лицензии нужно название.",
          "error"
        );
        return;
      }
      const u = parseInt(inU.value, 10);
      if (!Number.isFinite(u) || u < 1) {
        setCatalogStatus(
          "admin-products-status",
          "Единиц в пакете: целое ≥ 1.",
          "error"
        );
        return;
      }
      try {
        const res = await apiFetch("/products/licenses/" + lic.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nm, units_per_pack: u }),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok) {
          setCatalogStatus(
            "admin-products-status",
            (j && j.detail) || catT("Ошибка лицензии", "License error"),
            "error"
          );
          return;
        }
        setCatalogStatus("admin-products-status", "", "info");
        showToast(catT("Пакет лицензий сохранён", "License pack saved"), "success");
        await afterCatalogMutation();
      } catch (e) {
        console.error(e);
        setCatalogStatus(
          "admin-products-status",
          catT("Сеть.", "Network error."),
          "error"
        );
      }
    });
    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "ghost-btn danger";
    btnDel.textContent = uiLang === "en" ? "Delete" : "Удалить";
    btnDel.addEventListener("click", async () => {
      if (
        !(await adminConfirmDelete(
          "Удалить пакет лицензий \"" +
            (lic.name || lic.id) +
            "\" (id " +
            lic.id +
            ")?",
          ["Строки конфигураций с этим пакетом будут очищены."]
        ))
      ) {
        return;
      }
      try {
        const res = await apiFetch("/products/licenses/" + lic.id, {
          method: "DELETE",
        });
        const j = await res.json().catch(() => null);
        if (!res.ok) {
          setCatalogStatus(
            "admin-products-status",
            (j && j.detail) || "Ошибка",
            "error"
          );
          return;
        }
        setCatalogStatus("admin-products-status", "", "info");
        showToast(catT("Пакет лицензий удалён", "License pack deleted"), "success");
        await afterCatalogMutation();
      } catch (e) {
        console.error(e);
        setCatalogStatus(
          "admin-products-status",
          catT("Сеть.", "Network error."),
          "error"
        );
      }
    });
    tdAct.appendChild(btnSave);
    tdAct.appendChild(document.createTextNode(" "));
    tdAct.appendChild(btnDel);
    tr.appendChild(tdId);
    tr.appendChild(tdUser);
    tr.appendChild(tdName);
    tr.appendChild(tdU);
    tr.appendChild(tdAct);
    tbL.appendChild(tr);
  });
  host.appendChild(tblL);

  const addRowL = document.createElement("div");
  addRowL.className = "admin-inline";
  addRowL.style.flexWrap = "wrap";
  addRowL.style.gap = "8px";
  addRowL.style.alignItems = "flex-end";
  const lName = mkIn(isEn ? "New pack - name" : "Новый пакет — название", "text");
  const lU = mkIn(isEn ? "Units per pack" : "Единиц в пакете", "number");
  lU.inp.value = "16";
  addRowL.appendChild(lName.wrap);
  addRowL.appendChild(lU.wrap);
  const addLicPreviewWrap = document.createElement("div");
  addLicPreviewWrap.className = "field-group";
  addLicPreviewWrap.style.flex = "1 1 200px";
  addLicPreviewWrap.style.minWidth = "180px";
  addLicPreviewWrap.style.marginBottom = "0";
  const addLicPreviewLab = document.createElement("div");
  addLicPreviewLab.className = "field-label";
  addLicPreviewLab.textContent = isEn ? "User preview" : "Превью у пользователя";
  const addLicPreviewVal = document.createElement("div");
  addLicPreviewVal.className = "admin-addon-user-label";
  addLicPreviewVal.style.marginTop = "4px";
  function syncAddLicPreview() {
    syncLicenseUserLabelSpan(addLicPreviewVal, lName.inp, lU.inp);
    if ((lName.inp.value || "").trim()) {
      markCatalogEditorDirty();
    }
  }
  lName.inp.addEventListener("input", syncAddLicPreview);
  lU.inp.addEventListener("input", syncAddLicPreview);
  syncAddLicPreview();
  addLicPreviewWrap.appendChild(addLicPreviewLab);
  addLicPreviewWrap.appendChild(addLicPreviewVal);
  const btnAddL = document.createElement("button");
  btnAddL.type = "button";
  btnAddL.className = "secondary-btn";
  btnAddL.textContent = isEn ? "Add pack" : "Добавить пакет";
  btnAddL.addEventListener("click", async () => {
    const nm = lName.inp.value.trim();
    if (!nm) {
      setCatalogStatus(
        "admin-products-status",
        catT("Укажите название пакета.", "Enter pack name."),
        "error"
      );
      return;
    }
    const u = parseInt(lU.inp.value, 10);
    if (!Number.isFinite(u) || u < 1) {
      setCatalogStatus(
        "admin-products-status",
        catT("Единиц в пакете: целое ≥ 1.", "Units per pack: integer >= 1."),
        "error"
      );
      return;
    }
    try {
      const res = await apiFetch(
        "/products/" + productId + "/licenses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nm, units_per_pack: u }),
        }
      );
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setCatalogStatus(
          "admin-products-status",
          (j && j.detail) || "Ошибка",
          "error"
        );
        return;
      }
      lName.inp.value = "";
      lU.inp.value = "16";
      setCatalogStatus("admin-products-status", "", "info");
      showToast(catT("Пакет лицензий добавлен", "License pack added"), "success");
      await afterCatalogMutation();
    } catch (e) {
      console.error(e);
      setCatalogStatus(
        "admin-products-status",
        catT("Сеть.", "Network error."),
        "error"
      );
    }
  });
  const addLicActionsRow = document.createElement("div");
  addLicActionsRow.className = "admin-catalog-add-preview-actions";
  addLicActionsRow.appendChild(addLicPreviewWrap);
  addLicActionsRow.appendChild(btnAddL);
  host.appendChild(addRowL);
  host.appendChild(addLicActionsRow);
}

function adminSplitProductRulesJson(raw) {
  const empty = {
    speedAllowed: null,
    modulesMax: null,
    licenseIncluded: null,
    rest: [],
    parseError: false,
  };
  if (raw == null || String(raw).trim() === "") return empty;
  let arr = [];
  try {
    const d = JSON.parse(String(raw));
    if (Array.isArray(d)) arr = d;
    else if (d && typeof d === "object") arr = [d];
    else return { ...empty, parseError: true };
  } catch {
    return { ...empty, parseError: true };
  }
  const rest = [];
  let speedAllowed = null;
  let modulesMax = null;
  let licenseIncluded = null;
  for (const r of arr) {
    if (!r || typeof r !== "object") {
      rest.push(r);
      continue;
    }
    if (
      r.type === "filter" &&
      r.field === "speed" &&
      Array.isArray(r.allowed) &&
      speedAllowed === null
    ) {
      const nums = r.allowed
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isFinite(n));
      if (nums.length) speedAllowed = nums;
      else rest.push(r);
      continue;
    }
    if (
      r.type === "limit" &&
      r.field === "modules" &&
      r.max !== undefined &&
      r.max !== null &&
      modulesMax === null
    ) {
      const m = parseInt(r.max, 10);
      if (Number.isFinite(m) && m >= 0) modulesMax = m;
      else rest.push(r);
      continue;
    }
    if (
      r.type === "license" &&
      r.included !== undefined &&
      r.included !== null &&
      licenseIncluded === null
    ) {
      const v = parseInt(r.included, 10);
      if (Number.isFinite(v) && v >= 0) licenseIncluded = v;
      else rest.push(r);
      continue;
    }
    rest.push(r);
  }
  return { speedAllowed, modulesMax, licenseIncluded, rest, parseError: false };
}

function adminHydrateRulesSplitFromProduct(p, split) {
  if (!p || !split) return split;
  if (
    split.speedAllowed == null &&
    p.module_speeds_json &&
    String(p.module_speeds_json).trim()
  ) {
    try {
      const arr = JSON.parse(String(p.module_speeds_json));
      if (Array.isArray(arr)) {
        const nums = arr
          .map((x) => parseInt(x, 10))
          .filter((n) => Number.isFinite(n));
        if (nums.length) split.speedAllowed = nums;
      }
    } catch (_) {}
  }
  if (split.modulesMax == null && p.max_module_slots != null) {
    split.modulesMax = p.max_module_slots;
  }
  if (split.licenseIncluded == null && p.built_in_license_units != null) {
    split.licenseIncluded = p.built_in_license_units;
  }
  return split;
}

function adminBuildRulesJsonFromWizard(
  chkSpeed,
  speedText,
  chkMod,
  modVal,
  chkLic,
  licVal,
  preservedRest
) {
  const out = [];
  if (chkSpeed) {
    const parts = String(speedText || "")
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n));
    if (!parts.length) {
      return {
        error: catT(
          "Отмечено ограничение скоростей: введите числа через запятую (например 1, 10).",
          "Speed filter enabled: enter numbers separated by commas (e.g. 1, 10)."
        ),
      };
    }
    out.push({ type: "filter", field: "speed", allowed: parts });
  }
  if (chkMod) {
    const m = parseInt(modVal, 10);
    if (!Number.isFinite(m) || m < 0) {
      return { error: catT("Макс. модулей в правилах: неотрицательное целое.", "Max modules in rules: non-negative integer.") };
    }
    out.push({ type: "limit", field: "modules", max: m });
  }
  if (chkLic) {
    const v = parseInt(licVal, 10);
    if (!Number.isFinite(v) || v < 0) {
      return { error: catT("Встроенные AP в правилах: неотрицательное целое.", "Built-in AP in rules: non-negative integer.") };
    }
    out.push({ type: "license", included: v });
  }
  for (const r of preservedRest) out.push(r);
  return { rules: out };
}

function buildAdminProductEditPanel(p, opts) {
  const createMode = !!(opts && opts.createMode);
  const isEn = uiLang === "en";
  const modeKey = createMode ? "new" : String(p.id);
  const wrap = document.createElement("div");
  wrap.className = "admin-product-edit-panel";
  const panelTitle = document.createElement("h4");
  panelTitle.className =
    "admin-form-block-title admin-form-block-title--compact";
  panelTitle.textContent = createMode
    ? isEn
      ? "Create product"
      : "Создание продукта"
    : isEn
      ? "Edit product"
      : "Редактирование продукта";
  wrap.appendChild(panelTitle);

  const grid = document.createElement("div");
  grid.className = "edit-grid";

  function addField(labelText, inputEl) {
    const cell = document.createElement("div");
    const lab = document.createElement("label");
    lab.textContent = labelText;
    cell.appendChild(lab);
    cell.appendChild(inputEl);
    grid.appendChild(cell);
  }

  function addFieldStack(labelText, inputEl, hintText) {
    const cell = document.createElement("div");
    const lab = document.createElement("label");
    lab.textContent = labelText;
    cell.appendChild(lab);
    cell.appendChild(inputEl);
    if (hintText) {
      const h = document.createElement("div");
      h.className = "field-description";
      h.style.marginTop = "4px";
      h.textContent = hintText;
      cell.appendChild(h);
    }
    grid.appendChild(cell);
  }

  function addFieldWide(labelText, inputEl) {
    const cell = document.createElement("div");
    cell.className = "edit-grid-cell-wide";
    const lab = document.createElement("label");
    lab.textContent = labelText;
    cell.appendChild(lab);
    cell.appendChild(inputEl);
    grid.appendChild(cell);
  }

  const inpName = document.createElement("input");
  inpName.type = "text";
  inpName.value = p.name || "";
  addField(isEn ? "Name" : "Название", inpName);

  const taDesc = document.createElement("textarea");
  taDesc.className = "admin-textarea-desc";
  taDesc.rows = 5;
  taDesc.value = p.description || "";
  addFieldWide(isEn ? "Description" : "Описание", taDesc);

  const specValuesBlock = document.createElement("div");
  specValuesBlock.className = "edit-grid-cell-wide";
  const specValuesLabel = document.createElement("label");
  specValuesLabel.textContent = isEn
    ? "Technical parameters"
    : "Технические параметры";
  specValuesBlock.appendChild(specValuesLabel);
  const specValuesRows = document.createElement("div");
  specValuesRows.className = "admin-spec-value-rows";
  specValuesBlock.appendChild(specValuesRows);
  const addSpecRowBtn = document.createElement("button");
  addSpecRowBtn.type = "button";
  addSpecRowBtn.className = "secondary-btn admin-spec-add-row-btn";
  addSpecRowBtn.textContent = isEn ? "Add parameter" : "Добавить параметр";
  specValuesBlock.appendChild(addSpecRowBtn);
  const fallbackLabel = document.createElement("label");
  fallbackLabel.style.marginTop = "10px";
  fallbackLabel.textContent = isEn
    ? "Extra search text (optional)"
    : "Дополнительный текст для поиска (необязательно)";
  specValuesBlock.appendChild(fallbackLabel);
  const fallbackSpecs = document.createElement("textarea");
  fallbackSpecs.className = "admin-textarea-specs";
  fallbackSpecs.rows = 3;
  fallbackSpecs.placeholder = isEn
    ? "Optional extra text included in catalog search"
    : "Необязательно: доп. текст, участвует в поиске по каталогу";
  fallbackSpecs.value = p.technical_specs || "";
  specValuesBlock.appendChild(fallbackSpecs);
  grid.appendChild(specValuesBlock);

  function specValueOptionsForParameter(parameterId) {
    if (parameterId == null || parameterId === "") return null;
    const pid = parseInt(parameterId, 10);
    if (!Number.isFinite(pid)) return null;
    const opts = adminSpecValueOptionsByParamId[pid];
    return opts && opts.length ? opts : null;
  }

  function mountSpecValueControl(container, parameterId, initialValue) {
    container.innerHTML = "";
    const opts = specValueOptionsForParameter(parameterId);
    let el;
    if (opts && opts.length) {
      el = document.createElement("select");
      el.className = "catalog-native-select";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = isEn ? "Select value" : "Выберите значение";
      el.appendChild(emptyOpt);
      for (const v of opts) {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
      }
      const current = initialValue != null ? String(initialValue).trim() : "";
      if (current && !opts.includes(current)) {
        const customOpt = document.createElement("option");
        customOpt.value = current;
        customOpt.textContent = current + (isEn ? " (current)" : " (текущее)");
        el.appendChild(customOpt);
      }
      el.value = current;
    } else {
      el = document.createElement("input");
      el.type = "text";
      el.placeholder = isEn ? "Value" : "Значение";
      el.value = initialValue != null ? String(initialValue) : "";
    }
    el.dataset.specValue = "1";
    container.appendChild(el);
    if (el.tagName === "SELECT") fitNativeSelectToContent(el);
    return el;
  }

  function collectSpecValuesFromEditor() {
    const rows = [];
    const used = new Set();
    const rowEls = specValuesRows.querySelectorAll("[data-spec-row='1']");
    for (const rowEl of rowEls) {
      const sel = rowEl.querySelector("select[data-spec-param='1']");
      const valEl = rowEl.querySelector("[data-spec-value='1']");
      if (!sel || !valEl) continue;
      const pid = parseInt(sel.value, 10);
      const value = (valEl.value || "").trim();
      if (!Number.isFinite(pid) || !value) continue;
      if (used.has(pid)) continue;
      used.add(pid);
      rows.push({ parameter_id: pid, value });
    }
    return rows;
  }

  function addSpecRow(initialParameterId, initialValue) {
    const row = document.createElement("div");
    row.dataset.specRow = "1";
    row.className = "admin-spec-value-row";
    const sel = document.createElement("select");
    sel.className = "catalog-native-select";
    sel.dataset.specParam = "1";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = isEn ? "Select parameter" : "Выберите параметр";
    sel.appendChild(emptyOpt);
    specParameters.forEach((sp) => {
      const opt = document.createElement("option");
      opt.value = String(sp.id);
      opt.textContent = formatSpecParameterOptionLabel(sp);
      sel.appendChild(opt);
    });
    if (initialParameterId != null) sel.value = String(initialParameterId);
    const valueCell = document.createElement("div");
    valueCell.className = "admin-spec-value-cell";
    mountSpecValueControl(valueCell, sel.value, initialValue);
    sel.addEventListener("change", () => {
      mountSpecValueControl(valueCell, sel.value, "");
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ghost-btn danger";
    delBtn.textContent = isEn ? "Delete" : "Удалить";
    delBtn.addEventListener("click", () => row.remove());
    row.appendChild(sel);
    row.appendChild(valueCell);
    row.appendChild(delBtn);
    specValuesRows.appendChild(row);
    fitNativeSelectToContent(sel);
  }

  const initialSpecValues = Array.isArray(p.technical_spec_values)
    ? p.technical_spec_values
    : [];
  if (initialSpecValues.length > 0) {
    initialSpecValues.forEach((x) =>
      addSpecRow(x.parameter_id, x.value != null ? String(x.value) : "")
    );
  } else {
    addSpecRow(null, "");
  }
  addSpecRowBtn.addEventListener("click", () => addSpecRow(null, ""));

  const selSubgroup = document.createElement("select");
  const emptySubOpt = document.createElement("option");
  emptySubOpt.value = "";
  emptySubOpt.textContent = isEn ? "Not assigned" : "Не назначена";
  selSubgroup.appendChild(emptySubOpt);
  catalogGroups.forEach((group) => {
    (group.subgroups || []).forEach((sub) => {
      const opt = document.createElement("option");
      opt.value = String(sub.id);
      opt.textContent =
        (group.name || group.code) + " / " + (sub.name || sub.code);
      selSubgroup.appendChild(opt);
    });
  });
  if (p.subgroup_id != null) {
    selSubgroup.value = String(p.subgroup_id);
  }
  const addGroupOpt = document.createElement("option");
  addGroupOpt.value = "__add_group__";
  addGroupOpt.textContent = isEn ? "+ Add group…" : "+ Добавить группу…";
  selSubgroup.appendChild(addGroupOpt);
  let prevSubgroupValue = selSubgroup.value;
  selSubgroup.addEventListener("change", () => {
    if (selSubgroup.value !== "__add_group__") {
      prevSubgroupValue = selSubgroup.value;
      return;
    }
    selSubgroup.value = prevSubgroupValue;
    void appConfirmDialog({
      message: isEn
        ? "Create a new catalog group or subgroup in Admin → Catalog groups. Unsaved changes in this product card will be lost."
        : "Новую группу или подгруппу создайте в Admin → «Группы каталога». Несохранённые изменения в этой карточке будут потеряны.",
      confirmLabel: isEn ? "Go to groups" : "Перейти",
      cancelLabel: isEn ? "Stay" : "Остаться",
    }).then((ok) => {
      if (ok) navigateToAdminCatalogGroups();
    });
  });
  addFieldStack(isEn ? "Catalog subgroup" : "Подгруппа каталога", selSubgroup);

  const inpCategory = document.createElement("input");
  inpCategory.type = "text";
  inpCategory.placeholder = "VA, VNC, VPS…";
  inpCategory.value = p.product_category || "";
  addFieldStack(
    isEn ? "Equipment type code (optional)" : "Код типа оборудования (необязательно)",
    inpCategory
  );

  const rulesSplit = adminHydrateRulesSplitFromProduct(
    p,
    adminSplitProductRulesJson(p.rules_json)
  );
  const preservedRulesRest = rulesSplit.rest.slice();

  for (const sv of p.technical_spec_values || []) {
    const pid = sv.parameter_id;
    const val = sv.value != null ? String(sv.value).trim() : "";
    if (!pid || !val) continue;
    if (!adminSpecValueOptionsByParamId[pid]) {
      adminSpecValueOptionsByParamId[pid] = [];
    }
    if (!adminSpecValueOptionsByParamId[pid].includes(val)) {
      adminSpecValueOptionsByParamId[pid].push(val);
    }
  }

  const rulesBlock = document.createElement("div");
  rulesBlock.className = "edit-grid-cell-wide";

  const rulesBlockTitle = document.createElement("div");
  rulesBlockTitle.className = "field-label";
  rulesBlockTitle.style.marginBottom = "4px";
  rulesBlockTitle.textContent = isEn
    ? "Configurator settings"
    : "Настройки конфигуратора";
  rulesBlock.appendChild(rulesBlockTitle);

  const modeRow = document.createElement("div");
  modeRow.className = "admin-rules-mode-row";
  const radSimple = document.createElement("input");
  radSimple.type = "radio";
  radSimple.name = "admin-rules-mode-" + modeKey;
  radSimple.id = "admin-rules-simple-" + modeKey;
  const radJson = document.createElement("input");
  radJson.type = "radio";
  radJson.name = "admin-rules-mode-" + modeKey;
  radJson.id = "admin-rules-json-" + modeKey;
  const labS = document.createElement("label");
  labS.setAttribute("for", radSimple.id);
  labS.appendChild(radSimple);
  labS.appendChild(
    document.createTextNode(isEn ? " Simple mode" : " Простая настройка")
  );
  const labJ = document.createElement("label");
  labJ.setAttribute("for", radJson.id);
  labJ.appendChild(radJson);
  labJ.appendChild(
    document.createTextNode(isEn ? " Edit JSON" : " Редактировать JSON")
  );
  modeRow.appendChild(labS);
  modeRow.appendChild(labJ);
  rulesBlock.appendChild(modeRow);

  const wiz = document.createElement("div");
  wiz.className = "admin-rules-wizard";

  function makeWizardRow(checkId, checkLabel, inputEl) {
    const row = document.createElement("div");
    row.className = "admin-rules-wizard-row";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.id = checkId;
    const labChk = document.createElement("label");
    labChk.setAttribute("for", checkId);
    labChk.style.marginBottom = "0";
    labChk.appendChild(chk);
    const desc = document.createElement("span");
    desc.className = "admin-rules-wizard-desc";
    desc.textContent = checkLabel;
    row.appendChild(labChk);
    row.appendChild(desc);
    row.appendChild(inputEl);
    return { row, chk };
  }

  const inpSpeedCsv = document.createElement("input");
  inpSpeedCsv.type = "text";
  inpSpeedCsv.placeholder = "1, 10";
  const speedRw = makeWizardRow(
    "admin-r-speed-" + modeKey,
    isEn ? "Limit module speeds (Gbps)" : "Ограничить скорости модулей (Гбит/с)",
    inpSpeedCsv
  );
  wiz.appendChild(speedRw.row);

  const inpModOv = document.createElement("input");
  inpModOv.type = "number";
  inpModOv.min = "0";
  inpModOv.step = "1";
  inpModOv.placeholder = "";
  const modRw = makeWizardRow(
    "admin-r-mod-" + modeKey,
    isEn ? "Set max modules" : "Задать максимум модулей",
    inpModOv
  );
  wiz.appendChild(modRw.row);

  const inpLicOv = document.createElement("input");
  inpLicOv.type = "number";
  inpLicOv.min = "0";
  inpLicOv.step = "1";
  inpLicOv.placeholder = "";
  const licRw = makeWizardRow(
    "admin-r-lic-" + modeKey,
    isEn ? "Set built-in AP" : "Задать встроенные AP",
    inpLicOv
  );
  wiz.appendChild(licRw.row);

  rulesBlock.appendChild(wiz);

  const jsonPanel = document.createElement("div");
  jsonPanel.className = "admin-rules-json-panel";
  const labJson = document.createElement("label");
  labJson.textContent = isEn ? "Rules array (JSON)" : "Массив правил (JSON)";
  labJson.style.display = "block";
  labJson.style.marginBottom = "4px";
  const taRules = document.createElement("textarea");
  taRules.className = "admin-textarea-rules";
  taRules.rows = 10;
  taRules.spellcheck = false;
  taRules.placeholder = '[{"type":"filter","field":"speed","allowed":[1,10]}]';
  jsonPanel.appendChild(labJson);
  jsonPanel.appendChild(taRules);
  rulesBlock.appendChild(jsonPanel);

  if (rulesSplit.speedAllowed && rulesSplit.speedAllowed.length) {
    speedRw.chk.checked = true;
    inpSpeedCsv.value = rulesSplit.speedAllowed.join(", ");
  }
  if (
    rulesSplit.modulesMax !== null &&
    rulesSplit.modulesMax !== undefined
  ) {
    modRw.chk.checked = true;
    inpModOv.value = String(rulesSplit.modulesMax);
  }
  if (
    rulesSplit.licenseIncluded !== null &&
    rulesSplit.licenseIncluded !== undefined
  ) {
    licRw.chk.checked = true;
    inpLicOv.value = String(rulesSplit.licenseIncluded);
  }

  taRules.value =
    p.rules_json != null && String(p.rules_json).trim() !== ""
      ? String(p.rules_json)
      : "";

  function prettyRulesForTa() {
    const built = adminBuildRulesJsonFromWizard(
      speedRw.chk.checked,
      inpSpeedCsv.value,
      modRw.chk.checked,
      inpModOv.value,
      licRw.chk.checked,
      inpLicOv.value,
      preservedRulesRest
    );
    if (built.error) return null;
    if (!built.rules.length) return "";
    return JSON.stringify(built.rules, null, 2);
  }

  function syncModeUi() {
    const jsonMode = radJson.checked;
    wiz.style.display = jsonMode ? "none" : "block";
    jsonPanel.style.display = jsonMode ? "block" : "none";
    if (jsonMode && !rulesSplit.parseError) {
      const pr = prettyRulesForTa();
      if (pr !== null) {
        taRules.value = pr === "" ? "[]" : pr;
      }
    }
  }

  const useJsonMode =
    rulesSplit.rest.length > 0 || rulesSplit.parseError;
  if (useJsonMode) {
    radJson.checked = true;
    radSimple.checked = false;
  } else {
    radSimple.checked = true;
    radJson.checked = false;
  }
  syncModeUi();

  radSimple.addEventListener("change", () => {
    if (radSimple.checked) syncModeUi();
  });
  radJson.addEventListener("change", () => {
    if (radJson.checked) syncModeUi();
  });

  grid.appendChild(rulesBlock);

  wrap.appendChild(grid);

  if (!createMode) {
    const catalogHost = document.createElement("div");
    catalogHost.className = "admin-product-catalog-editor";
    wrap.appendChild(catalogHost);
    void loadProductCatalogEditorUi(p.id, catalogHost);
  } else {
    const createHint = document.createElement("div");
    createHint.className = "field-description";
    createHint.textContent =
      isEn
        ? "Click 'Create and add components' - this product opens right away, then you can add modules and license packs."
        : "Нажмите «Создать и добавить компоненты» — после этого откроется этот же продукт, и можно будет сразу добавить модули и пакеты лицензий.";
    wrap.appendChild(createHint);
  }

  const actions = document.createElement("div");
  actions.className = "admin-product-edit-actions";
  const btnSave = document.createElement("button");
  btnSave.type = "button";
  btnSave.className = "primary-btn";
  const saveDefaultLabel = createMode
    ? isEn
      ? "Create and add components"
      : "Создать и добавить компоненты"
    : isEn
      ? "Save"
      : "Сохранить";
  const saveBusyLabel = createMode
    ? isEn
      ? "Creating..."
      : "Создание..."
    : isEn
      ? "Saving..."
      : "Сохранение...";
  btnSave.textContent = saveDefaultLabel;
  let isSavingProduct = false;
  function syncSaveEnabled() {
    btnSave.disabled = isSavingProduct || inpName.value.trim() === "";
  }
  inpName.addEventListener("input", syncSaveEnabled);
  syncSaveEnabled();
  btnSave.addEventListener("click", async () => {
    if (isSavingProduct) return;
    isSavingProduct = true;
    btnSave.textContent = saveBusyLabel;
    syncSaveEnabled();
    const body = {
      name: inpName.value.trim(),
      description: taDesc.value.trim(),
      technical_specs: (fallbackSpecs.value || "").trim() || "—",
      technical_spec_values: collectSpecValuesFromEditor(),
      product_kind: "equipment",
      product_category:
        inpCategory.value.trim() === ""
          ? null
          : inpCategory.value.trim(),
    };
    const subVal = selSubgroup.value.trim();
    body.subgroup_id = subVal === "" ? null : parseInt(subVal, 10);
    body.built_in_license_units = null;
    body.module_speeds_json = null;
    body.max_module_slots = null;
    if (radJson.checked) {
      const rulesRaw = (taRules.value || "").trim();
      if (rulesRaw === "") {
        body.rules_json = null;
      } else {
        try {
          const j = JSON.parse(rulesRaw);
          const arr = Array.isArray(j) ? j : [j];
          body.rules_json = arr.length ? JSON.stringify(arr) : null;
        } catch (e) {
          setCatalogStatus(
            "admin-products-status",
            catT(
              "Правила (JSON): невалидный JSON.",
              "Rules (JSON): invalid JSON."
            ),
            "error"
          );
          isSavingProduct = false;
          btnSave.textContent = saveDefaultLabel;
          syncSaveEnabled();
          return;
        }
      }
    } else {
      const built = adminBuildRulesJsonFromWizard(
        speedRw.chk.checked,
        inpSpeedCsv.value,
        modRw.chk.checked,
        inpModOv.value,
        licRw.chk.checked,
        inpLicOv.value,
        preservedRulesRest
      );
      if (built.error) {
        setCatalogStatus(
          "admin-products-status",
          built.error,
          "error"
        );
        return;
      }
      body.rules_json =
        built.rules.length > 0 ? JSON.stringify(built.rules) : null;
    }
    try {
      if (createMode) await createAdminProductFromDrawer(body);
      else await patchAdminProduct(p.id, body);
    } finally {
      isSavingProduct = false;
      btnSave.textContent = saveDefaultLabel;
      syncSaveEnabled();
    }
  });
  const btnCancel = document.createElement("button");
  btnCancel.type = "button";
  btnCancel.className = "ghost-btn";
  btnCancel.textContent = isEn ? "Cancel" : "Отмена";
  btnCancel.addEventListener("click", () => {
    adminEditingProductId = null;
    closeAdminProductDrawer();
  });
  actions.appendChild(btnCancel);
  actions.appendChild(btnSave);
  wrap.appendChild(actions);
  return wrap;
}

async function patchAdminProduct(id, body) {
  try {
    const res = await apiFetch("/products/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-products-status",
        (data && data.detail) || catT("Ошибка сохранения", "Save failed"),
        "error"
      );
      return;
    }
    adminEditingProductId = null;
    closeAdminProductDrawer();
    await loadProducts();
    setCatalogStatus("admin-products-status", "", "info");
    showToast(catT("Продукт сохранён", "Product saved"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-products-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function createAdminProductFromDrawer(body) {
  try {
    const res = await apiFetch("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-products-status",
        (data && data.detail) || catT("Ошибка создания", "Create failed"),
        "error"
      );
      return;
    }
    adminCreatingProduct = false;
    adminEditingProductId = data && data.id != null ? Number(data.id) : null;
    await loadProducts();
    setCatalogStatus("admin-products-status", "", "info");
    showToast(catT("Продукт добавлен", "Product added"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-products-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function deleteAdminProduct(p) {
  const id = p.id;
  if (
    !(await adminConfirmDelete(
      "Удалить продукт \"" + (p.name || id) + "\" (id " + id + ")?",
      [
        "Удалятся все модули и пакеты лицензий этого продукта.",
        "Строки конфигураций, которые на них ссылаются, будут очищены.",
      ]
    ))
  ) {
    return;
  }
  try {
    const res = await apiFetch("/products/" + id, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-products-status",
        (data && data.detail) || catT("Ошибка", "Error"),
        "error"
      );
      return;
    }
    await loadProducts();
    setCatalogStatus("admin-products-status", "", "info");
    showToast(catT("Продукт удалён", "Product deleted"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-products-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}

async function addAdminProduct() {
  const name = (elements.adminProductName.value || "").trim();
  const description = (elements.adminProductDesc.value || "").trim();
  const technical_specs = (
    elements.adminProductSpecs && elements.adminProductSpecs.value
      ? elements.adminProductSpecs.value
      : ""
  ).trim();
  if (!name) {
    setCatalogStatus(
      "admin-products-status",
      catT("Укажите название.", "Enter product name."),
      "error"
    );
    return;
  }

  let built_in_license_units = null;
  const biRaw = (elements.adminProductBuiltIn && elements.adminProductBuiltIn.value || "").trim();
  if (biRaw !== "") {
    const n = parseInt(biRaw, 10);
    if (!Number.isFinite(n) || n < 0) {
      setCatalogStatus(
        "admin-products-status",
        catT(
          "Встроенные AP: неотрицательное целое или пусто.",
          "Built-in AP: enter a non-negative integer or leave empty."
        ),
        "error"
      );
      return;
    }
    built_in_license_units = n;
  }

  let max_module_slots = null;
  const slotsRaw = (elements.adminProductMaxSlots && elements.adminProductMaxSlots.value || "").trim();
  if (slotsRaw !== "") {
    const m = parseInt(slotsRaw, 10);
    if (!Number.isFinite(m) || m < 0) {
      setCatalogStatus(
        "admin-products-status",
        catT(
          "Макс. модулей: неотрицательное целое или пусто.",
          "Max modules: enter a non-negative integer or leave empty."
        ),
        "error"
      );
      return;
    }
    max_module_slots = m;
  }

  const speedsRaw = (elements.adminProductSpeedsJson && elements.adminProductSpeedsJson.value || "").trim();
  const module_speeds_json = speedsRaw === "" ? null : speedsRaw;

  const catRaw = (
    elements.adminProductCategory && elements.adminProductCategory.value
      ? elements.adminProductCategory.value
      : ""
  ).trim();
  const product_category = catRaw === "" ? null : catRaw;

  try {
    const res = await apiFetch("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        technical_specs: technical_specs || "—",
        product_kind: "equipment",
        product_category,
        built_in_license_units,
        max_module_slots,
        module_speeds_json,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCatalogStatus(
        "admin-products-status",
        (data && data.detail) || catT("Ошибка", "Error"),
        "error"
      );
      return;
    }
    elements.adminProductName.value = "";
    if (elements.adminProductCategory) elements.adminProductCategory.value = "";
    elements.adminProductDesc.value = "";
    if (elements.adminProductSpecs) elements.adminProductSpecs.value = "";
    if (elements.adminProductBuiltIn) elements.adminProductBuiltIn.value = "";
    if (elements.adminProductMaxSlots) elements.adminProductMaxSlots.value = "";
    if (elements.adminProductSpeedsJson) elements.adminProductSpeedsJson.value = "";
    refreshAdminProductUserPreview();
    await loadProducts();
    setCatalogStatus("admin-products-status", "", "info");
    showToast(catT("Продукт добавлен", "Product added"), "success");
  } catch (e) {
    console.error(e);
    setCatalogStatus(
      "admin-products-status",
      catT("Сеть.", "Network error."),
      "error"
    );
  }
}
