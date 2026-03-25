import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { adminHelpers } from "@/lib/helpers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Eye, LogOut, GraduationCap, Users } from "lucide-react";

const STATUS_MAP = {
  Nouveau: { color: "#334155", bg: "#F1F5F9", label: "Nouveau" },
  A_Verifier: { color: "#92400E", bg: "#FEF3C7", label: "À vérifier" },
  Correction_Requise: { color: "#DC2626", bg: "#FEE2E2", label: "Correction requise" },
  Pret_Soumission: { color: "#3730A3", bg: "#E0E7FF", label: "Prêt" },
  Soumis: { color: "#6B21A8", bg: "#F3E8FF", label: "Soumis" },
  Admis: { color: "#065F46", bg: "#D1FAE5", label: "Admis" },
};

export default function AdminDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, searchTerm, statusFilter]);

  const loadStudents = async () => {
    try {
      console.log('Loading students...');
      const data = await adminHelpers.getAllStudents();
      console.log('Students loaded:', data);
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error("Erreur lors du chargement des étudiants");
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => 
        s.applications?.[0]?.status === statusFilter
      );
    }

    setFilteredStudents(filtered);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FDFBF7' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#FDFBF7' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(253,251,247,0.8)', backdropFilter: 'blur(16px)', borderColor: '#E2E4E7' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-7 w-7" style={{ color: '#1C3530' }} />
            <span className="text-xl font-bold tracking-tight" style={{ color: '#1C3530', fontFamily: 'Chivo, sans-serif' }}>
              ChinaStudy Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: '#525A61' }}>{profile?.first_name} (Admin)</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
            Gestion des candidatures
          </h1>
          <p className="text-sm" style={{ color: '#525A61' }}>
            {students.length} étudiant{students.length > 1 ? 's' : ''} inscrit{students.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtres */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]"
                data-testid="admin-search-input"
              />
            </div>
          </div>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-slate-300 focus:border-[#1C3530]" data-testid="admin-status-filter">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.keys(STATUS_MAP).map(status => (
                  <SelectItem key={status} value={status}>{STATUS_MAP[status].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ background: 'white', borderColor: '#E2E4E7' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#525A61' }}>
                    Étudiant
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#525A61' }}>
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#525A61' }}>
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#525A61' }}>
                    Universités
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#525A61' }}>
                    Progression
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#525A61' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#E2E4E7' }}>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-sm" style={{ color: '#525A61' }}>
                      Aucun étudiant trouvé
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const app = student.applications?.[0];
                    const status = STATUS_MAP[app?.status] || STATUS_MAP.Nouveau;
                    const universities = app?.application_universities || [];
                    const progress = Math.round(((app?.completed_steps?.length || 0) / 6) * 100);

                    return (
                      <tr key={student.id} className="hover:bg-slate-50" data-testid={`student-row-${student.id}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ background: '#1C3530' }}>
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: '#1A2024' }}>
                                {student.first_name} {student.last_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm" style={{ color: '#525A61' }}>{student.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {universities.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {universities.map(uni => (
                                <span key={uni.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ backgroundColor: '#E0E7FF', color: '#3730A3' }}>
                                  {uni.universities.name.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: '#525A61' }}>Non assignée</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full" style={{ background: '#E2E4E7' }}>
                              <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: '#1C3530' }} />
                            </div>
                            <span className="text-xs font-medium" style={{ color: '#525A61' }}>{progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/student/${student.id}`)}
                            className="rounded-full border-slate-300 hover:border-[#1C3530]"
                            data-testid={`view-student-${student.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Voir
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
