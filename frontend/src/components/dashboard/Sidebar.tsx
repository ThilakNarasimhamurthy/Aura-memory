import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, BarChart3, Target, Brain, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Customers", icon: Users, path: "/customers" },
  { title: "Campaigns", icon: Target, path: "/campaigns" },
  { title: "Campaign Automation", icon: Sparkles, path: "/campaign-automation" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
];

export function Sidebar() {
  const location = useLocation();
  
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">MemMachine</h1>
            <p className="text-xs text-muted-foreground">Analytics AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                "transition-all duration-200",
                isActive
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">AI</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground">admin@coffee.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
