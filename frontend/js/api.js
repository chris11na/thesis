// Auth tokens, JWT helpers, and apiFetch.
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

