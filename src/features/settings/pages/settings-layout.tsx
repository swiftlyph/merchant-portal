import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "profile", path: "/app/settings/profile", label: "Profile" },
  { value: "team", path: "/app/settings/team", label: "Team" },
];

/**
 * Shared layout for /app/settings/profile and /app/settings/team. The
 * sidebar has no sub-item support (see NavMain — a flat list only), so
 * "Settings" is a single nav entry landing on /app/settings/profile, and
 * these two routes are switched via in-page Tabs instead.
 */
export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const active = TABS.find((tab) => location.pathname.startsWith(tab.path))?.value ?? "profile";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Tabs
          value={active}
          onValueChange={(value) => {
            const tab = TABS.find((t) => t.value === value);
            if (tab) navigate(tab.path);
          }}
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Outlet />
    </div>
  );
}
