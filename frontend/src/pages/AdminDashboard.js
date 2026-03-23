import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Search, Eye, Users, FileText, Clock, CheckCircle2, CreditCard, GraduationCap, Send } from "lucide-react";

const STATUS_CONFIG = {
  Draft: { label: "Brouillon", color: "#334155", bg: "#F1F5F9", icon: FileText },
  Pending_Review: { label: "En attente", color: "#92400E", bg: "#FEF3C7", icon: Clock },
  Awaiting_Payment: { label: "Att. paiement", color: "#3730A3", bg: "#E0E7FF", icon: CreditCard },
  Paid: { label: "Payé", color: "#166534", bg: "#DCFCE7", icon: CheckCircle2 },
  Submitted_to_Uni: { label: "Soumis", color: "#6B21A8", bg: "#F3E8FF", icon: Send },
  Accepted: { label: "Admis", color: "#065F46", bg: "#D1FAE5", icon: GraduationCap },
};

export default function AdminDashboard() {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get("/admin/students");
      setStudents(res.data);
    } catch (err) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleLogout = () => { logout(); navigate("/login"); };

  const filtered = students.filter(s => {
    const matchSearch = !search || [s.email, s.first_name, s.last_name, s.application?.identity?.passport_number]
      .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || s.application?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {};
  students.forEach(s => {
    const st = s.application?.status || "Draft";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F6' }}>
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(244,245,246,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E4E7' }}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6" style={{ color: '#1C3530' }} />
            <span className="text-lg font-bold tracking-tight" style={{ color: '#1C3530', fontFamily: 'Chivo, sans-serif' }}>ChinaStudy Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: '#525A61' }}>{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="admin-logout-button" className="text-slate-500 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              data-testid={`filter-${key}`}
              className={`rounded-sm border p-3 text-left transition-colors ${statusFilter === key ? 'ring-2' : ''}`}
              style={{ background: 'white', borderColor: statusFilter === key ? cfg.color : '#E2E4E7', ringColor: cfg.color }}>
              <div className="flex items-center gap-2">
                <cfg.icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-xl font-bold mt-1" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>{statusCounts[key] || 0}</p>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
            <Input
              data-testid="admin-search-input"
              placeholder="Rechercher par nom, email, passeport..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 border-slate-300 rounded-sm bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="admin-status-filter" className="w-48 border-slate-300 rounded-sm bg-white">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#525A61' }}>
            <Users className="h-4 w-4" />
            {filtered.length} étudiant{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Student Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div>
        ) : (
          <div className="bg-white border rounded-sm overflow-hidden" style={{ borderColor: '#E2E4E7' }}>
            <table className="w-full admin-table" data-testid="admin-students-table">
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Email</th>
                  <th>Passeport</th>
                  <th>Université</th>
                  <th>Documents</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const app = student.application;
                  const statusCfg = STATUS_CONFIG[app?.status] || STATUS_CONFIG.Draft;
                  return (
                    <tr key={student.id} data-testid={`student-row-${student.id}`}>
                      <td className="font-medium" style={{ color: '#1A2024' }}>
                        {student.first_name} {student.last_name}
                      </td>
                      <td style={{ color: '#525A61' }}>{student.email}</td>
                      <td className="font-mono text-xs" style={{ color: '#525A61' }}>{app?.identity?.passport_number || "—"}</td>
                      <td className="text-xs" style={{ color: '#525A61' }}>{app?.university?.name ? app.university.name.split("(")[0].trim() : "—"}</td>
                      <td>
                        <span className="text-xs font-medium" style={{ color: student.documents_approved === 6 ? '#166534' : '#525A61' }}>
                          {student.documents_approved}/{student.documents_count} validés
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                          <statusCfg.icon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: '#525A61' }}>
                        {app?.created_at ? new Date(app.created_at).toLocaleDateString('fr-FR') : "—"}
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" asChild data-testid={`view-student-${student.id}`}>
                          <Link to={`/admin/student/${student.id}`} className="text-[#C95B36] hover:text-[#A64A2C]">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12" style={{ color: '#525A61' }}>Aucun étudiant trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
