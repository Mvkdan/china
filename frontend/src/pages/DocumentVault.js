import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { StudentLayout } from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, XCircle, Clock, Download, Trash2, AlertCircle } from "lucide-react";

const DOC_TYPES = [
  { id: "passport_scan", label: "Scan du Passeport", desc: "Scan complet de votre passeport (pages d'identité)" },
  { id: "id_photo", label: "Photo d'identité (fond blanc)", desc: "Photo de format passeport sur fond blanc" },
  { id: "diploma", label: "Diplôme", desc: "Copie de votre dernier diplôme obtenu" },
  { id: "transcripts", label: "Relevés de notes", desc: "Relevés de notes de vos études" },
  { id: "criminal_record", label: "Casier Judiciaire", desc: "Extrait de casier judiciaire récent" },
  { id: "medical_certificate", label: "Certificat Médical", desc: "Certificat médical valide" },
];

const STATUS_ICONS = {
  Pending: { icon: Clock, color: "#92400E", bg: "#FEF3C7", label: "En attente" },
  Approved: { icon: CheckCircle2, color: "#166534", bg: "#DCFCE7", label: "Validé" },
  Rejected: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Rejeté" },
};

export default function DocumentVault() {
  const { api } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get("/documents");
      setDocuments(res.data);
    } catch (err) {
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (docType, file) => {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PDF, JPG ou PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo.");
      return;
    }

    setUploading(prev => ({ ...prev, [docType]: true }));
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);

    try {
      await api.post("/documents/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploadé avec succès");
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'upload");
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.original_filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const getDocForType = (typeId) => documents.find(d => d.doc_type === typeId);
  const uploadedCount = DOC_TYPES.filter(dt => getDocForType(dt.id)).length;

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  return (
    <StudentLayout>
      <div data-testid="document-vault" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Coffre-fort Documents</h1>
            <p className="text-sm mt-1" style={{ color: '#525A61' }}>{uploadedCount}/{DOC_TYPES.length} documents uploadés</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: uploadedCount === DOC_TYPES.length ? '#DCFCE7' : '#FEF3C7', color: uploadedCount === DOC_TYPES.length ? '#166534' : '#92400E' }}>
            {uploadedCount === DOC_TYPES.length ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {uploadedCount === DOC_TYPES.length ? "Tous les documents uploadés" : "Documents manquants"}
          </div>
        </div>

        <div className="grid gap-4">
          {DOC_TYPES.map(dt => {
            const doc = getDocForType(dt.id);
            const statusInfo = doc ? STATUS_ICONS[doc.status] : null;
            const isUploading = uploading[dt.id];

            return (
              <div key={dt.id} data-testid={`doc-card-${dt.id}`} className="rounded-xl border bg-white shadow-sm p-5" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: doc ? (statusInfo?.bg || '#F1F5F9') : '#F1F5F9' }}>
                      <FileText className="h-6 w-6" style={{ color: doc ? (statusInfo?.color || '#334155') : '#525A61' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm" style={{ color: '#1A2024' }}>{dt.label}</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#525A61' }}>{dt.desc}</p>
                      {doc && (
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusInfo?.bg, color: statusInfo?.color }}>
                            {statusInfo && <statusInfo.icon className="h-3 w-3" />}
                            {statusInfo?.label}
                          </span>
                          <span className="text-xs" style={{ color: '#525A61' }}>{doc.original_filename}</span>
                        </div>
                      )}
                      {doc?.status === "Rejected" && doc.feedback && (
                        <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                          Motif du rejet : {doc.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc && (
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} data-testid={`doc-download-${dt.id}`} className="text-slate-500 hover:text-[#1C3530]">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <label data-testid={`doc-upload-${dt.id}`}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleUpload(dt.id, e.target.files[0])} />
                      <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors ${isUploading ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: doc ? '#F1F5F9' : '#1C3530', color: doc ? '#334155' : 'white' }}>
                        <Upload className="h-3.5 w-3.5" />
                        {isUploading ? "Upload..." : doc ? "Remplacer" : "Uploader"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
}
