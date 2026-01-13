import { Brain, Calendar, Users, FileText, DollarSign, MessageSquare, Settings, BarChart3, Mail, Lock } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "AI Assistant", url: "/assistant", icon: MessageSquare, requiresPro: true },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Appointments", url: "/appointments", icon: Calendar },
  { title: "Messages", url: "/messages", icon: Mail },
  { title: "SOAP Notes", url: "/notes", icon: FileText },
  { title: "Billing", url: "/billing", icon: DollarSign },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { features } = useSubscription();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2 py-4 mb-4">
            <div className="bg-primary/10 p-2 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            {open && <span className="font-bold text-base">Mindful AI</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isLocked = item.requiresPro && !features.ai_assistant;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `text-sidebar-foreground ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`
                        }
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        {isLocked && <Lock className="w-3 h-3 ml-auto text-muted-foreground" />}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
