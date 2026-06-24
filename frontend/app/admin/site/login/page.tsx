import { SiteConfigManager } from "../config/page";

export default function AdminLoginConfigPage() {
  return (
    <SiteConfigManager
      initialGroup="loginBackground"
      allowedGroups={["loginBackground", "resources"]}
    />
  );
}
