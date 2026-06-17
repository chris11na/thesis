// Main app bundle: configurator + admin panel.
// Layout: index.html (markup) + css/index.css + js/index.js + api-config.js.
// Next decomposition step: api.js, admin-catalog.js, configurator.js, i18n.js.

/** Set false to hide admin sales submissions panel (defense / demo toggle). */
const ADMIN_SALES_SUBMISSIONS_UI = true;

const API_BASE = window.APP_API_BASE || "https://thesis-zqvx.onrender.com";
const UI_LANG_STORAGE_KEY = "ui_lang";

let globalLoadingCount = 0;

function setGlobalLoadingOverlay(visible) {
  const el = document.getElementById("global-loading-overlay");
  if (!el) return;
  if (visible) {
    el.hidden = false;
    el.setAttribute("aria-busy", "true");
  } else {
    el.hidden = true;
    el.setAttribute("aria-busy", "false");
  }
}

function bumpGlobalLoading(delta) {
  globalLoadingCount = Math.max(0, globalLoadingCount + delta);
  setGlobalLoadingOverlay(globalLoadingCount > 0);
}

function setPanelLoading(overlayEl, loading, label) {
  if (!overlayEl) return;
  overlayEl.hidden = !loading;
  if (label) overlayEl.textContent = label;
}

function bindSearchInputOnEnter(inputEl, onSubmit) {
  if (!inputEl || typeof onSubmit !== "function") return;
  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit((inputEl.value || "").trim());
    }
  });
}

function truncateCellText(value, maxLen) {
  const text = value == null ? "" : String(value).trim();
  if (!text) return "—";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

// Fallback when GET /products fails: isolated test product ids may still be 501/502.
const elements = {
  langToggleBtn: document.getElementById("lang-toggle-btn"),
  appPageTitle: document.getElementById("app-page-title"),
  productsList: document.getElementById("products-list"),
  catalogNav: document.getElementById("catalog-nav"),
  catalogBreadcrumb: document.getElementById("catalog-breadcrumb"),
  catalogGroupsGrid: document.getElementById("catalog-groups-grid"),
  catalogSubgroupsGrid: document.getElementById("catalog-subgroups-grid"),
  catalogProductsToolbar: document.getElementById("catalog-products-toolbar"),
  userProductsPanel: document.getElementById("user-products-panel"),
  productsSearchInput: document.getElementById("products-search-input"),
  userSwitchFiltersHost: document.getElementById("user-switch-filters"),
  productsSpecFilterClear: document.getElementById("products-spec-filter-clear"),
  userProductsLoading: document.getElementById("user-products-loading"),
  adminProductsSearchInput: document.getElementById("admin-products-search-input"),
  adminSwitchFiltersHost: document.getElementById("admin-switch-filters"),
  adminProductsSpecFilterClear: document.getElementById(
    "admin-products-spec-filter-clear"
  ),
  adminCatalogGroupSelect: document.getElementById("admin-catalog-group-select"),
  adminCatalogSubgroupSelect: document.getElementById("admin-catalog-subgroup-select"),
  adminGroupsTbody: document.getElementById("admin-groups-tbody"),
  adminNewGroupCode: document.getElementById("admin-new-group-code"),
  adminNewGroupName: document.getElementById("admin-new-group-name"),
  adminAddGroupBtn: document.getElementById("admin-add-group-btn"),
  adminReclassifyBtn: document.getElementById("admin-reclassify-btn"),
  adminProductsLoading: document.getElementById("admin-products-loading"),
  productsCounter: document.getElementById("products-counter"),
  productsSource: document.getElementById("products-source"),
  productsStatusArea: document.getElementById("products-status-area"),
  selectedPills: document.getElementById("selected-items-pills"),
  selectedItemsCount: document.getElementById("selected-items-count"),
  clearTokenBtn: document.getElementById("clear-token-btn"),
  authStatusArea: document.getElementById("auth-status-area"),
  userIdInput: document.getElementById("user-id-input"),
  createConfigBtn: document.getElementById("create-config-btn"),
  statusArea: document.getElementById("status-area"),
  projectNameInput: document.getElementById("project-name-input"),
  projectContactNameInput: document.getElementById("project-contact-name-input"),
  projectContactEmailInput: document.getElementById("project-contact-email-input"),
  projectNotesInput: document.getElementById("project-notes-input"),
  apiBase: document.getElementById("api-base"),
  roleBadge: document.getElementById("role-badge"),
  userConfiguratorLayout: document.getElementById(
    "user-configurator-layout"
  ),
  userMainStack: document.getElementById("user-main-stack"),
  recentConfigurationsSection: document.getElementById(
    "recent-configurations-section"
  ),
  recentConfigurationsList: document.getElementById(
    "recent-configurations-list"
  ),
  recentConfigurationsEmpty: document.getElementById(
    "recent-configurations-empty"
  ),
  projectContactHelp: document.getElementById("project-contact-help"),
  confirmSubmitDialog: document.getElementById("confirm-submit-dialog"),
  confirmSubmitTitle: document.getElementById("confirm-submit-title"),
  confirmSubmitScroll: document.getElementById("confirm-submit-scroll"),
  confirmSubmitQuestion: document.getElementById("confirm-submit-question"),
  confirmSubmitCancel: document.getElementById("confirm-submit-cancel"),
  confirmSubmitOk: document.getElementById("confirm-submit-ok"),
  configExportDialog: document.getElementById("config-export-dialog"),
  configExportTitle: document.getElementById("config-export-title"),
  configExportLead: document.getElementById("config-export-lead"),
  configExportXlsxBtn: document.getElementById("config-export-xlsx-btn"),
  configExportCsvBtn: document.getElementById("config-export-csv-btn"),
  configExportCloseBtn: document.getElementById("config-export-close-btn"),
  equipmentPickerOverlay: document.getElementById("equipment-picker-overlay"),
  equipmentPickerTitle: document.getElementById("equipment-picker-title"),
  equipmentPickerLead: document.getElementById("equipment-picker-lead"),
  equipmentPickerBody: document.getElementById("equipment-picker-body"),
  equipmentPickerCancel: document.getElementById("equipment-picker-cancel"),
  equipmentPickerConfirm: document.getElementById("equipment-picker-confirm"),
  headerBlurbAdmin: document.getElementById("header-blurb-admin"),
  adminCatalogBlock: document.getElementById("admin-catalog-block"),
  adminArea: document.getElementById("admin-area"),
  adminUsersCompanySelect: document.getElementById(
    "admin-users-company-select"
  ),
  adminUsersRefreshBtn: document.getElementById("admin-users-refresh-btn"),
  adminUsersSearchInput: document.getElementById("admin-users-search-input"),
  adminUsersFold: document.getElementById("admin-users-fold"),
  adminUsersPendingBadge: document.getElementById("admin-users-pending-badge"),
  adminUsersLoading: document.getElementById("admin-users-loading"),
  adminUsersTbody: document.getElementById("admin-users-tbody"),
  adminSubmissionsFold: document.getElementById("admin-submissions-fold"),
  adminSubmissionsSearchInput: document.getElementById(
    "admin-submissions-search-input"
  ),
  adminSubmissionsCompanySelect: document.getElementById(
    "admin-submissions-company-select"
  ),
  adminSubmissionsPeriodSelect: document.getElementById(
    "admin-submissions-period-select"
  ),
  adminSubmissionsClearFiltersBtn: document.getElementById(
    "admin-submissions-clear-filters-btn"
  ),
  adminSubmissionsRefreshBtn: document.getElementById(
    "admin-submissions-refresh-btn"
  ),
  adminSubmissionsLoading: document.getElementById("admin-submissions-loading"),
  adminSubmissionsTbody: document.getElementById("admin-submissions-tbody"),
  adminSpecParamsTbody: document.getElementById("admin-spec-params-tbody"),
  adminSpecParamCode: document.getElementById("admin-spec-param-code"),
  adminSpecParamName: document.getElementById("admin-spec-param-name"),
  adminSpecParamSort: document.getElementById("admin-spec-param-sort"),
  adminSpecParamAddBtn: document.getElementById("admin-spec-param-add-btn"),
  adminCompanyName: document.getElementById("admin-company-name"),
  adminCompanyDomain: document.getElementById("admin-company-domain"),
  adminAddCompanyBtn: document.getElementById("admin-add-company-btn"),
  adminCompaniesSearchInput: document.getElementById("admin-companies-search-input"),
  adminCompaniesLoading: document.getElementById("admin-companies-loading"),
  adminCompaniesTbody: document.getElementById("admin-companies-tbody"),
  adminCompanyEditWrap: document.getElementById("admin-company-edit-wrap"),
  adminCompanyEditId: document.getElementById("admin-company-edit-id"),
  adminCompanyEditName: document.getElementById("admin-company-edit-name"),
  adminCompanyEditDomain: document.getElementById("admin-company-edit-domain"),
  adminSaveCompanyBtn: document.getElementById("admin-save-company-btn"),
  adminCancelCompanyEditBtn: document.getElementById(
    "admin-cancel-company-edit-btn"
  ),
  adminProductName: document.getElementById("admin-product-name"),
  adminProductCategory: document.getElementById("admin-product-category"),
  adminProductDesc: document.getElementById("admin-product-desc"),
  adminProductSpecs: document.getElementById("admin-product-specs"),
  adminProductBuiltIn: document.getElementById("admin-product-built-in"),
  adminProductMaxSlots: document.getElementById("admin-product-max-slots"),
  adminProductSpeedsJson: document.getElementById("admin-product-speeds-json"),
  adminAddProductBtn: document.getElementById("admin-add-product-btn"),
  adminProductsTbody: document.getElementById("admin-products-tbody"),
  adminProductUserPreview: document.getElementById("admin-product-user-preview"),
  adminProductDrawerOverlay: document.getElementById(
    "admin-product-drawer-overlay"
  ),
  adminProductDrawer: document.getElementById("admin-product-drawer"),
  adminProductDrawerBody: document.getElementById("admin-product-drawer-body"),
  adminProductDrawerClose: document.getElementById("admin-product-drawer-close"),
  adminConfirmCancel: document.getElementById("admin-confirm-cancel"),
  adminConfirmOk: document.getElementById("admin-confirm-ok"),
  globalLoadingSpinner: document.getElementById("global-loading-spinner"),
};

let uiLang = localStorage.getItem(UI_LANG_STORAGE_KEY) || "ru";

/** User catalog UI: translate chrome only; product name/description/specs stay as from API. */
function catT(ruText, enText) {
  return uiLang === "en" ? enText : ruText;
}

const CATALOG_GROUP_I18N = {
  switches: ["Коммутаторы", "Switches"],
  wifi: [
    "Контроллеры и беспроводные точки доступа",
    "Controllers & wireless access points",
  ],
  load_balancer: [
    "Балансировка трафика приложений",
    "Application load balancing",
  ],
  management: [
    "Система управления и мониторинга",
    "Management & monitoring",
  ],
  firewall: [
    "Межсетевые экраны и маршрутизаторы",
    "Firewalls & routers",
  ],
  server: ["Серверное оборудование", "Server equipment"],
  telephony: ["Телефония", "Telephony"],
};

const CATALOG_SUBGROUP_I18N = {
  equipment: ["Оборудование", "Equipment"],
  accessories: ["Аксессуары", "Accessories"],
  support: ["Поддержка", "Support"],
  certificates: ["Сертификаты", "Certificates"],
  licenses: ["Лицензии", "Licenses"],
};

function catalogGroupDisplayName(groupOrCode, fallbackName) {
  const code =
    typeof groupOrCode === "string"
      ? groupOrCode.toLowerCase()
      : String((groupOrCode && groupOrCode.code) || "").toLowerCase();
  const pair = code ? CATALOG_GROUP_I18N[code] : null;
  if (pair) return catT(pair[0], pair[1]);
  if (fallbackName) return fallbackName;
  if (groupOrCode && typeof groupOrCode === "object") {
    return groupOrCode.name || groupOrCode.code || "—";
  }
  return code || "—";
}

function catalogSubgroupDisplayName(subOrCode, groupOrCode, fallbackName) {
  const subCode =
    typeof subOrCode === "string"
      ? subOrCode.toLowerCase()
      : String((subOrCode && subOrCode.code) || "").toLowerCase();
  const groupCode =
    typeof groupOrCode === "string"
      ? groupOrCode.toLowerCase()
      : String((groupOrCode && groupOrCode.code) || "").toLowerCase();
  if (subCode === "accessories" && groupCode === "switches") {
    return catT("Аксессуры и оптика", "Accessories & optics");
  }
  const pair = subCode ? CATALOG_SUBGROUP_I18N[subCode] : null;
  if (pair) return catT(pair[0], pair[1]);
  if (fallbackName) return fallbackName;
  if (subOrCode && typeof subOrCode === "object") {
    return subOrCode.name || subOrCode.code || "—";
  }
  return subCode || "—";
}

function catalogProductGroupPath(p) {
  if (!p) return "—";
  const groupLabel = catalogGroupDisplayName(p.group_code, p.group_name);
  const subLabel = catalogSubgroupDisplayName(
    p.subgroup_code,
    p.group_code,
    p.subgroup_name
  );
  if (groupLabel !== "—" && subLabel !== "—") {
    return groupLabel + " / " + subLabel;
  }
  return subLabel !== "—" ? subLabel : groupLabel;
}

function syncPageTitle() {
  if (!elements.appPageTitle) return;
  const isAdmin = getCurrentRoleId() === 1;
  elements.appPageTitle.textContent = isAdmin
    ? catT("Администрирование", "Administration")
    : catT("Конфигуратор", "Configurator");
  document.title = elements.appPageTitle.textContent;
}

function syncLoadingLabels() {
  const text = catT("Загрузка…", "Loading…");
  [
    elements.userProductsLoading,
    elements.adminProductsLoading,
    elements.adminUsersLoading,
    elements.adminCompaniesLoading,
  ].forEach((el) => {
    if (el) el.textContent = text;
  });
}

function applyUiLanguage(lang) {
  uiLang = lang === "en" ? "en" : "ru";
  localStorage.setItem(UI_LANG_STORAGE_KEY, uiLang);
  document.documentElement.lang = uiLang;
  const isEn = uiLang === "en";
  if (elements.langToggleBtn) elements.langToggleBtn.textContent = isEn ? "EN" : "RU";
  const productsTitle = document.getElementById("products-card-title");
  if (productsTitle) productsTitle.textContent = isEn ? "Products" : "Продукты";
  const confTitle = document.getElementById("configuration-card-title");
  if (confTitle) confTitle.textContent = isEn ? "Configuration" : "Конфигурация";
  const createLbl = document.getElementById("create-config-label");
  if (createLbl) {
    createLbl.textContent = isEn
      ? "Submit configuration"
      : "Отправить на регистрацию";
  }
  const projectInfoLabel = document.getElementById("project-info-label");
  if (projectInfoLabel) {
    projectInfoLabel.textContent = isEn
      ? "Project details"
      : "Информация о проекте";
  }
  const adminDomainHelp = document.getElementById("admin-domain-help");
  if (adminDomainHelp) {
    adminDomainHelp.innerHTML = isEn
      ? 'Allowed email domain (e.g. <code>aaa.ru</code>): user sign-up and sign-in are linked to the company with this domain.'
      : 'Разрешённый домен почты (например <code>aaa.ru</code>): регистрация и вход пользователей привязаны к компании с этим доменом.';
  }
  if (elements.projectNameInput) {
    elements.projectNameInput.placeholder = isEn ? "Project name" : "Название проекта";
  }
  if (elements.projectContactNameInput) {
    elements.projectContactNameInput.placeholder = isEn
      ? "Contact person"
      : "Контактное лицо";
  }
  if (elements.projectContactEmailInput) {
    elements.projectContactEmailInput.placeholder = isEn
      ? "Contact email"
      : "Контактный email";
  }
  if (elements.projectNotesInput) {
    elements.projectNotesInput.placeholder = isEn
      ? "Comment / note for sales team"
      : "Комментарий / примечание для отдела продаж";
  }
  if (elements.productsSearchInput) {
    elements.productsSearchInput.placeholder = isEn
      ? "Search entire catalog by ID, name or specs (Enter)"
      : "Поиск по всему каталогу: ID, название или параметры (Enter)";
  }
  if (elements.adminProductsSearchInput) {
    elements.adminProductsSearchInput.placeholder = isEn
      ? "Search by ID, name or specs (Enter)"
      : "Поиск по ID, названию или параметрам (Enter)";
  }
  if (elements.adminProductsSpecFilterClear) {
    elements.adminProductsSpecFilterClear.textContent = isEn ? "Clear" : "Сбросить";
  }
  renderCatalogFilterControls();
  syncCatalogFiltersVisibility();
  if (elements.headerBlurbAdmin) {
    elements.headerBlurbAdmin.textContent = isEn
      ? "Manage companies, users, and the equipment catalog."
      : "Здесь вы управляете организациями, пользователями и каталогом.";
  }
  const productsCardSubtitle = document.getElementById("products-card-subtitle");
  if (productsCardSubtitle) {
    productsCardSubtitle.textContent = "";
  }
  if (elements.adminCompanyEditName) {
    elements.adminCompanyEditName.placeholder = isEn ? "Company name" : "Название";
  }
  if (elements.adminCompanyEditDomain) {
    elements.adminCompanyEditDomain.placeholder = "example.com";
  }
  if (elements.adminCompanyName) {
    elements.adminCompanyName.placeholder = isEn ? "Acme Inc" : "Название компании";
  }
  if (elements.adminCompanyDomain) {
    elements.adminCompanyDomain.placeholder = "example.com";
  }
  if (elements.clearTokenBtn) {
    elements.clearTokenBtn.textContent = isEn ? "Log out" : "Выйти";
  }
  const foldCompanies = document.getElementById("admin-fold-companies");
  if (foldCompanies) {
    foldCompanies.textContent = isEn
      ? "Companies and domains"
      : "Организации и домены";
  }
  const foldUsersLabel = document.getElementById("admin-fold-users-label");
  if (foldUsersLabel) {
    foldUsersLabel.textContent = isEn ? "Users" : "Пользователи";
  }
  const foldSubmissions = document.getElementById("admin-fold-submissions");
  if (foldSubmissions) {
    foldSubmissions.textContent = isEn
      ? "Sales submissions"
      : "Заявки в отдел продаж";
  }
  const adminSubmissionsHelp = document.getElementById("admin-submissions-help");
  if (adminSubmissionsHelp) {
    adminSubmissionsHelp.textContent = isEn
      ? "Configurations submitted by users with a project name (sales handoff)."
      : "Конфигурации, отправленные пользователями с указанным названием проекта (sales handoff).";
  }
  if (elements.adminSubmissionsRefreshBtn) {
    elements.adminSubmissionsRefreshBtn.textContent = isEn
      ? "Refresh list"
      : "Обновить список";
  }
  if (elements.adminSubmissionsSearchInput) {
    elements.adminSubmissionsSearchInput.placeholder = isEn
      ? "Search project, user, company, ID (Enter)"
      : "Поиск по проекту, пользователю, компании, ID (Enter)";
  }
  if (elements.adminSubmissionsClearFiltersBtn) {
    elements.adminSubmissionsClearFiltersBtn.textContent = isEn
      ? "Clear filters"
      : "Сбросить";
  }
  fillAdminSubmissionsCompanySelect();
  syncAdminSubmissionsPeriodSelectLabels();
  syncAdminSubmissionsClearFiltersBtn();
  const thSubmissionsDate = document.getElementById("th-submissions-date");
  if (thSubmissionsDate) {
    thSubmissionsDate.textContent = isEn ? "Submitted" : "Отправлено";
  }
  const thSubmissionsProject = document.getElementById("th-submissions-project");
  if (thSubmissionsProject) {
    thSubmissionsProject.textContent = isEn ? "Project" : "Проект";
  }
  const thSubmissionsUser = document.getElementById("th-submissions-user");
  if (thSubmissionsUser) {
    thSubmissionsUser.textContent = isEn ? "User" : "Пользователь";
  }
  const thSubmissionsCompany = document.getElementById("th-submissions-company");
  if (thSubmissionsCompany) {
    thSubmissionsCompany.textContent = isEn ? "Company" : "Компания";
  }
  const thSubmissionsContact = document.getElementById("th-submissions-contact");
  if (thSubmissionsContact) {
    thSubmissionsContact.textContent = isEn ? "Contact" : "Контакт";
  }
  const thSubmissionsItems = document.getElementById("th-submissions-items");
  if (thSubmissionsItems) {
    thSubmissionsItems.textContent = isEn ? "Lines" : "Позиций";
  }
  const thSubmissionsNotes = document.getElementById("th-submissions-notes");
  if (thSubmissionsNotes) {
    thSubmissionsNotes.textContent = isEn ? "Note" : "Примечание";
  }
  const thSubmissionsExport = document.getElementById("th-submissions-export");
  if (thSubmissionsExport) {
    thSubmissionsExport.textContent = isEn ? "Specification" : "Спецификация";
  }
  const thSubmissionsActions = document.getElementById("th-submissions-actions");
  if (thSubmissionsActions) {
    thSubmissionsActions.textContent = isEn ? "Actions" : "Действия";
  }
  const foldCatalog = document.getElementById("admin-fold-catalog");
  if (foldCatalog) {
    foldCatalog.textContent = isEn
      ? "Catalog: equipment"
      : "Каталог: оборудование";
  }
  const addCompanyTitle = document.getElementById("add-company-title");
  if (addCompanyTitle) {
    addCompanyTitle.textContent = isEn ? "Add company" : "Добавить организацию";
  }
  const addCompanyNameLabel = document.getElementById("add-company-name-label");
  if (addCompanyNameLabel) {
    addCompanyNameLabel.textContent = isEn ? "Name" : "Название";
  }
  const addCompanyDomainLabel = document.getElementById(
    "add-company-domain-label"
  );
  if (addCompanyDomainLabel) {
    addCompanyDomainLabel.textContent = isEn ? "Email domain" : "Домен email";
  }
  const editCompanyTitle = document.getElementById("edit-company-title");
  if (editCompanyTitle) {
    editCompanyTitle.textContent = isEn ? "Edit company" : "Изменить организацию";
  }
  const editCompanyNameLabel = document.getElementById("edit-company-name-label");
  if (editCompanyNameLabel) {
    editCompanyNameLabel.textContent = isEn ? "Name" : "Название";
  }
  const editCompanyDomainLabel = document.getElementById(
    "edit-company-domain-label"
  );
  if (editCompanyDomainLabel) {
    editCompanyDomainLabel.textContent = isEn ? "Email domain" : "Домен email";
  }
  const usersCompanyFilterLabel = document.getElementById(
    "users-company-filter-label"
  );
  if (usersCompanyFilterLabel) {
    usersCompanyFilterLabel.textContent = isEn ? "Company" : "Компания";
  }
  const addProductTitle = document.getElementById("add-product-title");
  if (addProductTitle) {
    addProductTitle.textContent = isEn ? "Add product" : "Добавить продукт";
  }
  const thCompaniesName = document.getElementById("th-companies-name");
  if (thCompaniesName) thCompaniesName.textContent = isEn ? "Name" : "Название";
  const thCompaniesDomain = document.getElementById("th-companies-domain");
  if (thCompaniesDomain) thCompaniesDomain.textContent = isEn ? "Domain" : "Домен";
  const thCompaniesActions = document.getElementById("th-companies-actions");
  if (thCompaniesActions) {
    thCompaniesActions.textContent = isEn ? "Actions" : "Действия";
  }
  const thUsersName = document.getElementById("th-users-name");
  if (thUsersName) thUsersName.textContent = isEn ? "Name" : "Имя";
  const thUsersRole = document.getElementById("th-users-role");
  if (thUsersRole) thUsersRole.textContent = isEn ? "Role" : "Роль";
  const thUsersCompany = document.getElementById("th-users-company");
  if (thUsersCompany) thUsersCompany.textContent = isEn ? "Company" : "Компания";
  const thProductsName = document.getElementById("th-products-name");
  if (thProductsName) thProductsName.textContent = isEn ? "Name" : "Название";
  const thProductsCategory = document.getElementById("th-products-category");
  if (thProductsCategory) {
    thProductsCategory.textContent = isEn ? "Category (label)" : "Категория";
  }
  const thProductsKind = document.getElementById("th-products-kind");
  if (thProductsKind) thProductsKind.textContent = isEn ? "Kind" : "Тип";
  const thProductsDesc = document.getElementById("th-products-desc");
  if (thProductsDesc) thProductsDesc.textContent = isEn ? "Description" : "Описание";
  const thProductsSection = document.getElementById("th-products-section");
  if (thProductsSection) thProductsSection.textContent = isEn ? "Section" : "Раздел";
  const thProductsLegacySpecs = document.getElementById("th-products-legacy-specs");
  if (thProductsLegacySpecs) {
    thProductsLegacySpecs.textContent = isEn
      ? "Text characteristics"
      : "Текст. характеристики";
  }
  const thProductsExtraParams = document.getElementById("th-products-extra-params");
  if (thProductsExtraParams) {
    thProductsExtraParams.textContent = isEn ? "Extra parameters" : "Доп. параметры";
  }
  const thProductsActions = document.getElementById("th-products-actions");
  if (thProductsActions) thProductsActions.textContent = isEn ? "Actions" : "Действия";
  const drawerTitle = document.getElementById("admin-product-drawer-title");
  if (drawerTitle) {
    drawerTitle.textContent = isEn ? "Product card" : "Карточка продукта";
  }
  if (elements.adminUsersRefreshBtn) {
    elements.adminUsersRefreshBtn.textContent = isEn
      ? "Refresh list"
      : "Обновить список";
  }
  if (elements.adminUsersSearchInput) {
    elements.adminUsersSearchInput.placeholder = isEn
      ? "Search by name, email or company (Enter)"
      : "Поиск по имени, email или компании (Enter)";
  }
  if (elements.adminAddCompanyBtn) {
    elements.adminAddCompanyBtn.textContent = isEn
      ? "Add company"
      : "Добавить организацию";
  }
  if (elements.adminCompaniesSearchInput) {
    elements.adminCompaniesSearchInput.placeholder = isEn
      ? "Search by name or domain (Enter)"
      : "Поиск по названию или домену (Enter)";
  }
  if (elements.adminAddProductBtn) {
    elements.adminAddProductBtn.textContent = isEn
      ? "Open create card"
      : "Открыть карточку создания";
  }
  if (elements.adminUsersCompanySelect) {
    fillAdminUsersCompanySelect();
  }
  if (elements.adminSubmissionsCompanySelect) {
    fillAdminSubmissionsCompanySelect();
  }
  if (getCurrentRoleId() === 1) {
    renderAdminCompaniesTable();
    renderAdminProductsTable();
    renderAdminSubmissionsTable();
    syncAdminProductDrawer();
    refreshAdminProductUserPreview();
  }
  const selectedHeading = document.getElementById("selected-items-heading");
  if (selectedHeading) {
    selectedHeading.textContent = catT("Выбранные товары", "Selected products");
  }
  updateCounter();
  renderSelectedPills();
  if (getCurrentRoleId() !== 1) {
    renderCatalogNavigation();
    if (Array.isArray(products) && products.length > 0) {
      renderProducts();
    }
  } else if (Array.isArray(products) && products.length > 0) {
    renderProducts();
  }
  requestAnimationFrame(syncProductsSectionHeight);
  if (elements.projectContactHelp) {
    elements.projectContactHelp.title = isEn
      ? "Contact person and email for the project are optional. If you leave them blank, sales will use the email on your account (the one you signed in with)."
      : "Имя и почта контакта по проекту необязательны. Если их не указать, отдел продаж свяжется по адресу вашей учётной записи (той, с которой вы вошли в систему).";
  }
  if (elements.confirmSubmitCancel) {
    elements.confirmSubmitCancel.textContent = isEn ? "Cancel" : "Отмена";
  }
  if (elements.confirmSubmitOk) {
    elements.confirmSubmitOk.textContent = isEn
      ? "Yes, submit"
      : "Да, отправить";
  }
  syncConfigExportDialogLabels();
  const recentCfgTitle = document.getElementById(
    "recent-configurations-title"
  );
  if (recentCfgTitle) {
    recentCfgTitle.textContent = isEn
      ? "Recent configurations"
      : "Последние конфигурации";
  }
  if (elements.recentConfigurationsEmpty) {
    elements.recentConfigurationsEmpty.textContent = isEn
      ? "Nothing here yet."
      : "Пока ничего нет.";
  }
  const foldSpecParams = document.getElementById("admin-fold-spec-params");
  if (foldSpecParams) {
    foldSpecParams.textContent = isEn
      ? "Specification parameters"
      : "Параметры характеристик";
  }
  const foldGroups = document.getElementById("admin-fold-groups");
  if (foldGroups) {
    foldGroups.textContent = isEn ? "Catalog groups" : "Группы каталога";
  }
  if (elements.adminNewGroupCode) {
    elements.adminNewGroupCode.placeholder = isEn
      ? "Code (latin)"
      : "Код (латиница)";
  }
  if (elements.adminNewGroupName) {
    elements.adminNewGroupName.placeholder = isEn
      ? "Group name"
      : "Название группы";
  }
  if (elements.adminAddGroupBtn) {
    elements.adminAddGroupBtn.textContent = isEn
      ? "Create group"
      : "Создать группу";
  }
  if (elements.adminReclassifyBtn) {
    elements.adminReclassifyBtn.textContent = isEn
      ? "Reclassify products"
      : "Переклассифицировать товары";
  }
  if (elements.adminSpecParamCode) {
    elements.adminSpecParamCode.placeholder = isEn ? "code" : "код";
  }
  if (elements.adminSpecParamName) {
    elements.adminSpecParamName.placeholder = isEn ? "Name" : "Название";
  }
  if (elements.adminSpecParamAddBtn) {
    elements.adminSpecParamAddBtn.textContent = isEn
      ? "Add parameter"
      : "Добавить параметр";
  }
  const thSpecParamsCode = document.getElementById("th-spec-params-code");
  if (thSpecParamsCode) thSpecParamsCode.textContent = isEn ? "Code" : "Код";
  const thSpecParamsName = document.getElementById("th-spec-params-name");
  if (thSpecParamsName) thSpecParamsName.textContent = isEn ? "Name" : "Название";
  const thSpecParamsOrder = document.getElementById("th-spec-params-order");
  if (thSpecParamsOrder) thSpecParamsOrder.textContent = isEn ? "Order" : "Порядок";
  const thSpecParamsActive = document.getElementById("th-spec-params-active");
  if (thSpecParamsActive) thSpecParamsActive.textContent = isEn ? "Active" : "Активен";
  const thGroupsName = document.getElementById("th-groups-name");
  if (thGroupsName) thGroupsName.textContent = isEn ? "Group" : "Группа";
  const thGroupsSubgroups = document.getElementById("th-groups-subgroups");
  if (thGroupsSubgroups) {
    thGroupsSubgroups.textContent = isEn ? "Subgroups" : "Подгруппы";
  }
  const thGroupsCount = document.getElementById("th-groups-count");
  if (thGroupsCount) thGroupsCount.textContent = isEn ? "Products" : "Товаров";
  const thGroupsActions = document.getElementById("th-groups-actions");
  if (thGroupsActions) thGroupsActions.textContent = isEn ? "Actions" : "Действия";
  const thProductsId = document.getElementById("th-products-id");
  if (thProductsId) thProductsId.textContent = "ID";
  const thProductsGroup = document.getElementById("th-products-group");
  if (thProductsGroup) thProductsGroup.textContent = isEn ? "Group" : "Группа";
  const thUsersId = document.getElementById("th-users-id");
  if (thUsersId) thUsersId.textContent = "ID";
  const thUsersEmail = document.getElementById("th-users-email");
  if (thUsersEmail) thUsersEmail.textContent = "Email";
  const thUsersStatus = document.getElementById("th-users-status");
  if (thUsersStatus) thUsersStatus.textContent = isEn ? "Status" : "Статус";
  const thUsersActions = document.getElementById("th-users-actions");
  if (thUsersActions) thUsersActions.textContent = isEn ? "Actions" : "Действия";
  const thUsersComment = document.getElementById("th-users-comment");
  if (thUsersComment) {
    thUsersComment.textContent = isEn ? "Admin comment" : "Комментарий админа";
  }
  const thCompaniesId = document.getElementById("th-companies-id");
  if (thCompaniesId) thCompaniesId.textContent = "ID";
  if (elements.adminSaveCompanyBtn) {
    elements.adminSaveCompanyBtn.textContent = isEn ? "Save" : "Сохранить";
  }
  if (elements.adminCancelCompanyEditBtn) {
    elements.adminCancelCompanyEditBtn.textContent = isEn ? "Cancel" : "Отмена";
  }
  if (elements.productsSpecFilterClear) {
    elements.productsSpecFilterClear.textContent = isEn ? "Clear" : "Сбросить";
  }
  if (elements.adminConfirmCancel) {
    elements.adminConfirmCancel.textContent = isEn ? "Cancel" : "Отмена";
  }
  if (elements.adminConfirmOk) {
    elements.adminConfirmOk.textContent = isEn ? "Delete" : "Удалить";
  }
  if (elements.adminProductDrawerClose) {
    elements.adminProductDrawerClose.setAttribute(
      "aria-label",
      isEn ? "Close product card" : "Закрыть карточку"
    );
  }
  if (elements.globalLoadingSpinner) {
    elements.globalLoadingSpinner.setAttribute(
      "aria-label",
      isEn ? "Loading" : "Загрузка"
    );
  }
  if (elements.adminCatalogGroupSelect) {
    elements.adminCatalogGroupSelect.setAttribute(
      "aria-label",
      isEn ? "Catalog group" : "Группа каталога"
    );
  }
  if (elements.adminCatalogSubgroupSelect) {
    elements.adminCatalogSubgroupSelect.setAttribute(
      "aria-label",
      isEn ? "Catalog subgroup" : "Подгруппа каталога"
    );
  }
  if (elements.adminUsersCompanySelect) {
    elements.adminUsersCompanySelect.setAttribute(
      "aria-label",
      isEn ? "Company" : "Компания"
    );
  }
  if (elements.projectContactHelp) {
    elements.projectContactHelp.setAttribute(
      "aria-label",
      isEn ? "Help" : "Подсказка"
    );
  }
  syncLoadingLabels();
  syncPageTitle();
  if (accessToken) {
    const data = parseJwt(accessToken);
    const roleId =
      data && data.role_id != null ? Number(data.role_id) : null;
    updateRoleBadge(roleId);
  }
  if (getCurrentRoleId() === 1) {
    renderAdminCompaniesTable();
    renderAdminUsersTable();
    renderAdminSubmissionsTable();
    renderAdminSpecParametersTable();
    renderAdminGroupsTable();
    renderAdminProductsTable();
    syncAdminProductDrawer();
    populateAdminCatalogGroupSelect();
    populateAdminCatalogSubgroupSelect();
  }
  if (getCurrentRoleId() !== 1 && accessToken) {
    void loadRecentConfigurations();
  }
}

let products = [];
let catalogGroups = [];
let catalogGroupId = null;
let catalogSubgroupId = null;
let adminCatalogGroupFilter = "";
let adminCatalogSubgroupFilter = "";
let specParameters = [];
const SWITCH_FILTER_DEFS = [
  {
    code: "switch_layer",
    labelRu: "Уровень",
    labelEn: "Layer",
    options: [
      { value: "2", labelRu: "2", labelEn: "2" },
      { value: "3", labelRu: "3", labelEn: "3" },
    ],
  },
  {
    code: "rj45_ports",
    labelRu: "Портов RJ45",
    labelEn: "RJ45 ports",
    options: [
      { value: "8", labelRu: "8", labelEn: "8" },
      { value: "24", labelRu: "24", labelEn: "24" },
      { value: "48", labelRu: "48", labelEn: "48" },
    ],
  },
  {
    code: "copper_speed",
    labelRu: "Скорость медных",
    labelEn: "Copper speed",
    options: [
      { value: "10/100/1000", labelRu: "10/100/1000", labelEn: "10/100/1000" },
      { value: "100/1000", labelRu: "100/1000", labelEn: "100/1000" },
    ],
  },
  {
    code: "poe_plus",
    labelRu: "PoE+",
    labelEn: "PoE+",
    options: [
      { value: "да", labelRu: "Да", labelEn: "Yes" },
      { value: "нет", labelRu: "Нет", labelEn: "No" },
    ],
  },
  {
    code: "optic_ports",
    labelRu: "Портов SFP/SFP+",
    labelEn: "SFP/SFP+ ports",
    options: [
      { value: "2", labelRu: "2", labelEn: "2" },
      { value: "4", labelRu: "4", labelEn: "4" },
      { value: "6", labelRu: "6", labelEn: "6" },
    ],
  },
  {
    code: "optic_speed",
    labelRu: "Скорость оптических",
    labelEn: "Optic speed",
    options: [
      { value: "1g", labelRu: "1G", labelEn: "1G" },
      { value: "1/10g", labelRu: "1/10G", labelEn: "1/10G" },
      { value: "10g", labelRu: "10G", labelEn: "10G" },
    ],
  },
  {
    code: "combo_ports",
    labelRu: "Combo-портов",
    labelEn: "Combo ports",
    options: [
      { value: "0", labelRu: "0", labelEn: "0" },
      { value: "4", labelRu: "4", labelEn: "4" },
      { value: "8", labelRu: "8", labelEn: "8" },
    ],
  },
];
const VO_FILTER_DEFS = [
  {
    code: "vo_item_type",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      { value: "cable", labelRu: "Кабель", labelEn: "Cable" },
      { value: "module", labelRu: "Модуль", labelEn: "Module" },
    ],
  },
];
const WIFI_EQUIPMENT_FILTER_DEFS = [
  {
    code: "wifi_device_type",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      { value: "controller", labelRu: "Контроллер", labelEn: "Controller" },
      {
        value: "access_point",
        labelRu: "Точка доступа",
        labelEn: "Access point",
      },
      {
        value: "connection_certificate",
        labelRu: "Сертификат на подключение",
        labelEn: "Connection certificate",
      },
    ],
  },
];
const WIFI_ACCESSORY_FILTER_DEFS = [
  {
    code: "wifi_accessory_kind",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      { value: "antenna", labelRu: "Антенны", labelEn: "Antennas" },
      { value: "enclosure", labelRu: "Корпуса", labelEn: "Enclosures" },
    ],
  },
];
const WIFI_SUPPORT_FILTER_DEFS = [
  {
    code: "support_tier",
    labelRu: "Тип поддержки",
    labelEn: "Support type",
    options: [
      { value: "standard", labelRu: "Стандартная", labelEn: "Standard" },
      { value: "extended", labelRu: "Расширенная", labelEn: "Extended" },
    ],
  },
];
const VLB_EQUIPMENT_FILTER_DEFS = [
  {
    code: "vlb_device_type",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      {
        value: "interface_module",
        labelRu: "Интерфейсный модуль",
        labelEn: "Interface module",
      },
      {
        value: "traffic_server",
        labelRu: "Сервер балансировки трафика",
        labelEn: "Traffic load balancer server",
      },
      {
        value: "virtual_server",
        labelRu: "Виртуальный сервер",
        labelEn: "Virtual server",
      },
    ],
  },
];
const VS_MANAGEMENT_EQUIPMENT_FILTER_DEFS = [
  {
    code: "vs_item_type",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      {
        value: "management_system",
        labelRu: "Система управления",
        labelEn: "Management system",
      },
      {
        value: "connection_certificate",
        labelRu: "Сертификат",
        labelEn: "Certificate",
      },
    ],
  },
];
const VFW_EQUIPMENT_FILTER_DEFS = [
  {
    code: "vfw_item_type",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      {
        value: "firewall",
        labelRu: "Межсетевой экран",
        labelEn: "Firewall",
      },
      {
        value: "certificate",
        labelRu: "Сертификат",
        labelEn: "Certificate",
      },
    ],
  },
];
const TELEPHONY_EQUIPMENT_FILTER_DEFS = [
  {
    code: "telephony_item_type",
    labelRu: "Тип",
    labelEn: "Type",
    options: [
      {
        value: "communication_manager",
        labelRu: "Communication Manager",
        labelEn: "Communication Manager",
      },
      {
        value: "expansion_module",
        labelRu: "Модуль расширения",
        labelEn: "Expansion module",
      },
      {
        value: "certificate",
        labelRu: "Сертификат",
        labelEn: "Certificate",
      },
      {
        value: "ip_phone",
        labelRu: "IP-телефон",
        labelEn: "IP phone",
      },
    ],
  },
];
const ALL_CATALOG_FILTER_DEFS = [
  ...SWITCH_FILTER_DEFS,
  ...VO_FILTER_DEFS,
  ...WIFI_EQUIPMENT_FILTER_DEFS,
  ...WIFI_ACCESSORY_FILTER_DEFS,
  ...WIFI_SUPPORT_FILTER_DEFS,
  ...VLB_EQUIPMENT_FILTER_DEFS,
  ...VS_MANAGEMENT_EQUIPMENT_FILTER_DEFS,
  ...VFW_EQUIPMENT_FILTER_DEFS,
  ...TELEPHONY_EQUIPMENT_FILTER_DEFS,
];
let catalogFilters = Object.fromEntries(
  ALL_CATALOG_FILTER_DEFS.map((def) => [def.code, ""])
);
let productSearchTerm = "";
const productsPageSize = 500;
let productsTotal = 0;
let pendingConfigurationPayload = null;
/** @type {{ configurationId: number, project?: object }|null} */
let pendingConfigurationExport = null;
let adminEditingProductId = null;
let adminCreatingProduct = false;
let adminProductDrawerEscHandler = null;
/** @type {Map<number, { targetAp: number|null, moduleQty: Record<number,number>, licenseQty: Record<number,number> }>} */
let configLineState = new Map();
/** Persist license-pack suggestion messages across renderProducts() rebuilds. */
let licenseSuggestFeedbackByProductId = new Map();
let optionsCache = {};
/** @type {Map<number, { id: number, name: string, description?: string, product_category?: string|null }>} */
let configProductCache = new Map();
let companiesList = [];
let adminCompaniesTableList = [];
let adminCompaniesSearchTerm = "";
let adminUsersList = [];
let adminUsersSearchTerm = "";
let adminUsersPendingCount = 0;
let adminUsersPendingBadgeDismissed = false;
let lastAdminUsersPendingCount = 0;
let adminSubmissionsList = [];
let adminSubmissionsSearchTerm = "";
let equipmentPickerProductId = null;

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
function appConfirmDialog({
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
}) {
  const overlay = document.getElementById("admin-confirm-overlay");
  const msgEl = document.getElementById("admin-confirm-message");
  const btnOk = document.getElementById("admin-confirm-ok");
  const btnCancel = document.getElementById("admin-confirm-cancel");
  if (!overlay || !msgEl || !btnOk || !btnCancel) {
    return Promise.resolve(window.confirm(message || ""));
  }

  msgEl.textContent = message || "";
  btnOk.textContent =
    confirmLabel || catT("Подтвердить", "Confirm");
  btnCancel.textContent = cancelLabel || catT("Отмена", "Cancel");
  btnOk.classList.toggle("danger", !!danger);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onEsc);
      btnOk.removeEventListener("click", onOk);
      btnCancel.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlayClick);
      resolve(ok);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onOverlayClick = (e) => {
      if (e.target === overlay) finish(false);
    };
    document.addEventListener("keydown", onEsc);
    btnOk.addEventListener("click", onOk);
    btnCancel.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlayClick);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    btnCancel.focus();
  });
}

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

const TOKEN_STORAGE_KEY = "access_token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";
const CONFIG_SELECTION_DRAFT_PREFIX = "configurator_selection_draft_v1_u";
let persistConfigDraftTimer = null;
let accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
let refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

function shouldUseUserToasts() {
  return getCurrentRoleId() === 2;
}

function setAuthStatus(message, type = "info") {
  // type: info | success | error
  elements.authStatusArea.innerHTML = "";
  if (!message) return;
  if (shouldUseUserToasts() && (type === "success" || type === "error")) {
    showToast(message, type);
    return;
  }

  const div = document.createElement("div");
  div.className = "status-text " + type;
  div.textContent = message;
  elements.authStatusArea.appendChild(div);
}

function setCatalogStatus(areaId, message, type = "info") {
  const el = document.getElementById(areaId);
  if (!el) return;
  el.innerHTML = "";
  if (!message) return;
  const div = document.createElement("div");
  div.className = "status-text " + type;
  div.textContent = message;
  el.appendChild(div);
}

/**
 * Modal confirm for admin deletes (embedded browsers often block window.confirm).
 * @returns {Promise<boolean>}
 */
function adminConfirmDelete(subjectLine, consequenceLines) {
    const bullets = (consequenceLines || [])
      .filter(Boolean)
      .map((x) => "• " + x)
      .join("\n");
    const msg =
      "ВНИМАНИЕ: удаление необратимо.\n\n" +
      subjectLine +
      (bullets ? "\n\n" + bullets : "") +
      "\n\nТочно удалить?";
  return appConfirmDialog({
    message: msg,
    confirmLabel: catT("Удалить", "Delete"),
    cancelLabel: catT("Отмена", "Cancel"),
    danger: true,
  });
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

function openAdminProductDrawer(p, opts) {
  const overlay = elements.adminProductDrawerOverlay;
  const drawer = elements.adminProductDrawer;
  const body = elements.adminProductDrawerBody;
  const createMode = !!(opts && opts.createMode);
  if (!overlay || !drawer || !body) return;
  adminCreatingProduct = createMode;
  body.innerHTML = "";
  body.appendChild(buildAdminProductEditPanel(p, { createMode }));
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
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
  if (isSwitchesEquipmentCatalogContext()) return SWITCH_FILTER_DEFS;
  if (isSwitchesAccessoriesCatalogContext()) return VO_FILTER_DEFS;
  if (isWifiEquipmentCatalogContext()) return WIFI_EQUIPMENT_FILTER_DEFS;
  if (isWifiAccessoriesCatalogContext()) return WIFI_ACCESSORY_FILTER_DEFS;
  if (isWifiSupportCatalogContext()) return WIFI_SUPPORT_FILTER_DEFS;
  if (isLoadBalancerEquipmentCatalogContext()) return VLB_EQUIPMENT_FILTER_DEFS;
  if (isLoadBalancerSupportCatalogContext()) return WIFI_SUPPORT_FILTER_DEFS;
  if (isManagementEquipmentCatalogContext()) return VS_MANAGEMENT_EQUIPMENT_FILTER_DEFS;
  if (isFirewallEquipmentCatalogContext()) return VFW_EQUIPMENT_FILTER_DEFS;
  if (isFirewallSupportCatalogContext()) return WIFI_SUPPORT_FILTER_DEFS;
  if (isServerSupportCatalogContext()) return WIFI_SUPPORT_FILTER_DEFS;
  if (isTelephonyEquipmentCatalogContext()) return TELEPHONY_EQUIPMENT_FILTER_DEFS;
  if (isTelephonySupportCatalogContext()) return WIFI_SUPPORT_FILTER_DEFS;
  return [];
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
  return defs.some((def) => Boolean((state[def.code] || "").trim()));
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
  for (const def of ALL_CATALOG_FILTER_DEFS) {
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
  renderCatalogNavigation();
  populateAdminCatalogGroupSelect();
  renderAdminGroupsTable();
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
    addSubBtn.className = "secondary-btn";
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

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
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
    deleteBtn.className = "ghost-btn";
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
    delBtn.className = "ghost-btn";
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
  const specValuesHint = document.createElement("div");
  specValuesHint.className = "field-description";
  specValuesHint.style.marginBottom = "8px";
  specValuesHint.textContent = isEn
    ? "Choose a parameter and set its value. Parameter list is managed by admin."
    : "Выберите параметр и задайте его значение. Список параметров настраивается администратором.";
  specValuesBlock.appendChild(specValuesHint);
  const specValuesRows = document.createElement("div");
  specValuesRows.style.display = "grid";
  specValuesRows.style.gap = "8px";
  specValuesBlock.appendChild(specValuesRows);
  const fallbackSpecs = document.createElement("textarea");
  fallbackSpecs.className = "admin-textarea-specs";
  fallbackSpecs.rows = 4;
  fallbackSpecs.placeholder = isEn
    ? "Legacy plain text specs (optional)"
    : "Устаревший текст характеристик (необязательно)";
  fallbackSpecs.value = p.technical_specs || "";
  specValuesBlock.appendChild(fallbackSpecs);
  const addSpecRowBtn = document.createElement("button");
  addSpecRowBtn.type = "button";
  addSpecRowBtn.className = "secondary-btn";
  addSpecRowBtn.style.width = "fit-content";
  addSpecRowBtn.textContent = isEn ? "Add parameter" : "Добавить параметр";
  specValuesBlock.appendChild(addSpecRowBtn);
  grid.appendChild(specValuesBlock);

  function collectSpecValuesFromEditor() {
    const rows = [];
    const used = new Set();
    const rowEls = specValuesRows.querySelectorAll("[data-spec-row='1']");
    for (const rowEl of rowEls) {
      const sel = rowEl.querySelector("select");
      const inp = rowEl.querySelector("input");
      if (!sel || !inp) continue;
      const pid = parseInt(sel.value, 10);
      const value = (inp.value || "").trim();
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
    row.style.display = "grid";
    row.style.gridTemplateColumns = "minmax(200px, 260px) minmax(220px, 1fr) auto";
    row.style.gap = "8px";
    const sel = document.createElement("select");
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = isEn ? "Select parameter" : "Выберите параметр";
    sel.appendChild(emptyOpt);
    specParameters.forEach((sp) => {
      const opt = document.createElement("option");
      opt.value = String(sp.id);
      opt.textContent = sp.name || sp.code || ("#" + sp.id);
      sel.appendChild(opt);
    });
    if (initialParameterId != null) sel.value = String(initialParameterId);
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = isEn ? "Value" : "Значение";
    inp.value = initialValue || "";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger-btn";
    delBtn.textContent = isEn ? "Delete" : "Удалить";
    delBtn.addEventListener("click", () => row.remove());
    row.appendChild(sel);
    row.appendChild(inp);
    row.appendChild(delBtn);
    specValuesRows.appendChild(row);
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

  const inpCategory = document.createElement("input");
  inpCategory.type = "text";
  inpCategory.placeholder = "";
  inpCategory.value = p.product_category || "";
  addFieldStack(
    isEn ? "Category (label)" : "Категория",
    inpCategory,
    isEn
      ? "Optional short label in the catalog (e.g. type of device)."
      : "Необязательная короткая метка в каталоге (например, тип устройства)."
  );

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
  addFieldStack(
    isEn ? "Catalog subgroup" : "Подгруппа каталога",
    selSubgroup,
    isEn
      ? "Group and subgroup where this product appears in the catalog."
      : "Группа и подгруппа, в которой продукт отображается в каталоге."
  );

  const inpBuilt = document.createElement("input");
  inpBuilt.type = "number";
  inpBuilt.min = "0";
  inpBuilt.step = "1";
  inpBuilt.placeholder = "";
  if (p.built_in_license_units != null) {
    inpBuilt.value = String(p.built_in_license_units);
  }
  addFieldStack(
    isEn ? "Built-in AP (licenses)" : "Встроенные AP (лицензии)",
    inpBuilt,
    isEn
      ? "Built-in licensed AP units; empty means none."
      : "Встроенные лицензируемые AP; пусто — нет."
  );

  const inpSpeeds = document.createElement("input");
  inpSpeeds.type = "text";
  inpSpeeds.placeholder = "";
  inpSpeeds.value = p.module_speeds_json || "";
  addFieldStack(
    isEn ? "Module speeds in catalog (JSON)" : "Скорости модулей в каталоге (JSON)",
    inpSpeeds,
    isEn
      ? "Array of Gbps numbers, e.g. [1, 10]. Empty means no filter."
      : "Массив чисел в Гбит/с, например [1, 10]. Пусто — без фильтра."
  );

  const inpSlots = document.createElement("input");
  inpSlots.type = "number";
  inpSlots.min = "0";
  inpSlots.step = "1";
  inpSlots.placeholder = "";
  if (p.max_module_slots != null) {
    inpSlots.value = String(p.max_module_slots);
  }
  addFieldStack(
    isEn ? "Max modules (total per product)" : "Макс. модулей (всего на продукт)",
    inpSlots,
    isEn
      ? "Total module slots limit in configuration; empty means no limit."
      : "Общий лимит слотов по модулям в конфигурации; пусто — без лимита."
  );

  const rulesSplit = adminSplitProductRulesJson(p.rules_json);
  const preservedRulesRest = rulesSplit.rest.slice();

  const rulesBlock = document.createElement("div");
  rulesBlock.className = "edit-grid-cell-wide";

  const rulesBlockTitle = document.createElement("div");
  rulesBlockTitle.className = "field-label";
  rulesBlockTitle.style.marginBottom = "4px";
  rulesBlockTitle.textContent = isEn
    ? "Advanced configurator rules"
    : "Расширенные правила конфигуратора";
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
    const bi = inpBuilt.value.trim();
    if (bi === "") {
      body.built_in_license_units = null;
    } else {
      const n = parseInt(bi, 10);
      if (!Number.isFinite(n) || n < 0) {
        setCatalogStatus(
          "admin-products-status",
          catT(
            "Встроенные AP: неотрицательное целое или пусто.",
            "Built-in AP: enter a non-negative integer or leave empty."
          ),
          "error"
        );
        isSavingProduct = false;
        btnSave.textContent = saveDefaultLabel;
        syncSaveEnabled();
        return;
      }
      body.built_in_license_units = n;
    }
    const speeds = inpSpeeds.value.trim();
    body.module_speeds_json = speeds === "" ? null : speeds;
    const slots = inpSlots.value.trim();
    if (slots === "") {
      body.max_module_slots = null;
    } else {
      const m = parseInt(slots, 10);
      if (!Number.isFinite(m) || m < 0) {
        setCatalogStatus(
          "admin-products-status",
          catT(
            "Макс. модулей: неотрицательное целое или пусто.",
            "Max modules: enter a non-negative integer or leave empty."
          ),
          "error"
        );
        isSavingProduct = false;
        btnSave.textContent = saveDefaultLabel;
        syncSaveEnabled();
        return;
      }
      body.max_module_slots = m;
    }
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

function refreshAdminProductUi() {
  if (getCurrentRoleId() !== 1) return;
  renderAdminProductsTable();
  syncAdminProductDrawer();
}

function parseJwt(token) {
  // Parse JWT payload for UI convenience (no verification).
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getCurrentRoleId() {
  if (!accessToken) return null;
  const data = parseJwt(accessToken);
  const roleId = data && data.role_id != null ? Number(data.role_id) : null;
  if (!roleId || roleId <= 0) return null;
  return roleId;
}

function getSubmitterEmailFromToken() {
  if (!accessToken) return "";
  const data = parseJwt(accessToken);
  const em = data && data.email != null ? String(data.email).trim() : "";
  return em.toLowerCase();
}

function updateRoleBadge(roleId) {
  if (roleId === 1) {
    elements.roleBadge.className = "status-badge role-admin";
    elements.roleBadge.textContent = catT("Админ", "Admin");
    return;
  }
  if (roleId === 2) {
    elements.roleBadge.className = "status-badge role-user";
    elements.roleBadge.textContent = catT("Пользователь", "User");
    return;
  }
  elements.roleBadge.className = "status-badge role-anonymous";
  elements.roleBadge.textContent = catT("Аноним", "Anonymous");
}

function redirectToLogin() {
  window.location.href = "login.html";
}

async function ensureAuthenticated() {
  accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (accessToken) return true;
  if (refreshToken) {
    const ok = await refreshAccessToken();
    if (ok) return true;
  }
  redirectToLogin();
  return false;
}

function syncAuthUI() {
  if (!accessToken) {
    redirectToLogin();
    return;
  }

  const data = parseJwt(accessToken);
  const sub = data && data.sub ? Number(data.sub) : null;
  const roleId = data && data.role_id != null ? String(data.role_id) : "?";
  const roleIdNumber = data && data.role_id != null ? Number(data.role_id) : null;

  const isAdmin = Number(roleId) === 1;
  syncPageTitle();
  if (elements.userMainStack) {
    elements.userMainStack.style.display = isAdmin ? "none" : "flex";
  }
  if (elements.recentConfigurationsSection) {
    elements.recentConfigurationsSection.style.display = isAdmin
      ? "none"
      : "block";
  }
  if (!isAdmin) {
    loadRecentConfigurations();
  }
  if (elements.headerBlurbAdmin) {
    elements.headerBlurbAdmin.style.display = isAdmin ? "" : "none";
  }
  updateCreateConfigBtnState();
  if (elements.adminArea) {
    elements.adminArea.style.display = isAdmin ? "block" : "none";
  }
  updateRoleBadge(roleIdNumber);
  if (Number(roleId) === 1) {
    syncAdminSubmissionsUiVisibility();
    (async () => {
      await loadAdminCompanies();
      await refreshAdminUsersPendingCount();
      await loadAdminUsers();
      await loadAdminSubmissions();
    })();
  }

  if (sub && sub > 0) {
    elements.userIdInput.value = String(sub);
  }
}

function clearStoredTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

async function refreshAccessToken() {
  if (!refreshToken) return false;
  bumpGlobalLoading(1);
  try {
    const response = await fetch(API_BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json || !json.access_token || !json.refresh_token) {
      clearStoredTokens();
      redirectToLogin();
      return false;
    }

    accessToken = json.access_token;
    refreshToken = json.refresh_token;
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    syncAuthUI();
    return true;
  } catch (error) {
    console.error("Refresh token request failed:", error);
    clearStoredTokens();
    redirectToLogin();
    return false;
  } finally {
    bumpGlobalLoading(-1);
  }
}

async function apiFetch(path, init = {}, retryAfterRefresh = true) {
  // Allow local section loaders to opt out from full-screen overlay.
  const useGlobalLoading = init.__globalLoading !== false;
  const requestInit = { ...init };
  delete requestInit.__globalLoading;
  if (useGlobalLoading) bumpGlobalLoading(1);
  try {
    const headers = new Headers(requestInit.headers || {});
    if (accessToken) {
      headers.set("Authorization", "Bearer " + accessToken);
    }

    const response = await fetch(API_BASE + path, {
      ...requestInit,
      headers,
    });

    if (response.status === 401 && retryAfterRefresh && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return await apiFetch(path, requestInit, false);
      }
    }
    return response;
  } finally {
    if (useGlobalLoading) bumpGlobalLoading(-1);
  }
}

function setProductsStatus(message, type = "info") {
  if (!elements.productsStatusArea) return;
  elements.productsStatusArea.innerHTML = "";
  if (!message) return;
  if (shouldUseUserToasts() && (type === "success" || type === "error")) {
    showToast(message, type);
    return;
  }
  const div = document.createElement("div");
  div.className = "status-text " + type;
  div.textContent = message;
  elements.productsStatusArea.appendChild(div);
}

function setStatus(message, type = "info") {
  // Configuration feedback: toast only (no inline status-area under the button).
  if (elements.statusArea) {
    elements.statusArea.innerHTML = "";
    elements.statusArea.hidden = true;
  }
  if (!message) return;
  const toastType =
    type === "error"
      ? "error"
      : type === "success"
        ? "success"
        : "info";
  showToast(message, toastType);
}

function showToast(message, type = "success") {
  const host = document.getElementById("app-toast-host");
  if (!host || !message) return;
  const t = document.createElement("div");
  t.className = "app-toast app-toast--" + type;
  t.textContent = message;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add("app-toast--visible"));
  const hideMs =
    type === "error" ? 5000 : type === "info" ? 3200 : 3400;
  setTimeout(() => {
    t.classList.remove("app-toast--visible");
    setTimeout(() => t.remove(), 220);
  }, hideMs);
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

  await Promise.all([loadCatalogGroups(), loadSpecParametersForAdmin()]);
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

async function init() {
  const authed = await ensureAuthenticated();
  if (!authed) return;

  elements.apiBase.textContent = API_BASE;

  elements.clearTokenBtn.addEventListener("click", async () => {
    // Keep the global loading overlay on until navigation: do not bumpGlobalLoading(-1)
    // before redirect, or the main UI flashes for a frame without tokens.
    bumpGlobalLoading(1);
    const tokenToRevoke = refreshToken;
    if (tokenToRevoke) {
      try {
        await fetch(API_BASE + "/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: tokenToRevoke }),
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }

    clearStoredTokens();
    elements.userIdInput.value = "1";
    if (elements.projectNameInput) elements.projectNameInput.value = "";
    if (elements.projectContactNameInput) elements.projectContactNameInput.value = "";
    if (elements.projectContactEmailInput) elements.projectContactEmailInput.value = "";
    if (elements.projectNotesInput) elements.projectNotesInput.value = "";
    redirectToLogin();
  });

  syncAuthUI();
  restoreConfigSelectionDraft();
  syncConfigExportDialogLabels();

  window.addEventListener("beforeunload", () => {
    if (persistConfigDraftTimer) {
      clearTimeout(persistConfigDraftTimer);
      persistConfigDraftTimer = null;
    }
    persistConfigSelectionDraft();
  });

  elements.createConfigBtn.addEventListener("click", () => {
    beginCreateConfigurationFlow();
  });
  if (elements.projectNameInput) {
    elements.projectNameInput.addEventListener("input", () => {
      updateCreateConfigBtnState();
    });
  }
  bindSearchInputOnEnter(elements.productsSearchInput, () => {
    applyProductCatalogQuery(true);
  });
  bindSearchInputOnEnter(elements.adminProductsSearchInput, () => {
    applyProductCatalogQuery(true);
  });
  if (elements.adminCatalogGroupSelect) {
    elements.adminCatalogGroupSelect.addEventListener("change", () => {
      adminCatalogGroupFilter = elements.adminCatalogGroupSelect.value || "";
      adminCatalogSubgroupFilter = "";
      populateAdminCatalogSubgroupSelect();
      renderCatalogFilterControls();
      syncCatalogFiltersVisibility();
      applyProductCatalogQuery(true);
    });
  }
  if (elements.adminCatalogSubgroupSelect) {
    elements.adminCatalogSubgroupSelect.addEventListener("change", () => {
      adminCatalogSubgroupFilter =
        elements.adminCatalogSubgroupSelect.value || "";
      renderCatalogFilterControls();
      syncCatalogFiltersVisibility();
      applyProductCatalogQuery(true);
    });
  }
  if (elements.adminAddGroupBtn) {
    elements.adminAddGroupBtn.addEventListener("click", () => {
      void addAdminGroup();
    });
  }
  if (elements.adminReclassifyBtn) {
    elements.adminReclassifyBtn.addEventListener("click", () => {
      void reclassifyCatalogProducts();
    });
  }
  if (elements.adminSpecParamAddBtn) {
    elements.adminSpecParamAddBtn.addEventListener("click", () => {
      void createAdminSpecParameter();
    });
  }
  if (elements.productsSpecFilterClear) {
    elements.productsSpecFilterClear.addEventListener("click", () => {
      clearProductSpecFilter();
    });
  }
  if (elements.adminProductsSpecFilterClear) {
    elements.adminProductsSpecFilterClear.addEventListener("click", () => {
      clearProductSpecFilter();
    });
  }
  if (elements.confirmSubmitDialog) {
    elements.confirmSubmitDialog.addEventListener("close", () => {
      pendingConfigurationPayload = null;
    });
  }
  if (elements.confirmSubmitDialog && elements.confirmSubmitCancel) {
    elements.confirmSubmitCancel.addEventListener("click", () => {
      elements.confirmSubmitDialog.close();
    });
  }
  if (elements.confirmSubmitDialog && elements.confirmSubmitOk) {
    elements.confirmSubmitOk.addEventListener("click", () => {
      const payload = pendingConfigurationPayload;
      elements.confirmSubmitDialog.close();
      if (payload) {
        void executeCreateConfiguration(payload);
      }
    });
  }
  if (elements.configExportXlsxBtn) {
    elements.configExportXlsxBtn.addEventListener("click", () => {
      const ctx = pendingConfigurationExport;
      if (ctx && ctx.configurationId) {
        void downloadConfigurationExportFile(ctx.configurationId, "xlsx");
      }
    });
  }
  if (elements.configExportCsvBtn) {
    elements.configExportCsvBtn.addEventListener("click", () => {
      const ctx = pendingConfigurationExport;
      if (ctx && ctx.configurationId) {
        void downloadConfigurationExportFile(ctx.configurationId, "csv");
      }
    });
  }
  if (elements.configExportDialog && elements.configExportCloseBtn) {
    elements.configExportCloseBtn.addEventListener("click", () => {
      elements.configExportDialog.close();
    });
  }
  if (elements.configExportDialog) {
    elements.configExportDialog.addEventListener("close", () => {
      pendingConfigurationExport = null;
    });
  }
  if (elements.adminUsersRefreshBtn) {
    elements.adminUsersRefreshBtn.addEventListener("click", () => {
      loadAdminUsers({ toastOnSuccess: true });
    });
  }
  if (elements.adminSubmissionsRefreshBtn) {
    elements.adminSubmissionsRefreshBtn.addEventListener("click", () => {
      loadAdminSubmissions({ toastOnSuccess: true });
    });
  }
  bindSearchInputOnEnter(elements.adminSubmissionsSearchInput, () => {
    applyAdminSubmissionsSearch();
  });
  if (elements.adminSubmissionsCompanySelect) {
    elements.adminSubmissionsCompanySelect.addEventListener("change", () => {
      syncAdminSubmissionsClearFiltersBtn();
      void loadAdminSubmissions();
    });
  }
  if (elements.adminSubmissionsPeriodSelect) {
    elements.adminSubmissionsPeriodSelect.addEventListener("change", () => {
      syncAdminSubmissionsClearFiltersBtn();
      void loadAdminSubmissions();
    });
  }
  if (elements.adminSubmissionsClearFiltersBtn) {
    elements.adminSubmissionsClearFiltersBtn.addEventListener("click", () => {
      clearAdminSubmissionsFilters();
    });
  }
  syncAdminSubmissionsUiVisibility();
  if (elements.adminUsersFold) {
    elements.adminUsersFold.addEventListener("toggle", () => {
      if (elements.adminUsersFold.open) {
        adminUsersPendingBadgeDismissed = true;
        syncAdminUsersPendingBadge();
      }
    });
  }
  bindSearchInputOnEnter(elements.adminUsersSearchInput, () => {
    applyAdminUsersSearch();
  });
  if (elements.adminUsersCompanySelect) {
    elements.adminUsersCompanySelect.addEventListener("change", () => {
      loadAdminUsers();
    });
  }

  if (elements.adminAddCompanyBtn) {
    elements.adminAddCompanyBtn.addEventListener("click", () => {
      addAdminCompany();
    });
  }
  bindSearchInputOnEnter(elements.adminCompaniesSearchInput, () => {
    applyAdminCompaniesSearch();
  });
  if (elements.adminSaveCompanyBtn) {
    elements.adminSaveCompanyBtn.addEventListener("click", () => {
      saveAdminCompany();
    });
  }
  if (elements.adminCancelCompanyEditBtn) {
    elements.adminCancelCompanyEditBtn.addEventListener("click", () => {
      hideAdminCompanyEdit();
      setCatalogStatus("admin-companies-status", "", "info");
    });
  }
  if (elements.adminAddProductBtn) {
    elements.adminAddProductBtn.addEventListener("click", () => {
      openAdminProductCreateDrawer();
    });
  }
  if (elements.langToggleBtn) {
    elements.langToggleBtn.addEventListener("click", () => {
      applyUiLanguage(uiLang === "ru" ? "en" : "ru");
    });
  }
  window.addEventListener("resize", () => {
    syncProductsSectionHeight();
  });
  if (elements.adminProductDrawerClose) {
    elements.adminProductDrawerClose.addEventListener("click", () => {
      adminEditingProductId = null;
      closeAdminProductDrawer();
    });
  }
  if (elements.adminProductDrawerOverlay) {
    elements.adminProductDrawerOverlay.addEventListener("click", (e) => {
      if (e.target !== elements.adminProductDrawerOverlay) return;
      adminEditingProductId = null;
      closeAdminProductDrawer();
    });
  }
  if (elements.adminProductDrawer) {
    elements.adminProductDrawer.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
  if (elements.adminProductName && elements.adminProductDesc) {
    const rpv = () => refreshAdminProductUserPreview();
    elements.adminProductName.addEventListener("input", rpv);
    elements.adminProductDesc.addEventListener("input", rpv);
    rpv();
  }

  if (elements.equipmentPickerCancel) {
    elements.equipmentPickerCancel.addEventListener("click", () => {
      closeEquipmentPickerModal(false);
    });
  }
  if (elements.equipmentPickerConfirm) {
    elements.equipmentPickerConfirm.addEventListener("click", () => {
      closeEquipmentPickerModal(true);
    });
  }
  if (elements.equipmentPickerOverlay) {
    elements.equipmentPickerOverlay.addEventListener("click", (e) => {
      if (e.target === elements.equipmentPickerOverlay) {
        closeEquipmentPickerModal(false);
      }
    });
  }

  syncProductsSectionHeight();
  syncUserCatalogPanels();
  loadProducts();
}

const DEBUG_UI_STORAGE_KEY = "debug_ui_visible";

function applyDebugUiToggle(enabled) {
  document.body.classList.toggle("debug-ui-on", enabled);
  const btn = document.getElementById("debug-ui-toggle");
  if (btn) {
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
    btn.textContent = enabled ? "Debug: on" : "Debug: off";
  }
  renderSelectedPills();
  updateCounter();
}

function setupDebugUiToggle() {
  const btn = document.getElementById("debug-ui-toggle");
  const storedOn = localStorage.getItem(DEBUG_UI_STORAGE_KEY) === "1";
  if (!btn) {
    applyDebugUiToggle(storedOn);
    return;
  }
  applyDebugUiToggle(storedOn);
  btn.addEventListener("click", () => {
    const next = !document.body.classList.contains("debug-ui-on");
    applyDebugUiToggle(next);
    localStorage.setItem(DEBUG_UI_STORAGE_KEY, next ? "1" : "0");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupDebugUiToggle();
  applyUiLanguage(uiLang);
  init().catch((e) => console.error(e));
});
