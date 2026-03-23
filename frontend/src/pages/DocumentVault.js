import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { StudentLayout } from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, XCircle, Clock, Download, Trash2, AlertCircle, Plus } from "lucide-react";

const SINGLE_DOCS = [
  { id: "passport_scan", label: "Scan du Passeport", desc: "Scan complet de votre passeport (pages d'identité)" },
  { id: "id_photo", label: "Photo d'identité (fond blanc)", desc: "Photo de format passeport sur fond blanc" },
  { id: "criminal_record", label: "Casier Judiciaire", desc: "Extrait de casier judiciaire récent" },
  { id: "medical_certificate", label: "Certificat Médical", desc: "Certificat médical valide" },
];

const BULLETIN_SECTIONS = [
  {
    title: "Bulletins de 2nde",
    docs: [
      { id: "bulletin_2nde_1", label: "1er trimestre" },
      { id: "bulletin_2nde_2", label: "2ème trimestre" },
      { id: "bulletin_2nde_3", label: "3ème trimestre" },
    ],
  },
  {
    title: "Bulletins de 1ère",
    docs: [
      { id: "bulletin_1ere_1", label: "1er trimestre" },
      { id: "bulletin_1ere_2", label: "2ème trimestre" },
      { id: "bulletin_1ere_3", label: "3ème trimestre" },
    ],
  },
  {
    title: "Bulletins de Terminale",
    docs: [
      { id: "bulletin_terminale_1", label: "1er trimestre" },
      { id: "bulletin_terminale_2", label: "2ème trimestre" },
      { id: "bulletin_terminale_3", label: "3ème trimestre" },
    ],
  },
];

const STATUS_ICONS = {
  Pending: { icon: Clock, color: "#92400E", bg: "#FEF3C7", label: "En attente" },
  Approved: { icon: CheckCircle2, color: "#166534", bg: "#DCFCE7", label: "Validé" },
  Rejected: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Rejeté" },
};

function DocStatusBadge({ status }) {
  const info = STATUS_ICONS[status];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: info.bg, color: info.color }}>
      <Icon className="h-3 w-3" />{info.label}
    </span>
  );
}

function SingleDocCard({ docType, doc, onUpload, onDownload, uploading }) {
  return (
    <div data-testid={`doc-card-${docType.id}`} className="rounded-xl border bg-white shadow-sm p-5" style={{ borderColor: '#E2E4E7' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: doc ? (STATUS_ICONS[doc.status]?.bg || '#F1F5F9') : '#F1F5F9' }}>
            <FileText className="h-6 w-6" style={{ color: doc ? (STATUS_ICONS[doc.status]?.color || '#334155') : '#525A61' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm" style={{ color: '#1A2024' }}>{docType.label}</h3>
            <p className="text-xs mt-0.5" style={{ color: '#525A61' }}>{docType.desc}</p>
            {doc && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <DocStatusBadge status={doc.status} />
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
            <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} data-testid={`doc-download-${docType.id}`} className="text-slate-500 hover:text-[#1C3530]">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <label data-testid={`doc-upload-${docType.id}`}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onUpload(docType.id, e.target.files[0])} />
            <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}
              style={{ backgroundColor: doc ? '#F1F5F9' : '#1C3530', color: doc ? '#334155' : 'white' }}>
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Upload..." : doc ? "Remplacer" : "Uploader"}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function DiplomaDocCard({ doc, onDownload, onDelete }) {
  return (
    <div data-testid={`diploma-doc-${doc.id}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border" style={{ borderColor: '#E2E4E7' }}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="h-5 w-5 shrink-0" style={{ color: STATUS_ICONS[doc.status]?.color || '#525A61' }} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1A2024' }}>{doc.original_filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <DocStatusBadge status={doc.status} />
          </div>
          {doc.status === "Rejected" && doc.feedback && (
            <p className="text-xs mt-1" style={{ color: '#DC2626' }}>Rejet : {doc.feedback}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} className="text-slate-500 hover:text-[#1C3530] h-8 w-8 p-0">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(doc)} className="text-slate-500 hover:text-red-600 h-8 w-8 p-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function BulletinSlot({ slotDef, doc, onUpload, onDownload, uploading }) {
  return (
    <div data-testid={`doc-card-${slotDef.id}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border" style={{ borderColor: '#E2E4E7', backgroundColor: doc ? 'white' : '#FAFAFA' }}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="h-5 w-5 shrink-0" style={{ color: doc ? (STATUS_ICONS[doc.status]?.color || '#525A61') : '#CBD5E1' }} />
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: '#1A2024' }}>{slotDef.label}</p>
          {doc ? (
            <div className="flex items-center gap-2 mt-0.5">
              <DocStatusBadge status={doc.status} />
              <span className="text-xs truncate" style={{ color: '#525A61' }}>{doc.original_filename}</span>
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#94A3B8' }}>Non uploadé</p>
          )}
          {doc?.status === "Rejected" && doc.feedback && (
            <p className="text-xs mt-1" style={{ color: '#DC2626' }}>Rejet : {doc.feedback}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {doc && (
          <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} className="text-slate-500 hover:text-[#1C3530] h-8 w-8 p-0">
            <Download className="h-4 w-4" />
          </Button>
        )}
        <label data-testid={`doc-upload-${slotDef.id}`}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onUpload(slotDef.id, e.target.files[0])} />
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}
            style={{ backgroundColor: doc ? '#F1F5F9' : '#1C3530', color: doc ? '#334155' : 'white' }}>
            <Upload className="h-3 w-3" />
            {uploading ? "..." : doc ? "Remplacer" : "Uploader"}
          </div>
        </label>
      </div>
    </div>
  );
}

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
      a.href = url; a.download = doc.original_filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer "${doc.original_filename}" ?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success("Document supprimé");
      fetchDocs();
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getDocForType = (typeId) => documents.find(d => d.doc_type === typeId);
  const diplomaDocs = documents.filter(d => d.doc_type === "diploma");

  const totalSingleUploaded = SINGLE_DOCS.filter(dt => getDocForType(dt.id)).length;
  const totalBulletinUploaded = BULLETIN_SECTIONS.reduce((acc, sec) => acc + sec.docs.filter(d => getDocForType(d.id)).length, 0);
  const totalUploaded = totalSingleUploaded + diplomaDocs.length + totalBulletinUploaded;

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  return (
    <StudentLayout>
      <div data-testid="document-vault" className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Coffre-fort Documents</h1>
            <p className="text-sm mt-1" style={{ color: '#525A61' }}>{totalUploaded} document{totalUploaded !== 1 ? "s" : ""} uploadé{totalUploaded !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Section 1: Pièces d'identité & Documents requis */}
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Pièces obligatoires</h2>
          <div className="grid gap-4">
            {SINGLE_DOCS.map(dt => (
              <SingleDocCard
                key={dt.id}
                docType={dt}
                doc={getDocForType(dt.id)}
                onUpload={handleUpload}
                onDownload={handleDownload}
                uploading={uploading[dt.id]}
              />
            ))}
          </div>
        </div>

        {/* Section 2: Diplômes (multiple) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
              Diplômes <span className="text-sm font-normal" style={{ color: '#525A61' }}>({diplomaDocs.length} uploadé{diplomaDocs.length !== 1 ? "s" : ""})</span>
            </h2>
            <label data-testid="doc-upload-diploma">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => handleUpload("diploma", e.target.files[0])} />
              <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold cursor-pointer text-white transition-colors ${uploading["diploma"] ? 'opacity-50' : ''}`}
                style={{ backgroundColor: '#1C3530' }}>
                <Plus className="h-3.5 w-3.5" />
                {uploading["diploma"] ? "Upload..." : "Ajouter un diplôme"}
              </div>
            </label>
          </div>
          {diplomaDocs.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-8 text-center" style={{ borderColor: '#CBD5E1', backgroundColor: '#FAFAFA' }}>
              <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: '#94A3B8' }} />
              <p className="text-sm font-medium" style={{ color: '#525A61' }}>Aucun diplôme uploadé</p>
              <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Vous pouvez uploader un ou plusieurs diplômes (PDF, JPG, PNG)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {diplomaDocs.map(doc => (
                <DiplomaDocCard key={doc.id} doc={doc} onDownload={handleDownload} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Bulletins scolaires */}
        <div>
          <h2 className="text-lg font-bold mb-1" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Bulletins scolaires</h2>
          <p className="text-xs mb-4" style={{ color: '#525A61' }}>Jusqu'à 9 bulletins : 2nde, 1ère et Terminale (3 trimestres chacun)</p>
          <div className="space-y-6">
            {BULLETIN_SECTIONS.map(section => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold mb-2 px-1" style={{ color: '#1C3530', fontFamily: 'Chivo, sans-serif' }}>{section.title}</h3>
                <div className="space-y-2">
                  {section.docs.map(slotDef => (
                    <BulletinSlot
                      key={slotDef.id}
                      slotDef={slotDef}
                      doc={getDocForType(slotDef.id)}
                      onUpload={handleUpload}
                      onDownload={handleDownload}
                      uploading={uploading[slotDef.id]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
