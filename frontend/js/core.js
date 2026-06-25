// Shared constants, DOM refs, i18n, catalog state, and UI helpers.
// Loaded before api.js, configurator.js, admin.js, and bootstrap index.js.

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
  adminCatalogCategorySelect: document.getElementById("admin-catalog-category-select"),
  catalogCategorySelect: document.getElementById("catalog-category-select"),
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
  adminNewUserName: document.getElementById("admin-new-user-name"),
  adminNewUserEmail: document.getElementById("admin-new-user-email"),
  adminNewUserPassword: document.getElementById("admin-new-user-password"),
  adminNewUserPasswordToggle: document.getElementById(
    "admin-new-user-password-toggle"
  ),
  adminNewUserCompanySelect: document.getElementById(
    "admin-new-user-company-select"
  ),
  adminNewUserRoleSelect: document.getElementById("admin-new-user-role-select"),
  adminAddUserBtn: document.getElementById("admin-add-user-btn"),
  adminSubmissionsFold: document.getElementById("admin-submissions-fold"),
  adminSubmissionsSearchInput: document.getElementById(
    "admin-submissions-search-input"
  ),
  adminSubmissionsSearchBtn: document.getElementById(
    "admin-submissions-search-btn"
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
  adminCompaniesSearchBtn: document.getElementById("admin-companies-search-btn"),
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
  if (adminDomainHelp) adminDomainHelp.remove();
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
    elements.headerBlurbAdmin.textContent = "";
    elements.headerBlurbAdmin.style.display = "none";
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
  if (adminSubmissionsHelp) adminSubmissionsHelp.remove();
  if (elements.adminSubmissionsRefreshBtn) {
    elements.adminSubmissionsRefreshBtn.textContent = isEn
      ? "Refresh list"
      : "Обновить список";
  }
  if (elements.adminSubmissionsSearchInput) {
    elements.adminSubmissionsSearchInput.placeholder = isEn
      ? "Search project, user, company, ID"
      : "Поиск по проекту, пользователю, компании, ID";
  }
  if (elements.adminSubmissionsSearchBtn) {
    elements.adminSubmissionsSearchBtn.textContent = isEn ? "Find" : "Найти";
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
      ? "Search by name, email or company"
      : "Поиск по имени, email или компании";
  }
  if (elements.adminAddCompanyBtn) {
    elements.adminAddCompanyBtn.textContent = isEn
      ? "Add company"
      : "Добавить организацию";
  }
  if (elements.adminCompaniesSearchInput) {
    elements.adminCompaniesSearchInput.placeholder = isEn
      ? "Search by name or domain"
      : "Поиск по названию или домену";
  }
  if (elements.adminCompaniesSearchBtn) {
    elements.adminCompaniesSearchBtn.textContent = isEn ? "Find" : "Найти";
  }
  if (elements.adminAddProductBtn) {
    const labelEl = elements.adminAddProductBtn.querySelector(
      ".admin-add-product-btn-label"
    );
    const text = isEn ? "Create new product" : "Создать новый продукт";
    if (labelEl) labelEl.textContent = text;
    else elements.adminAddProductBtn.textContent = text;
  }
  if (elements.adminUsersCompanySelect) {
    fillAdminUsersCompanySelect();
  }
  if (elements.adminAddUserBtn) {
    elements.adminAddUserBtn.textContent = isEn
      ? "Create user"
      : "Создать пользователя";
  }
  const addUserTitle = document.getElementById("add-user-title");
  if (addUserTitle) {
    addUserTitle.textContent = isEn ? "Add user" : "Добавить пользователя";
  }
  const addUserNameLabel = document.getElementById("add-user-name-label");
  if (addUserNameLabel) {
    addUserNameLabel.textContent = isEn ? "Name" : "Имя";
  }
  const addUserEmailLabel = document.getElementById("add-user-email-label");
  if (addUserEmailLabel) {
    addUserEmailLabel.textContent = isEn ? "Login (email)" : "Логин (email)";
  }
  const addUserPasswordLabel = document.getElementById("add-user-password-label");
  if (addUserPasswordLabel) {
    addUserPasswordLabel.textContent = isEn ? "Password" : "Пароль";
  }
  const addUserCompanyLabel = document.getElementById("add-user-company-label");
  if (addUserCompanyLabel) {
    addUserCompanyLabel.textContent = isEn ? "Company" : "Организация";
  }
  const addUserRoleLabel = document.getElementById("add-user-role-label");
  if (addUserRoleLabel) {
    addUserRoleLabel.textContent = isEn ? "Role" : "Роль";
  }
  if (elements.adminNewUserPasswordToggle) {
    const shown = elements.adminNewUserPasswordToggle.getAttribute("aria-pressed") === "true";
    elements.adminNewUserPasswordToggle.textContent = shown
      ? isEn
        ? "Hide"
        : "Скрыть"
      : isEn
        ? "Show"
        : "Показать";
    elements.adminNewUserPasswordToggle.setAttribute(
      "aria-label",
      shown
        ? isEn
          ? "Hide password"
          : "Скрыть пароль"
        : isEn
          ? "Show password"
          : "Показать пароль"
    );
  }
  fillAdminNewUserCompanySelect();
  fillAdminNewUserRoleSelect();
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
  const adminNewGroupCodeLabel = document.getElementById(
    "admin-new-group-code-label"
  );
  if (adminNewGroupCodeLabel) {
    adminNewGroupCodeLabel.textContent = isEn ? "Code" : "Код";
  }
  const adminNewGroupNameLabel = document.getElementById(
    "admin-new-group-name-label"
  );
  if (adminNewGroupNameLabel) {
    adminNewGroupNameLabel.textContent = isEn ? "Name" : "Название";
  }
  if (elements.adminNewGroupCode) {
    elements.adminNewGroupCode.placeholder = isEn ? "wifi" : "wifi";
  }
  if (elements.adminNewGroupName) {
    elements.adminNewGroupName.placeholder = isEn ? "Wi‑Fi" : "Wi‑Fi";
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
  if (elements.adminSpecParamSort) {
    elements.adminSpecParamSort.placeholder = isEn ? "Order" : "порядок";
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
  const thGroupsCode = document.getElementById("th-groups-code");
  if (thGroupsCode) thGroupsCode.textContent = isEn ? "Code" : "Код";
  const thGroupsName = document.getElementById("th-groups-name");
  if (thGroupsName) thGroupsName.textContent = isEn ? "Name" : "Название";
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
let adminCatalogCategoryFilter = "";
let catalogCategoryFilter = "";
let equipmentTypeOptions = [];
let specParameters = [];
/** Loaded from GET /products/spec-filter-options for the active catalog scope. */
let catalogFilterDefs = [];
let catalogFilters = {};
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
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
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

/** Size a native <select> so the closed label is not truncated. */
function fitNativeSelectToContent(sel) {
  if (!sel || !sel.options || !sel.options.length) return;
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;";
  const cs = getComputedStyle(sel);
  probe.style.font = cs.font;
  probe.style.letterSpacing = cs.letterSpacing;
  document.body.appendChild(probe);
  let maxText = 0;
  for (let i = 0; i < sel.options.length; i++) {
    probe.textContent = sel.options[i].textContent || "";
    maxText = Math.max(maxText, probe.offsetWidth);
  }
  document.body.removeChild(probe);
  const padLeft = parseFloat(cs.paddingLeft) || 10;
  const padRight = parseFloat(cs.paddingRight) || 30;
  const border =
    (parseFloat(cs.borderLeftWidth) || 0) +
    (parseFloat(cs.borderRightWidth) || 0);
  const width = Math.ceil(maxText + padLeft + padRight + border + 2);
  sel.style.width = width + "px";
  sel.style.maxWidth = "100%";
}

function fitNativeSelectsInContainer(container) {
  if (!container) return;
  container.querySelectorAll("select").forEach((sel) => fitNativeSelectToContent(sel));
}
