import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Download, FileText, User, GraduationCap, Phone, Shield, Heart, Building2, CreditCard, Send, Copy, MapPin } from "lucide-react";

const STATUS_CONFIG = {
  Draft: { label: "Brouillon", color: "#334155", bg: "#F1F5F9" },
  Pending_Review: { label: "En attente de vérification", color: "#92400E", bg: "#FEF3C7" },
  Awaiting_Payment: { label: "En attente de paiement", color: "#3730A3", bg: "#E0E7FF" },
  Paid: { label: "Payé", color: "#166534", bg: "#DCFCE7" },
  Submitted_to_Uni: { label: "Soumis à l'université", color: "#6B21A8", bg: "#F3E8FF" },
  Accepted: { label: "Admis", color: "#065F46", bg: "#D1FAE5" },
};

const STATUS_ACTIONS = {
  Pending_Review: { next: "Awaiting_Payment", label: "Débloquer le paiement", icon: CreditCard },
  Paid: { next: "Submitted_to_Uni", label: "Marquer comme soumis à l'université", icon: Send },
  Submitted_to_Uni: { next: "Accepted", label: "Marquer comme admis", icon: GraduationCap },
};

const DOC_STATUS = {
  Pending: { icon: Clock, color: "#92400E", bg: "#FEF3C7", label: "En attente" },
  Approved: { icon: CheckCircle2, color: "#166534", bg: "#DCFCE7", label: "Validé" },
  Rejected: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Rejeté" },
};

function InfoRow({ label, value }) {
  const copyToClipboard = () => { if (value) { navigator.clipboard.writeText(value); toast.success("Copié !"); } };
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#F1F5F9' }}>
      <span className="text-xs font-medium" style={{ color: '#525A61' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-right" style={{ color: '#1A2024' }}>{value || "—"}</span>
        {value && (
          <button onClick={copyToClipboard} className="text-slate-400 hover:text-[#1C3530] transition-colors" title="Copier">
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminStudentDetail() {
  const { api } = useAuth();
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [selectedUni, setSelectedUni] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [res, uniRes] = await Promise.all([
        api.get(`/admin/students/${studentId}`),
        api.get("/universities")
      ]);
      setData(res.data);
      setUniversities(uniRes.data);
      if (res.data.application?.university?.id) {
        setSelectedUni(res.data.application.university.id);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement");
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, [api, studentId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDocStatus = async (docId, status) => {
    try {
      await api.put(`/admin/documents/${docId}/status`, { status, feedback: feedbacks[docId] || null });
      toast.success(`Document ${status === "Approved" ? "validé" : "rejeté"}`);
      fetchData();
    } catch (err) {
      toast.error("Erreur");
    }
  };

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/students/${studentId}/status`, { status: newStatus });
      toast.success(`Statut mis à jour: ${STATUS_CONFIG[newStatus]?.label}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = doc.original_filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur de téléchargement");
    }
  };

  const handleAssignUniversity = async (uniId) => {
    const uni = universities.find(u => u.id === uniId);
    if (!uni) return;
    try {
      await api.put(`/admin/students/${studentId}/university`, {
        university_id: uni.id, university_name: uni.name, university_city: uni.city
      });
      toast.success(`Université assignée: ${uni.name}`);
      setSelectedUni(uniId);
      fetchData();
    } catch (err) {
      toast.error("Erreur lors de l'assignation");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F6' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div>;
  if (!data) return null;

  const { student, application: app, documents, payments } = data;
  const statusCfg = STATUS_CONFIG[app?.status] || STATUS_CONFIG.Draft;
  const action = STATUS_ACTIONS[app?.status];
  const identity = app?.identity || {};
  const education = app?.education || {};
  const contacts = app?.contacts || {};
  const emergency = app?.emergency_contact || {};
  const guarantor = app?.financial_guarantor || {};
  const family = app?.family || {};

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F6' }} data-testid="admin-student-detail">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ background: 'rgba(244,245,246,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E4E7' }}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} data-testid="back-to-admin" className="text-slate-500">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
              {student.first_name} {student.last_name}
            </h1>
            <span className="text-xs" style={{ color: '#525A61' }}>{student.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-semibold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          {action && (
            <Button data-testid="advance-status-btn" onClick={() => handleStatusChange(action.next)} disabled={actionLoading} className="rounded-sm text-white text-sm" style={{ backgroundColor: '#1C3530' }}>
              <action.icon className="h-4 w-4 mr-1.5" />
              {action.label}
            </Button>
          )}
        </div>
      </header>

      <main className="px-6 py-6">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="bg-white border rounded-sm mb-6" style={{ borderColor: '#E2E4E7' }}>
            <TabsTrigger value="info" data-testid="tab-info" className="rounded-sm text-sm">Informations</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents" className="rounded-sm text-sm">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments" className="rounded-sm text-sm">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Identity */}
              <div className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <User className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Identité</h3>
                </div>
                <InfoRow label="Nom (Passeport)" value={identity.last_name} />
                <InfoRow label="Prénom (Passeport)" value={identity.first_name} />
                <InfoRow label="N° Passeport" value={identity.passport_number} />
                <InfoRow label="Expiration Passeport" value={identity.passport_expiry} />
                <InfoRow label="Nationalité" value={identity.nationality} />
                <InfoRow label="Date de naissance" value={identity.date_of_birth} />
                <InfoRow label="Sexe" value={identity.gender} />
                <InfoRow label="État matrimonial" value={identity.marital_status} />
              </div>

              {/* Education */}
              <div className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <GraduationCap className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Éducation</h3>
                </div>
                <InfoRow label="Dernier diplôme" value={education.highest_degree} />
                <InfoRow label="Établissement" value={education.institution_name} />
                <InfoRow label="Niveau de Chinois" value={education.chinese_level} />
                <InfoRow label="Niveau d'Anglais" value={education.english_level} />
              </div>

              {/* Contacts */}
              <div className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <Phone className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Contacts</h3>
                </div>
                <InfoRow label="Adresse actuelle" value={contacts.current_address} />
                <InfoRow label="Adresse permanente" value={contacts.permanent_address} />
                <InfoRow label="Téléphone" value={contacts.phone_code && contacts.phone_number ? `${contacts.phone_code} ${contacts.phone_number}` : contacts.phone} />
              </div>

              {/* Emergency */}
              <div className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <Shield className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Contact d'urgence</h3>
                </div>
                <InfoRow label="Nom" value={emergency.last_name} />
                <InfoRow label="Prénom" value={emergency.first_name} />
                <InfoRow label="Relation" value={emergency.relationship === "Autre" ? emergency.relationship_other : emergency.relationship} />
                <InfoRow label="Téléphone" value={emergency.phone_code && emergency.phone_number ? `${emergency.phone_code} ${emergency.phone_number}` : emergency.phone} />
                <InfoRow label="Email" value={emergency.email} />
              </div>

              {/* Financial Guarantor */}
              <div className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <CreditCard className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Garant Financier</h3>
                </div>
                <InfoRow label="Nom" value={guarantor.last_name} />
                <InfoRow label="Prénom" value={guarantor.first_name} />
                <InfoRow label="Relation" value={guarantor.relationship} />
                <InfoRow label="Profession" value={guarantor.profession} />
                <InfoRow label="Téléphone" value={guarantor.phone_code && guarantor.phone_number ? `${guarantor.phone_code} ${guarantor.phone_number}` : guarantor.phone} />
              </div>

              {/* Family */}
              <div className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <Heart className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Famille</h3>
                </div>
                <InfoRow label="Père - Nom" value={family.father_last_name} />
                <InfoRow label="Père - Prénom" value={family.father_first_name} />
                <InfoRow label="Père - Âge" value={family.father_age} />
                <InfoRow label="Père - Profession" value={family.father_profession} />
                <InfoRow label="Mère - Nom" value={family.mother_last_name} />
                <InfoRow label="Mère - Prénom" value={family.mother_first_name} />
                <InfoRow label="Mère - Âge" value={family.mother_age} />
                <InfoRow label="Mère - Profession" value={family.mother_profession} />
              </div>

              {/* University Assignment (Admin) */}
              <div className="bg-white border rounded-sm p-4 lg:col-span-2 xl:col-span-1" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#E2E4E7' }}>
                  <Building2 className="h-4 w-4" style={{ color: '#1C3530' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Université assignée</h3>
                </div>
                {app?.university?.name && (
                  <div className="mb-3">
                    <InfoRow label="Université actuelle" value={app.university.name} />
                    <InfoRow label="Ville" value={app.university.city} />
                  </div>
                )}
                <div className="space-y-2 mt-2">
                  <Label className="text-xs font-medium" style={{ color: '#525A61' }}>Assigner / Changer l'université</Label>
                  <Select value={selectedUni} onValueChange={handleAssignUniversity}>
                    <SelectTrigger data-testid="admin-assign-university" className="border-slate-300 rounded-sm text-sm">
                      <SelectValue placeholder="Sélectionner une université" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} — {u.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-3">
              {documents.length === 0 && (
                <div className="bg-white border rounded-sm p-8 text-center" style={{ borderColor: '#E2E4E7', color: '#525A61' }}>
                  Aucun document uploadé
                </div>
              )}
              {documents.map(doc => {
                const ds = DOC_STATUS[doc.status] || DOC_STATUS.Pending;
                return (
                  <div key={doc.id} data-testid={`admin-doc-${doc.id}`} className="bg-white border rounded-sm p-4" style={{ borderColor: '#E2E4E7' }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: ds.bg }}>
                          <FileText className="h-5 w-5" style={{ color: ds.color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold" style={{ color: '#1A2024' }}>{doc.doc_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: ds.bg, color: ds.color }}>
                              <ds.icon className="h-3 w-3" />{ds.label}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#525A61' }}>{doc.original_filename} — {new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                          {doc.feedback && <p className="text-xs mt-1 px-2 py-1 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>{doc.feedback}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} data-testid={`admin-doc-download-${doc.id}`} className="text-slate-500">
                          <Download className="h-4 w-4" />
                        </Button>
                        {doc.status !== "Approved" && (
                          <Button size="sm" onClick={() => handleDocStatus(doc.id, "Approved")} data-testid={`admin-doc-approve-${doc.id}`}
                            className="rounded-sm text-xs text-white" style={{ backgroundColor: '#166534' }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Valider
                          </Button>
                        )}
                        {doc.status !== "Rejected" && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              placeholder="Motif de rejet..."
                              value={feedbacks[doc.id] || ""}
                              onChange={e => setFeedbacks(p => ({ ...p, [doc.id]: e.target.value }))}
                              data-testid={`admin-doc-feedback-${doc.id}`}
                              className="h-8 text-xs w-40 border-slate-300 rounded-sm"
                            />
                            <Button size="sm" variant="destructive" onClick={() => handleDocStatus(doc.id, "Rejected")} data-testid={`admin-doc-reject-${doc.id}`}
                              className="rounded-sm text-xs">
                              <XCircle className="h-3 w-3 mr-1" /> Rejeter
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-white border rounded-sm overflow-hidden" style={{ borderColor: '#E2E4E7' }}>
              {payments.length === 0 ? (
                <div className="p-8 text-center" style={{ color: '#525A61' }}>Aucune transaction</div>
              ) : (
                <table className="w-full admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Session ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="text-xs">{new Date(p.created_at).toLocaleString('fr-FR')}</td>
                        <td className="font-semibold">{p.amount} {p.currency?.toUpperCase()}</td>
                        <td>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {p.payment_status}
                          </span>
                        </td>
                        <td className="text-xs font-mono" style={{ color: '#525A61' }}>{p.session_id?.slice(0, 20)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
