import React from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, FileText, Upload, CreditCard, LayoutDashboard, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/application", icon: FileText, label: "Candidature" },
  { to: "/documents", icon: Upload, label: "Documents" },
  { to: "/payment", icon: CreditCard, label: "Paiement" },
];

export function StudentLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen" style={{ background: '#FDFBF7' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(253,251,247,0.8)', backdropFilter: 'blur(16px)', borderColor: '#E2E4E7' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-7 w-7" style={{ color: '#1C3530' }} />
            <span className="text-xl font-bold tracking-tight" style={{ color: '#1C3530', fontFamily: 'Chivo, sans-serif' }}>ChinaStudy</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={`nav-${item.to.slice(1)}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${active ? 'text-white' : 'hover:bg-slate-100'}`}
                  style={active ? { backgroundColor: '#1C3530', color: 'white' } : { color: '#525A61' }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: '#525A61' }}>{user?.first_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-button" className="text-slate-500 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden flex overflow-x-auto border-t px-4 py-2 gap-2" style={{ borderColor: '#E2E4E7' }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${active ? 'text-white' : ''}`} style={active ? { backgroundColor: '#1C3530' } : { color: '#525A61' }}>
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
