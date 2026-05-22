import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "OpenJam",
    description: "Record, edit, and replay bug captures — local-first.",
    permissions: ["activeTab", "tabCapture", "storage", "webRequest", "tabs"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "OpenJam",
    },
  },
});
