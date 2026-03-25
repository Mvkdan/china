import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { adminHelpers, universityHelpers, documentHelpers, notificationHelpers } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, GraduationCap, CheckCircle2, XCircle, Clock, Eye, Plus, X, Copy, MessageSquare
} from "lucide-react";

const STATUS_MAP = {
  Nouveau: "Nouveau",
  A_Verifier: "À vérifier",
  Correction_Requise: "Correction requise",
  Pret_Soumission: "Prêt pour soumission",
  Soumis: "Soumis",
  Admis: "Admis",
};

const DOC_STATUS_MAP = {
  pending: { icon: Clock, color: "#92400E", bg: "#FEF3C7", label: "En attente" },
  approved: { icon: CheckCircle2, color: "#166534", bg: "#DCFCE7", label: "Approuvé" },
  rejected: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Rejeté" },
};

export default function AdminStudentDetail() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [assignedUniversities, setAssignedUniversities] = useState([]);
  const [selectedUni, setSelectedUni] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pour le dialogue de correction
  const [correctionDialog, setCorrectionDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [correctionMessage, setCorrectionMessage] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const loadData = async () => {
    try {
      const [studentData, allUniversities] = await Promise.all([
        adminHelpers.getStudentDetail(studentId),
        universityHelpers.getAll(),
      ]);

      setStudent(studentData);
      setUniversities(allUniversities);

      const app = studentData.applications?.[0];
      if (app) {
        setAssignedUniversities(app.application_universities || []);
        setDocuments(app.documents || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const app = student.applications?.[0];
    if (!app) return;

    try {
      await adminHelpers.updateApplicationStatus(app.id, newStatus);
      toast.success("Statut mis à jour");
      await loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAssignUniversity = async () => {
    if (!selectedUni) {
      toast.error("Veuillez sélectionner une université");
      return;
    }

    const app = student.applications?.[0];
    if (!app) return;

    try {
      await universityHelpers.assignToApplication(app.id, selectedUni, profile.id);
      toast.success("Université assignée");
      setSelectedUni("");
      await loadData();
    } catch (error) {
      console.error("Error assigning university:", error);
      toast.error("Erreur lors de l'assignation");
    }
  };

  const handleRemoveUniversity = async (uniId) => {
    const app = student.applications?.[0];
    if (!app) return;

    try {
      await universityHelpers.removeFromApplication(app.id, uniId);
      toast.success("Université retirée");
      await loadData();
    } catch (error) {
      console.error("Error removing university:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDocumentAction = async (docId, action, feedback = null) => {
    try {
      await adminHelpers.updateDocumentStatus(docId, action, feedback, profile.id);
      toast.success(`Document ${action === "approved" ? "approuvé" : "rejeté"}`);
      
      // Si rejet avec feedback, envoyer une notification
      if (action === "rejected" && feedback) {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
          await notificationHelpers.requestCorrection(
            student.id,
            doc.document_type.replace(/_/g, ' '),
            feedback
          );
          toast.success("Notification envoyée à l'étudiant");
        }
      }
      
      await loadData();
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleRequestCorrection = (doc) => {
    setSelectedDocument(doc);
    setCorrectionMessage("");
    setCorrectionDialog(true);
  };

  const handleSendCorrectionRequest = async () => {
    if (!correctionMessage.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }

    try {
      // Rejeter le document avec le feedback
      await handleDocumentAction(selectedDocument.id, "rejected", correctionMessage);
      
      setCorrectionDialog(false);
      setSelectedDocument(null);
      setCorrectionMessage("");
    } catch (error) {
      console.error("Error sending correction request:", error);
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const url = await documentHelpers.getDocumentUrl(doc.file_path);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Erreur lors de la visualisation");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FDFBF7" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div>
      </div>
    );
  }

  const app = student.applications?.[0];
  const formData = {
    ...app?.identity,
    ...app?.education,
    ...app?.contacts,
    ...app?.emergency_contact,
    ...app?.financial_guarantor,
    ...app?.family,
  };

  return (
    <div className="min-h-screen" style={{ background: "#FDFBF7" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(253,251,247,0.8)", backdropFilter: "blur(16px)", borderColor: "#E2E4E7" }}>
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6" style={{ color: "#1C3530" }} />
            <span className="text-lg font-bold" style={{ color: "#1C3530", fontFamily: "Chivo, sans-serif" }}>
              {student.first_name} {student.last_name}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations candidature */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
                  Informations de la candidature
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "#525A61" }}>Statut:</span>
                  <Select value={app?.status || "Nouveau"} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-48 border-slate-300" data-testid="status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {Object.entries(formData).map(([key, value]) => {
                  if (!value || typeof value === "object") return null;
                  return (
                    <div key={key} className="group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#525A61" }}>
                          {key.replace(/_/g, " ")}
                        </span>
                        <button
                          onClick={() => copyToClipboard(value)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3 w-3" style={{ color: "#525A61" }} />
                        </button>
                      </div>
                      <p className="text-sm mt-1" style={{ color: "#1A2024" }}>
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
                Documents ({documents.length})
              </h2>

              {documents.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "#525A61" }}>
                  Aucun document uploadé
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const statusInfo = DOC_STATUS_MAP[doc.status] || DOC_STATUS_MAP.pending;
                    const Icon = statusInfo.icon;

                    return (
                      <div key={doc.id} className="p-4 rounded-lg border" style={{ borderColor: "#E2E4E7" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold" style={{ color: "#1A2024" }}>
                                {doc.document_type.replace(/_/g, " ")}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                <Icon className="h-3 w-3" />
                                {statusInfo.label}
                              </span>
                            </div>
                            <p className="text-xs truncate" style={{ color: "#525A61" }}>
                              {doc.file_name}
                            </p>
                            {doc.feedback && (
                              <p className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                                {doc.feedback}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleViewDocument(doc)} className="h-8 rounded-full">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {doc.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleDocumentAction(doc.id, "approved")}
                                  className="h-8 rounded-full text-white"
                                  style={{ backgroundColor: "#166534" }}
                                  data-testid={`approve-doc-${doc.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRequestCorrection(doc)}
                                  className="h-8 rounded-full text-white"
                                  style={{ backgroundColor: "#DC2626" }}
                                  data-testid={`reject-doc-${doc.id}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Universités assignées */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
                Universités assignées
              </h3>

              {assignedUniversities.length > 0 && (
                <div className="space-y-2 mb-4">
                  {assignedUniversities.map((uni) => (
                    <div key={uni.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#F8FAFC" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1A2024" }}>
                          {uni.universities.name}
                        </p>
                        <p className="text-xs" style={{ color: "#525A61" }}>
                          {uni.universities.city}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUniversity(uni.university_id)}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Select value={selectedUni} onValueChange={setSelectedUni}>
                  <SelectTrigger className="border-slate-300" data-testid="university-select">
                    <SelectValue placeholder="Sélectionner une université" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities
                      .filter((u) => !assignedUniversities.some((au) => au.university_id === u.id))
                      .map((uni) => (
                        <SelectItem key={uni.id} value={uni.id}>
                          {uni.name} - {uni.city}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignUniversity}
                  disabled={!selectedUni}
                  className="w-full rounded-full text-white"
                  style={{ backgroundColor: "#1C3530" }}
                  data-testid="assign-university-btn"
                >
                  <Plus className="h-4 w-4 mr-2" /> Assigner
                </Button>
              </div>
            </div>

            {/* Infos étudiant */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
                Informations
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#525A61" }}>
                    Email
                  </p>
                  <p style={{ color: "#1A2024" }}>{student.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#525A61" }}>
                    Inscription
                  </p>
                  <p style={{ color: "#1A2024" }}>
                    {new Date(student.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#525A61" }}>
                    Progression
                  </p>
                  <p style={{ color: "#1A2024" }}>
                    {app?.completed_steps?.length || 0}/6 étapes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogue de demande de correction */}
      <Dialog open={correctionDialog} onOpenChange={setCorrectionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Demander une correction</DialogTitle>
            <DialogDescription>
              Expliquez pourquoi ce document nécessite une correction. L'étudiant recevra une notification.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#1A2024" }}>
                Document : {selectedDocument?.document_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs" style={{ color: "#525A61" }}>
                Fichier : {selectedDocument?.file_name}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#1A2024" }}>
                Message de correction
              </label>
              <Textarea
                placeholder="Ex: La photo n'est pas sur fond blanc. Veuillez soumettre une nouvelle photo conforme."
                value={correctionMessage}
                onChange={(e) => setCorrectionMessage(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSendCorrectionRequest}
              disabled={!correctionMessage.trim()}
              className="text-white"
              style={{ backgroundColor: "#DC2626" }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
