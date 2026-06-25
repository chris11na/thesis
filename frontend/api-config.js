/**
 * API origin for login.html and index.html.
 * Local static server (127.0.0.1 / localhost) → local uvicorn on :8000.
 * Deployed frontend → Render backend.
 */
(function (global) {
  function resolveApiBase() {
    const override = global.localStorage.getItem("api_base_override");
    if (override && /^https?:\/\//i.test(override)) {
      return override.replace(/\/+$/, "");
    }
    const host = global.location?.hostname || "";
    if (host === "127.0.0.1" || host === "localhost") {
      return "http://127.0.0.1:8000";
    }
    return "https://thesis-spec-filters-api.onrender.com";
  }

  global.APP_API_BASE = resolveApiBase();
})(window);
