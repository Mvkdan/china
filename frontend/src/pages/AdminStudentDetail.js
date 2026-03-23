import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Download, FileText, User,
  GraduationCap, Phone, Shield, Heart, Building2, CreditCard, Send,
  Copy, Eye, FileDown, FolderDown, StickyNote, Plus, Trash2, AlertTriangle,
  Calendar, Wrench, ChevronDown, ChevronUp, X
} from "lucide-react";

const STATUS_CONFIG = {
  Nouveau: { label: "Nouveau", color: "#334155", bg: "#F1F5F9" },
  A_Verifier: { label: "A vérifier", color: "#92400E", bg: "#FEF3C7" },
  Correction_Requise: { label: "Correction requise", color: "#DC2626", bg: "#FEE2E2" },
  Pret_Soumission: { label: "Prêt - Paiement", color: "#3730A3", bg: "#E0E7FF" },
  Paid: { label: "Payé", color: "#166534", bg: "#DCFCE7" },
  Soumis: { label: "Soumis", color: "#6B21A8", bg: "#F3E8FF" },
  Admis: { label: "Admis / JW202", color: "#065F46", bg: "#D1FAE5" },
};

const STATUS_ACTIONS = {
  A_Verifier: [
    { next: "Correction_Requise", label: "Demander correction", icon: Wrench, style: { backgroundColor: '#DC2626' } },
    { next: "Pret_Soumission", label: "Valider le dossier", icon: CheckCircle2, style: { backgroundColor: '#166534' } },
  ],
  Correction_Requise: [
    { next: "A_Verifier", label: "Re-vérifier", icon: Eye, style: { backgroundColor: '#92400E' } },
  ],
  Pret_Soumission: [
    { next: "Correction_Requise", label: "Demander correction", icon: Wrench, style: { backgroundColor: '#DC2626' } },
  ],
  Paid: [
    { next: "Soumis", label: "Marquer soumis à l'université", icon: Send, style: { backgroundColor: '#6B21A8' } },
  ],
  Soumis: [
    { next: "Admis", label: "Marquer admis", icon: GraduationCap, style: { backgroundColor: '#065F46' } },
  ],
};

const DOC_STATUS = {
  Pending: { icon: Clock, color: "#92400E", bg: "#FEF3C7", label: "En attente" },
  Approved: { icon: CheckCircle2, color: "#166534", bg: "#DCFCE7", label: "Validé" },
  Rejected: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Rejeté" },
};

function InfoRow({ label, value, chineseDate }) {
  let displayVal = value || "—";
  let copyVal = value || "";
  if (chineseDate && value) {
    const parts = value.split("-");
    if (parts.length === 3) displayVal = `${value} (${parts[0]}-${parts[1]}-${parts[2]})`;
  }
  const doCopy = () => { if (copyVal) { navigator.clipboard.writeText(copyVal); toast.success("Copié !"); } };
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0" style={{ borderColor: '#F1F5F9' }}>
      <span className="text-xs" style={{ color: '#525A61' }}>{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-right max-w-[200px] truncate" style={{ color: '#1A2024' }}>{displayVal}</span>
        {copyVal && <button onClick={doCopy} className="text-slate-400 hover:text-[#1C3530] shrink-0" title="Copier"><Copy className="h-3 w-3" /></button>}
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
  const [cannedResponses, setCannedResponses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [viewingDoc, setViewingDoc] = useState(null);
  const [viewingBlobUrl, setViewingBlobUrl] = useState(null);
  const [showNotes, setShowNotes] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [res, uniRes, cannedRes, notesRes] = await Promise.all([
        api.get(`/admin/students/${studentId}`),
        api.get("/universities"),
        api.get("/canned-responses"),
        api.get(`/admin/students/${studentId}/notes`),
      ]);
      setData(res.data);
      setUniversities(uniRes.data);
      setCannedResponses(cannedRes.data);
      setNotes(notesRes.data);
      if (res.data.application?.university?.id) setSelectedUni(res.data.application.university.id);
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
    } catch (err) { toast.error("Erreur"); }
  };

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/students/${studentId}/status`, { status: newStatus });
      toast.success(`Statut: ${STATUS_CONFIG[newStatus]?.label}`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setActionLoading(false); }
  };

  const handleAssignUniversity = async (uniId) => {
    const uni = universities.find(u => u.id === uniId);
    if (!uni) return;
    try {
      await api.put(`/admin/students/${studentId}/university`, { university_id: uni.id, university_name: uni.name, university_city: uni.city });
      toast.success(`Université: ${uni.name}`);
      setSelectedUni(uniId);
      fetchData();
    } catch (err) { toast.error("Erreur"); }
  };

  const handleViewDoc = async (doc) => {
    if (viewingBlobUrl) URL.revokeObjectURL(viewingBlobUrl);
    setViewingDoc(doc);
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      setViewingBlobUrl(url);
    } catch (err) { toast.error("Erreur de chargement"); }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = doc.original_filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error("Erreur"); }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/admin/students/${studentId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "fiche_recapitulative.pdf"; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF généré !");
    } catch (err) { toast.error("Erreur"); }
  };

  const handleDownloadZip = async () => {
    try {
      const res = await api.get(`/admin/students/${studentId}/zip`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "dossier_complet.zip"; a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP téléchargé !");
    } catch (err) { toast.error("Erreur"); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const res = await api.post(`/admin/students/${studentId}/notes`, { text: newNote });
      setNotes(prev => [res.data, ...prev]);
      setNewNote("");
    } catch (err) { toast.error("Erreur"); }
  };

  const handleDeleteNote = async (noteId) => {
    await api.delete(`/admin/notes/${noteId}`).catch(() => {});
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F6' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div>;
  if (!data) return null;

  const { student, application: app, documents, payments } = data;
  const statusCfg = STATUS_CONFIG[app?.status] || STATUS_CONFIG.Nouveau;
  const actions = STATUS_ACTIONS[app?.status] || [];
  const identity = app?.identity || {};
  const education = app?.education || {};
  const contacts = app?.contacts || {};
  const emergency = app?.emergency_contact || {};
  const guarantor = app?.financial_guarantor || {};
  const family = app?.family || {};

  // Deadline tracker
  const uniData = universities.find(u => u.id === app?.university?.id);
  let deadlineColor = null;
  let deadlineDays = null;
  if (uniData?.deadline) {
    const dl = new Date(uniData.deadline);
    const now = new Date();
    deadlineDays = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
    deadlineColor = deadlineDays <= 14 ? "#DC2626" : deadlineDays <= 30 ? "#F59E0B" : "#22C55E";
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F6' }} data-testid="admin-student-detail">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b px-4 py-2 flex items-center justify-between gap-2 flex-wrap" style={{ background: 'rgba(244,245,246,0.95)', backdropFilter: 'blur(16px)', borderColor: '#E2E4E7' }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} data-testid="back-to-admin" className="text-slate-500 h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
              {identity.last_name?.toUpperCase()} {identity.first_name || student.first_name}
            </h1>
            <span className="text-xs" style={{ color: '#525A61' }}>{student.email} | {identity.passport_number || "—"}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          {deadlineDays !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: `${deadlineColor}15`, color: deadlineColor }}>
              <Calendar className="h-3 w-3" />
              {deadlineDays > 0 ? `${deadlineDays}j restants` : "Deadline dépassée"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map(action => (
            <Button key={action.next} data-testid={`action-${action.next}`} size="sm" onClick={() => handleStatusChange(action.next)} disabled={actionLoading}
              className="rounded-sm text-white text-xs h-8" style={action.style}>
              <action.icon className="h-3 w-3 mr-1" />{action.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} data-testid="download-pdf" className="rounded-sm text-xs h-8 border-slate-300">
            <FileDown className="h-3 w-3 mr-1" />PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadZip} data-testid="download-zip" className="rounded-sm text-xs h-8 border-slate-300">
            <FolderDown className="h-3 w-3 mr-1" />ZIP
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNotes(!showNotes)} data-testid="toggle-notes" className="rounded-sm text-xs h-8 border-slate-300">
            <StickyNote className="h-3 w-3 mr-1" />Notes ({notes.length})
          </Button>
        </div>
      </header>

      {/* Split Screen */}
      <div className="flex h-[calc(100vh-52px)]">
        {/* LEFT: Student Info */}
        <div className="w-1/2 overflow-y-auto p-4 space-y-3" style={{ borderRight: '1px solid #E2E4E7' }}>
          {/* University Assignment */}
          <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4" style={{ color: '#1C3530' }} />
              <span className="text-xs font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo' }}>Université</span>
              {uniData?.deadline && <span className="text-xs ml-auto" style={{ color: deadlineColor }}>Deadline: {uniData.deadline}</span>}
            </div>
            <Select value={selectedUni} onValueChange={handleAssignUniversity}>
              <SelectTrigger data-testid="admin-assign-university" className="border-slate-300 rounded-sm text-xs h-8">
                <SelectValue placeholder="Assigner une université" />
              </SelectTrigger>
              <SelectContent>
                {universities.map(u => (
                  <SelectItem key={u.id} value={u.id}><span className="text-xs">{u.name} — {u.city} (limite: {u.deadline})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Cards - Compact Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <div className="flex items-center gap-1.5 mb-2"><User className="h-3 w-3" style={{ color: '#1C3530' }} /><span className="text-xs font-bold" style={{ fontFamily: 'Chivo' }}>Identité</span></div>
              <InfoRow label="Nom" value={identity.last_name?.toUpperCase()} />
              <InfoRow label="Prénom" value={identity.first_name} />
              <InfoRow label="Passeport" value={identity.passport_number} />
              <InfoRow label="Expiration" value={identity.passport_expiry} chineseDate />
              <InfoRow label="Nationalité" value={identity.nationality} />
              <InfoRow label="Naissance" value={identity.date_of_birth} chineseDate />
              <InfoRow label="Sexe" value={identity.gender} />
              <InfoRow label="État civil" value={identity.marital_status} />
            </div>
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <div className="flex items-center gap-1.5 mb-2"><GraduationCap className="h-3 w-3" style={{ color: '#1C3530' }} /><span className="text-xs font-bold" style={{ fontFamily: 'Chivo' }}>Éducation</span></div>
              <InfoRow label="Diplôme" value={education.highest_degree} />
              <InfoRow label="Établissement" value={education.institution_name} />
              <InfoRow label="Chinois" value={education.chinese_level} />
              <InfoRow label="Anglais" value={education.english_level} />
            </div>
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <div className="flex items-center gap-1.5 mb-2"><Phone className="h-3 w-3" style={{ color: '#1C3530' }} /><span className="text-xs font-bold" style={{ fontFamily: 'Chivo' }}>Contacts</span></div>
              <InfoRow label="Tél" value={contacts.phone_code && contacts.phone_number ? `${contacts.phone_code} ${contacts.phone_number}` : null} />
              <InfoRow label="Adresse" value={contacts.current_address} />
              <InfoRow label="Pays d'origine" value={contacts.permanent_address} />
            </div>
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <div className="flex items-center gap-1.5 mb-2"><Shield className="h-3 w-3" style={{ color: '#1C3530' }} /><span className="text-xs font-bold" style={{ fontFamily: 'Chivo' }}>Urgence</span></div>
              <InfoRow label="Nom" value={`${emergency.last_name || ''} ${emergency.first_name || ''}`} />
              <InfoRow label="Relation" value={emergency.relationship === "Autre" ? emergency.relationship_other : emergency.relationship} />
              <InfoRow label="Tél" value={emergency.phone_code && emergency.phone_number ? `${emergency.phone_code} ${emergency.phone_number}` : null} />
              <InfoRow label="Email" value={emergency.email} />
            </div>
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <div className="flex items-center gap-1.5 mb-2"><CreditCard className="h-3 w-3" style={{ color: '#1C3530' }} /><span className="text-xs font-bold" style={{ fontFamily: 'Chivo' }}>Garant</span></div>
              <InfoRow label="Nom" value={`${guarantor.last_name || ''} ${guarantor.first_name || ''}`} />
              <InfoRow label="Profession" value={guarantor.profession} />
              <InfoRow label="Relation" value={guarantor.relationship} />
              <InfoRow label="Tél" value={guarantor.phone_code && guarantor.phone_number ? `${guarantor.phone_code} ${guarantor.phone_number}` : null} />
            </div>
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <div className="flex items-center gap-1.5 mb-2"><Heart className="h-3 w-3" style={{ color: '#1C3530' }} /><span className="text-xs font-bold" style={{ fontFamily: 'Chivo' }}>Famille</span></div>
              <InfoRow label="Père" value={`${family.father_last_name || ''} ${family.father_first_name || ''}`} />
              <InfoRow label="Âge/Prof" value={family.father_age ? `${family.father_age} ans / ${family.father_profession || '-'}` : null} />
              <InfoRow label="Mère" value={`${family.mother_last_name || ''} ${family.mother_first_name || ''}`} />
              <InfoRow label="Âge/Prof" value={family.mother_age ? `${family.mother_age} ans / ${family.mother_profession || '-'}` : null} />
            </div>
          </div>

          {/* Documents List with actions */}
          <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
            <h3 className="text-xs font-bold mb-2" style={{ fontFamily: 'Chivo', color: '#1A2024' }}>Documents ({documents.length})</h3>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {documents.map(doc => {
                const ds = DOC_STATUS[doc.status] || DOC_STATUS.Pending;
                return (
                  <div key={doc.id} data-testid={`admin-doc-${doc.id}`} className="flex items-center gap-2 p-2 rounded border text-xs" style={{ borderColor: '#E2E4E7' }}>
                    <button onClick={() => handleViewDoc(doc)} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-slate-50 rounded p-1" data-testid={`view-doc-${doc.id}`}>
                      <FileText className="h-4 w-4 shrink-0" style={{ color: ds.color }} />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium block truncate" style={{ color: '#1A2024' }}>{doc.doc_type.replace(/_/g, ' ')}</span>
                        <span className="truncate block" style={{ color: '#525A61' }}>{doc.original_filename}</span>
                      </div>
                    </button>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0" style={{ backgroundColor: ds.bg, color: ds.color }}>
                      <ds.icon className="h-2.5 w-2.5" />{ds.label}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} className="h-6 w-6 p-0 text-slate-400"><Download className="h-3 w-3" /></Button>
                    {doc.status !== "Approved" && (
                      <Button size="sm" onClick={() => handleDocStatus(doc.id, "Approved")} data-testid={`approve-${doc.id}`} className="h-6 px-2 text-[10px] text-white rounded-sm" style={{ backgroundColor: '#166534' }}>
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      </Button>
                    )}
                    {doc.status !== "Rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => handleDocStatus(doc.id, "Rejected")} data-testid={`reject-${doc.id}`} className="h-6 px-2 text-[10px] rounded-sm">
                        <XCircle className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {documents.length === 0 && <p className="text-center py-4 text-xs" style={{ color: '#525A61' }}>Aucun document</p>}
            </div>
            {/* Feedback with canned responses */}
            {documents.some(d => d.status !== "Rejected") && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E2E4E7' }}>
                <Label className="text-[10px] font-semibold mb-1 block" style={{ color: '#525A61' }}>Commentaire rapide (appliqué au prochain rejet)</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {cannedResponses.map(cr => (
                    <button key={cr.id} onClick={() => {
                      const targetDoc = documents.find(d => d.status !== "Rejected");
                      if (targetDoc) setFeedbacks(p => ({ ...p, [targetDoc.id]: cr.text }));
                    }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium border hover:bg-slate-50 transition-colors" style={{ borderColor: '#E2E4E7', color: '#525A61' }}>
                      {cr.label}
                    </button>
                  ))}
                </div>
                {documents.filter(d => d.status !== "Rejected").map(doc => (
                  feedbacks[doc.id] ? (
                    <div key={doc.id} className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium truncate flex-1" style={{ color: '#525A61' }}>{doc.doc_type}: {feedbacks[doc.id]}</span>
                      <button onClick={() => setFeedbacks(p => ({ ...p, [doc.id]: "" }))} className="text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="bg-white border rounded-sm p-3" style={{ borderColor: '#E2E4E7' }}>
              <h3 className="text-xs font-bold mb-2" style={{ fontFamily: 'Chivo' }}>Paiements</h3>
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1">
                  <span>{p.amount} {p.currency?.toUpperCase()}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {p.payment_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Document Viewer */}
        <div className="w-1/2 flex flex-col" style={{ background: '#1A1A1A' }}>
          {viewingDoc && viewingBlobUrl ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: '#333', background: '#252525' }}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-white/60" />
                  <span className="text-xs text-white font-medium truncate">{viewingDoc.doc_type.replace(/_/g, ' ')} — {viewingDoc.original_filename}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(viewingDoc)} className="h-7 text-white/60 hover:text-white text-xs">
                    <Download className="h-3 w-3 mr-1" />Télécharger
                  </Button>
                  <button onClick={() => { setViewingDoc(null); if (viewingBlobUrl) URL.revokeObjectURL(viewingBlobUrl); setViewingBlobUrl(null); }} className="text-white/40 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {viewingDoc.content_type?.startsWith("image/") ? (
                  <img src={viewingBlobUrl} alt={viewingDoc.original_filename} className="max-w-full max-h-full object-contain rounded shadow-lg" />
                ) : (
                  <iframe src={viewingBlobUrl} title={viewingDoc.original_filename} className="w-full h-full rounded" style={{ minHeight: '80vh' }} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-12 w-12 mx-auto mb-3" style={{ color: '#444' }} />
                <p className="text-sm font-medium" style={{ color: '#666' }}>Visionneuse de documents</p>
                <p className="text-xs mt-1" style={{ color: '#555' }}>Cliquez sur un document à gauche pour le visualiser ici</p>
              </div>
            </div>
          )}
        </div>

        {/* Notes Panel (slide over) */}
        {showNotes && (
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l shadow-xl z-50 flex flex-col" style={{ borderColor: '#E2E4E7' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#E2E4E7' }}>
              <h3 className="text-sm font-bold" style={{ fontFamily: 'Chivo', color: '#1A2024' }}>Notes internes</h3>
              <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3 border-b" style={{ borderColor: '#E2E4E7' }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Ajouter une note privée..."
                data-testid="note-input"
                className="w-full border rounded-sm p-2 text-xs resize-none" style={{ borderColor: '#E2E4E7', minHeight: '60px' }}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()} data-testid="add-note-btn" className="mt-2 w-full rounded-sm text-white text-xs" style={{ backgroundColor: '#1C3530' }}>
                <Plus className="h-3 w-3 mr-1" />Ajouter
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notes.map(note => (
                <div key={note.id} className="border rounded-sm p-2.5" style={{ borderColor: '#E2E4E7' }}>
                  <div className="flex items-start justify-between">
                    <p className="text-xs whitespace-pre-wrap" style={{ color: '#1A2024' }}>{note.text}</p>
                    <button onClick={() => handleDeleteNote(note.id)} className="text-slate-400 hover:text-red-500 shrink-0 ml-2"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: '#94A3B8' }}>{note.admin_name} — {new Date(note.created_at).toLocaleString('fr-FR')}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-center text-xs py-8" style={{ color: '#94A3B8' }}>Aucune note</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
