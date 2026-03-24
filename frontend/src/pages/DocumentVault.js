import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { documentHelpers, applicationHelpers } from "@/lib/helpers";
import { StudentLayout } from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, XCircle, Clock, Trash2, Eye } from "lucide-react";

const DOCUMENT_TYPES = [
  { id: "passport_scan", label: "Scan du Passeport", multiple: false },
  { id: "id_photo", label: "Photo d'identité (fond blanc)", multiple: false },
  { id: "diploma", label: "Diplôme", multiple: true },
  { id: "bulletin_2nde_1", label: "Bulletin 2nde - 1er trimestre", multiple: false },
  { id: "bulletin_2nde_2", label: "Bulletin 2nde - 2ème trimestre", multiple: false },
  { id: "bulletin_2nde_3", label: "Bulletin 2nde - 3ème trimestre", multiple: false },
  { id: "bulletin_1ere_1", label: "Bulletin 1ère - 1er trimestre", multiple: false },
  { id: "bulletin_1ere_2", label: "Bulletin 1ère - 2ème trimestre", multiple: false },
  { id: "bulletin_1ere_3", label: "Bulletin 1ère - 3ème trimestre", multiple: false },
  { id: "bulletin_terminale_1", label: "Bulletin Terminale - 1er trimestre", multiple: false },
  { id: "bulletin_terminale_2", label: "Bulletin Terminale - 2ème trimestre", multiple: false },
  { id: "bulletin_terminale_3", label: "Bulletin Terminale - 3ème trimestre", multiple: false },
  { id: "criminal_record", label: "Casier Judiciaire", multiple: false },
  { id: "medical_certificate", label: "Certificat Médical", multiple: false },
];

const STATUS_ICONS = {
  pending: { icon: Clock, color: '#92400E', bg: '#FEF3C7', label: 'En attente' },
  approved: { icon: CheckCircle2, color: '#166534', bg: '#DCFCE7', label: 'Approuvé' },
  rejected: { icon: XCircle, color: '#DC2626', bg: '#FEE2E2', label: 'Rejeté' },
};

export default function DocumentVault() {
  const { profile } = useAuth();
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    try {
      const app = await applicationHelpers.getApplication(profile.id);
      setApplication(app);
      
      if (app) {
        const docs = await documentHelpers.getDocuments(app.id);
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docType, file) => {
    if (!application) {
      toast.error("Application non trouvée");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Le fichier est trop volumineux (max 10MB)");
      return;
    }

    setUploading(docType);
    try {
      await documentHelpers.uploadDocument(profile.id, application.id, file, docType);
      toast.success("Document uploadé avec succès");
      await loadData();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;
    
    try {
      await documentHelpers.deleteDocument(doc.id, doc.file_path);
      toast.success("Document supprimé");
      await loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleView = async (doc) => {
    try {
      const url = await documentHelpers.getDocumentUrl(doc.file_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error("Erreur lors de la visualisation");
    }
  };

  const getDocsForType = (typeId) => {
    return documents.filter(d => d.document_type === typeId);
  };

  const canEdit = !application?.status || application?.status === "Nouveau" || application?.status === "Correction_Requise";

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div data-testid="document-vault" className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
            Mes Documents
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#525A61' }}>
            Uploadez tous les documents requis pour votre candidature
          </p>
        </div>

        {!canEdit && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            Votre candidature a été soumise. Vous ne pouvez plus modifier vos documents sauf si un admin demande des corrections.
          </div>
        )}

        <div className="space-y-4">
          {DOCUMENT_TYPES.map((docType) => {
            const existingDocs = getDocsForType(docType.id);
            const hasDoc = existingDocs.length > 0;
            const isUploading = uploading === docType.id;

            return (
              <div key={docType.id} className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1" style={{ color: '#1A2024' }}>
                      {docType.label}
                    </h3>
                    {docType.multiple && (
                      <p className="text-xs mb-2" style={{ color: '#525A61' }}>
                        Vous pouvez uploader plusieurs fichiers
                      </p>
                    )}

                    {/* Liste des documents existants */}
                    {existingDocs.map((doc) => {
                      const statusInfo = STATUS_ICONS[doc.status] || STATUS_ICONS.pending;
                      const Icon = statusInfo.icon;

                      return (
                        <div key={doc.id} className="mt-3 p-3 rounded-lg border" style={{ borderColor: '#E2E4E7' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 shrink-0" style={{ color: '#525A61' }} />
                              <span className="text-sm truncate" style={{ color: '#1A2024' }}>{doc.file_name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                <Icon className="h-3 w-3" />
                                {statusInfo.label}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(doc)}
                                className="h-8 w-8 p-0"
                                data-testid={`view-doc-${doc.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && doc.status !== 'approved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(doc)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  data-testid={`delete-doc-${doc.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {doc.feedback && doc.status === 'rejected' && (
                            <div className="mt-2 text-xs p-2 rounded" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                              <strong>Feedback:</strong> {doc.feedback}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bouton Upload */}
                  {(canEdit && (docType.multiple || !hasDoc)) && (
                    <div>
                      <input
                        type="file"
                        id={`file-${docType.id}`}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleUpload(docType.id, file);
                          e.target.value = '';
                        }}
                        disabled={isUploading}
                      />
                      <label htmlFor={`file-${docType.id}`}>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          data-testid={`upload-${docType.id}`}
                          className="rounded-full border-slate-300 hover:border-[#1C3530] cursor-pointer"
                        >
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {isUploading ? "Upload..." : hasDoc ? "Remplacer" : "Uploader"}
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}
