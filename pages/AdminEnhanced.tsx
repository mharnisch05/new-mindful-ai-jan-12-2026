import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { ActivityLogsViewer } from "@/components/admin/ActivityLogsViewer";
import { RevenueAnalytics } from "@/components/admin/RevenueAnalytics";
import { SystemSettingsPanel } from "@/components/admin/SystemSettingsPanel";
import { IntegrationSettings } from "@/components/admin/IntegrationSettings";
import { ComprehensiveAnalytics } from "@/components/admin/ComprehensiveAnalytics";
import { IntegrationStatusDashboard } from "@/components/admin/IntegrationStatusDashboard";
import { EnhancedUserManagement } from "@/components/admin/EnhancedUserManagement";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function AdminEnhanced() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground">Manage users, integrations, and system settings</p>
        </div>
        <ThemeSwitcher />
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <ComprehensiveAnalytics />
        </TabsContent>

        <TabsContent value="users">
          <EnhancedUserManagement />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="logs">
          <ActivityLogsViewer />
        </TabsContent>

        <TabsContent value="status">
          <IntegrationStatusDashboard />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
