import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { adminHelpers, universityHelpers, documentHelpers, notificationHelpers } from "@/lib/helpers";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, GraduationCap, CheckCircle2, XCircle, Clock, Eye, Plus, X, Copy, 
  MessageSquare, Download, FileArchive, AlertCircle, StickyNote, FileText, Image as ImageIcon
} from "lucide-react";

const STATUS_MAP = {
  Nouveau: { label: "Nouveau", color: "#334155", bg: "#F1F5F9", priority: 1 },
  A_Verifier: { label: "À vérifier", color: "#92400E", bg: "#FEF3C7", priority: 2 },
  Correction_Requise: { label: "Correction requise", color: "#DC2626", bg: "#FEE2E2", priority: 3 },
  Pret_Soumission: { label: "Prêt pour soumission", color: "#3730A3", bg: "#E0E7FF", priority: 4 },
  Soumis: { label: "Soumis", color: "#6B21A8", bg: "#F3E8FF", priority: 5 },
  Admis: { label: "Admis", color: "#065F46", bg: "#D1FAE5", priority: 6 },
};

const DOC_STATUS_MAP = {
  pending: { icon: Clock, color: "#92400E", bg: "#FEF3C7", label: "En attente" },
  approved: { icon: CheckCircle2, color: "#166534", bg: "#DCFCE7", label: "Approuvé" },
  rejected: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Rejeté" },
};

// Templates de réponses
const REJECTION_TEMPLATES = [
  "Le scan du passeport est coupé, merci de reprendre une photo entière.",
  "Le casier judiciaire doit dater de moins de 6 mois.",
  "Le certificat médical manque le tampon de l'hôpital.",
  "La photo d'identité doit être sur fond blanc.",
  "Le document n'est pas suffisamment lisible, veuillez le scanner à nouveau.",
  "Ce document a expiré, veuillez fournir une version à jour.",
];

export default function AdminStudentDetailEnhanced() {
  const { studentId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [assignedUniversities, setAssignedUniversities] = useState([]);
  const [selectedUni, setSelectedUni] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Split screen
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  
  // Correction dialog
  const [correctionDialog, setCorrectionDialog] = useState(false);
  const [documentToReject, setDocumentToReject] = useState(null);
  const [correctionMessage, setCorrectionMessage] = useState("");
  
  // Notes internes
  const [privateNotes, setPrivateNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

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
        setPrivateNotes(app.private_notes || "");
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
      
      if (action === "rejected" && feedback) {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
          await notificationHelpers.requestCorrection(
            student.id,
            doc.document_type.replace(/_/g, ' '),
            feedback
          );
        }
      }
      
      await loadData();
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const url = await documentHelpers.getDocumentUrl(doc.file_path);
      setDocumentUrl(url);
      setSelectedDocument(doc);
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Erreur lors de la visualisation");
    }
  };

  const handleRequestCorrection = (doc) => {
    setDocumentToReject(doc);
    setCorrectionMessage("");
    setCorrectionDialog(true);
  };

  const handleSendCorrectionRequest = async () => {
    if (!correctionMessage.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }

    try {
      await handleDocumentAction(documentToReject.id, "rejected", correctionMessage);
      setCorrectionDialog(false);
      setDocumentToReject(null);
      setCorrectionMessage("");
    } catch (error) {
      console.error("Error sending correction request:", error);
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleDownloadAll = async () => {
    toast.info("Téléchargement en cours...");
    try {
      // Pour chaque document, télécharger et créer un zip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const doc of documents) {
        try {
          const url = await documentHelpers.getDocumentUrl(doc.file_path);
          const response = await fetch(url);
          const blob = await response.blob();
          zip.file(doc.file_name, blob);
        } catch (err) {
          console.error(`Error downloading ${doc.file_name}:`, err);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${student.last_name}_${student.first_name}_Documents.zip`;
      link.click();
      toast.success("Documents téléchargés");
    } catch (error) {
      console.error("Error downloading all:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleSaveNotes = async () => {
    const app = student.applications?.[0];
    if (!app) return;

    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ private_notes: privateNotes })
        .eq('id', app.id);

      if (error) throw error;
      toast.success("Notes sauvegardées");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingNotes(false);
    }
  };

  const copyToClipboard = (text, label = "Texte") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  const getUrgencyColor = () => {
    if (assignedUniversities.length === 0) return "gray";
    
    const closestDeadline = assignedUniversities.reduce((closest, uni) => {
      const deadline = new Date(uni.universities.deadline);
      return !closest || deadline < closest ? deadline : closest;
    }, null);

    if (!closestDeadline) return "gray";

    const daysUntil = Math.ceil((closestDeadline - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 7) return "red";
    if (daysUntil < 30) return "orange";
    return "green";
  };

  const urgencyColor = getUrgencyColor();

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

  const status = STATUS_MAP[app?.status] || STATUS_MAP.Nouveau;

  return (
    <div className="min-h-screen" style={{ background: "#FDFBF7" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(253,251,247,0.95)", backdropFilter: "blur(16px)", borderColor: "#E2E4E7" }}>
        <div className="max-w-full mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6" style={{ color: "#1C3530" }} />
              <span className="text-lg font-bold" style={{ color: "#1C3530", fontFamily: "Chivo, sans-serif" }}>
                {student.first_name} {student.last_name}
              </span>
            </div>
            {/* Indicateur d'urgence */}
            <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}
              style={{ 
                backgroundColor: urgencyColor === "red" ? "#FEE2E2" : urgencyColor === "orange" ? "#FED7AA" : "#D1FAE5",
                color: urgencyColor === "red" ? "#DC2626" : urgencyColor === "orange" ? "#EA580C" : "#065F46"
              }}>
              <AlertCircle className="h-3 w-3" />
              {urgencyColor === "red" ? "URGENT" : urgencyColor === "orange" ? "À traiter" : "OK"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={app?.status || "Nouveau"} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-56 border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleDownloadAll} disabled={documents.length === 0} variant="outline" size="sm" className="rounded-full">
              <FileArchive className="h-4 w-4 mr-2" />
              Télécharger tout (.zip)
            </Button>
          </div>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Left Panel - Information */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Informations principales avec copy buttons */}
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
              Informations principales
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(formData).map(([key, value]) => {
                if (!value || typeof value === "object") return null;
                return (
                  <div key={key} className="group p-3 rounded-lg hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#525A61" }}>
                        {key.replace(/_/g, " ")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => copyToClipboard(value, key.replace(/_/g, " "))}
                      >
                        <Copy className="h-3 w-3" style={{ color: "#525A61" }} />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#1A2024" }}>
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Universités assignées */}
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
              Universités assignées ({assignedUniversities.length})
            </h3>

            {assignedUniversities.length > 0 && (
              <div className="space-y-2 mb-4">
                {assignedUniversities.map((uni) => {
                  const deadline = new Date(uni.universities.deadline);
                  const daysUntil = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={uni.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "#E2E4E7" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1A2024" }}>
                          {uni.universities.name}
                        </p>
                        <p className="text-xs" style={{ color: "#525A61" }}>
                          {uni.universities.city} • Deadline: {deadline.toLocaleDateString('fr-FR')} ({daysUntil}j)
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
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Select value={selectedUni} onValueChange={setSelectedUni}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Ajouter une université" />
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
              >
                <Plus className="h-4 w-4 mr-2" /> Assigner
              </Button>
            </div>
          </div>

          {/* Notes internes */}
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: "white", borderColor: "#E2E4E7" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
                <StickyNote className="h-5 w-5" />
                Notes internes (privées)
              </h3>
              <Button 
                onClick={handleSaveNotes} 
                disabled={savingNotes}
                size="sm"
                className="rounded-full"
              >
                {savingNotes ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
            <Textarea
              placeholder="Ex: A contacté l'université par mail le 12/03, réponse en attente. Profil un peu limite, privilégier université du Sud-Ouest..."
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              rows={6}
              className="w-full"
            />
            <p className="text-xs mt-2" style={{ color: "#525A61" }}>
              Ces notes ne sont visibles que par les administrateurs
            </p>
          </div>
        </div>

        {/* Right Panel - Documents Viewer (Split Screen) */}
        <div className="w-1/2 border-l" style={{ borderColor: "#E2E4E7", background: "#F8FAFC" }}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b" style={{ borderColor: "#E2E4E7", background: "white" }}>
              <h3 className="text-lg font-bold" style={{ color: "#1A2024", fontFamily: "Chivo, sans-serif" }}>
                Documents ({documents.length})
              </h3>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Document List */}
              <div className="w-1/3 overflow-y-auto border-r" style={{ borderColor: "#E2E4E7", background: "white" }}>
                {documents.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: "#CBD5E1" }} />
                    <p className="text-sm" style={{ color: "#525A61" }}>
                      Aucun document
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "#E2E4E7" }}>
                    {documents.map((doc) => {
                      const statusInfo = DOC_STATUS_MAP[doc.status] || DOC_STATUS_MAP.pending;
                      const Icon = statusInfo.icon;
                      const isSelected = selectedDocument?.id === doc.id;

                      return (
                        <div
                          key={doc.id}
                          className={`p-4 cursor-pointer hover:bg-slate-50 transition ${isSelected ? 'bg-slate-100' : ''}`}
                          onClick={() => handleViewDocument(doc)}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: "#1A2024" }}>
                                {doc.document_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs truncate" style={{ color: "#525A61" }}>
                                {doc.file_name}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                              style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                              <Icon className="h-3 w-3" />
                            </span>
                          </div>

                          {doc.status === "pending" && (
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDocumentAction(doc.id, "approved");
                                }}
                                className="flex-1 h-7 text-xs rounded-full text-white"
                                style={{ backgroundColor: "#166534" }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Valider
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestCorrection(doc);
                                }}
                                className="flex-1 h-7 text-xs rounded-full text-white"
                                style={{ backgroundColor: "#DC2626" }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" /> Rejeter
                              </Button>
                            </div>
                          )}

                          {doc.feedback && (
                            <p className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                              {doc.feedback}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Document Viewer */}
              <div className="flex-1 overflow-auto p-4">
                {selectedDocument && documentUrl ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold" style={{ color: "#1A2024" }}>
                          {selectedDocument.document_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs" style={{ color: "#525A61" }}>
                          {selectedDocument.file_name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(documentUrl, '_blank')}
                        className="rounded-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ouvrir
                      </Button>
                    </div>
                    <div className="flex-1 border rounded-lg overflow-hidden" style={{ borderColor: "#E2E4E7" }}>
                      {selectedDocument.content_type?.startsWith('image/') ? (
                        <img src={documentUrl} alt={selectedDocument.file_name} className="w-full h-full object-contain" />
                      ) : selectedDocument.content_type === 'application/pdf' ? (
                        <iframe src={documentUrl} className="w-full h-full" title={selectedDocument.file_name} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: "#CBD5E1" }} />
                            <p className="text-sm mb-4" style={{ color: "#525A61" }}>
                              Prévisualisation non disponible
                            </p>
                            <Button onClick={() => window.open(documentUrl, '_blank')} variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-16 w-16 mx-auto mb-4" style={{ color: "#CBD5E1" }} />
                      <p className="text-sm" style={{ color: "#525A61" }}>
                        Sélectionnez un document pour le visualiser
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogue de demande de correction avec templates */}
      <Dialog open={correctionDialog} onOpenChange={setCorrectionDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Demander une correction</DialogTitle>
            <DialogDescription>
              Sélectionnez un message pré-défini ou rédigez un message personnalisé
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#1A2024" }}>
                Document : {documentToReject?.document_type.replace(/_/g, ' ')}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#1A2024" }}>
                Messages rapides
              </label>
              <div className="flex flex-wrap gap-2">
                {REJECTION_TEMPLATES.map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setCorrectionMessage(template)}
                    className="text-xs"
                  >
                    {template.substring(0, 30)}...
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: "#1A2024" }}>
                Message de correction
              </label>
              <Textarea
                placeholder="Saisissez ou modifiez le message..."
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
