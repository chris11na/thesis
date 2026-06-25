// Bootstrap: init(), event wiring, DOMContentLoaded.

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
  if (elements.adminCatalogCategorySelect) {
    elements.adminCatalogCategorySelect.addEventListener("change", () => {
      adminCatalogCategoryFilter =
        elements.adminCatalogCategorySelect.value || "";
      applyProductCatalogQuery(true);
    });
  }
  if (elements.catalogCategorySelect) {
    elements.catalogCategorySelect.addEventListener("change", () => {
      catalogCategoryFilter = elements.catalogCategorySelect.value || "";
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
  if (elements.adminAddUserBtn) {
    elements.adminAddUserBtn.addEventListener("click", () => {
      void createAdminUser();
    });
  }
  if (elements.adminNewUserCompanySelect) {
    elements.adminNewUserCompanySelect.addEventListener("change", () => {
      syncAdminNewUserEmailHint();
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
