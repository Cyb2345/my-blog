import { SiteConfigManager } from "../config/page";

export default function AdminHomeConfigPage() {
  return (
    <SiteConfigManager
      initialGroup="hero"
      allowedGroups={["hero", "notice", "homeBackground", "resources"]}
    />
  );
}
