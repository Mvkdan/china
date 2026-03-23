import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { StudentLayout } from "@/components/StudentLayout";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, CreditCard, CheckCircle2, Clock, AlertCircle, ArrowRight, GraduationCap, Bell, AlertTriangle, Send, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_MAP = {
  Nouveau: { label: "Nouveau", desc: "Complétez votre formulaire et uploadez vos documents pour soumettre votre candidature.", step: 0, color: "#334155", bg: "#F1F5F9" },
  A_Verifier: { label: "En vérification", desc: "Votre dossier est en cours de vérification par notre équipe.", step: 1, color: "#92400E", bg: "#FEF3C7" },
  Correction_Requise: { label: "Correction requise", desc: "Des corrections sont nécessaires. Vérifiez vos documents et notifications.", step: 1, color: "#DC2626", bg: "#FEE2E2" },
  Pret_Soumission: { label: "Prêt - Paiement requis", desc: "Votre dossier est validé ! Procédez au paiement pour finaliser.", step: 2, color: "#3730A3", bg: "#E0E7FF" },
  Paid: { label: "Payé", desc: "Paiement reçu. Nous préparons la soumission à l'université.", step: 3, color: "#166534", bg: "#DCFCE7" },
  Soumis: { label: "Soumis à l'université", desc: "Votre dossier a été envoyé à l'université. En attente de réponse.", step: 4, color: "#6B21A8", bg: "#F3E8FF" },
  Admis: { label: "Admis", desc: "Félicitations ! Vous avez été admis ! En attente du JW202.", step: 5, color: "#065F46", bg: "#D1FAE5" },
};

const PROGRESS_STEPS = [
  { label: "Profil", icon: FileText },
  { label: "Vérification", icon: Clock },
  { label: "Paiement", icon: CreditCard },
  { label: "Soumission", icon: Send },
  { label: "Décision", icon: GraduationCap },
  { label: "Admis", icon: CheckCircle2 },
];

export default function StudentDashboard() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/application").then(r => setApplication(r.data)).catch(() => {}),
      api.get("/notifications").then(r => setNotifications(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [api]);

  const markAllRead = async () => {
    await api.put("/notifications/read-all").catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  const status = STATUS_MAP[application?.status] || STATUS_MAP.Nouveau;
  const currentStep = status.step;
  const completedSteps = application?.completed_steps || [];
  const formProgress = Math.round((completedSteps.length / 6) * 100);
  const unreadNotifs = notifications.filter(n => !n.read);
  const canPay = application?.status === "Pret_Soumission";
  const isPaid = ["Paid", "Soumis", "Admis"].includes(application?.status);
  const needsCorrection = application?.status === "Correction_Requise";

  return (
    <StudentLayout>
      <div data-testid="student-dashboard" className="space-y-6">
        {/* Status Banner */}
        <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: status.bg, color: status.color }}>
                {needsCorrection ? <AlertTriangle className="h-4 w-4" /> : currentStep >= 5 ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {status.label}
              </div>
              <p className="mt-3 text-sm" style={{ color: '#525A61' }}>{status.desc}</p>
            </div>
            {application?.university && (
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: '#525A61' }}>Université assignée</p>
                <p className="text-sm font-semibold" style={{ color: '#1A2024' }}>{application.university?.name || "Non assignée"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        {unreadNotifs.length > 0 && (
          <div className="rounded-xl border p-4 shadow-sm" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" style={{ color: '#92400E' }} />
                <h3 className="text-sm font-bold" style={{ color: '#92400E' }}>{unreadNotifs.length} notification{unreadNotifs.length > 1 ? 's' : ''} non lue{unreadNotifs.length > 1 ? 's' : ''}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs" style={{ color: '#92400E' }} data-testid="mark-all-read">Tout marquer lu</Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {unreadNotifs.slice(0, 5).map(n => (
                <div key={n.id} className="text-xs p-2 rounded" style={{ background: 'white' }}>
                  <span className="font-semibold" style={{ color: '#1A2024' }}>{n.title}</span>
                  <span className="ml-2" style={{ color: '#525A61' }}>{n.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Progression de votre candidature</h2>
          <div className="flex items-center gap-0">
            {PROGRESS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCurrent ? 'ring-2 ring-offset-2' : ''}`}
                      style={{ backgroundColor: done ? '#1C3530' : '#E2E4E7', color: done ? 'white' : '#525A61', ringColor: isCurrent ? '#C95B36' : undefined }}
                      data-testid={`progress-step-${i}`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-center" style={{ color: done ? '#1A2024' : '#525A61' }}>{step.label}</span>
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 -mt-6" style={{ backgroundColor: i < currentStep ? '#1C3530' : '#E2E4E7' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: needsCorrection ? '#FCA5A5' : '#E2E4E7' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: needsCorrection ? '#DC2626' : '#1C3530' }}>
                {needsCorrection ? <Wrench className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-white" />}
              </div>
              <h3 className="font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>{needsCorrection ? 'Corrections' : 'Formulaire'}</h3>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#525A61' }}>Progression</span>
                <span className="font-semibold" style={{ color: '#1A2024' }}>{formProgress}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ backgroundColor: '#E2E4E7' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${formProgress}%`, backgroundColor: needsCorrection ? '#DC2626' : '#1C3530' }} />
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: '#525A61' }}>{completedSteps.length}/6 étapes complétées</p>
            <Button data-testid="goto-application-btn" onClick={() => navigate("/application")} className="w-full rounded-full text-white" style={{ backgroundColor: needsCorrection ? '#DC2626' : '#1C3530' }}>
              {needsCorrection ? "Corriger" : formProgress === 100 ? "Modifier" : "Continuer"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C95B36' }}>
                <Upload className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Documents</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#525A61' }}>Uploadez vos pièces justificatives obligatoires.</p>
            <Button data-testid="goto-documents-btn" onClick={() => navigate("/documents")} variant="outline" className="w-full rounded-full border-slate-300 hover:border-[#1C3530]">
              Gérer les documents <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: canPay ? '#3730A3' : '#E2E4E7' }}>
                <CreditCard className="h-5 w-5" style={{ color: canPay ? 'white' : '#525A61' }} />
              </div>
              <h3 className="font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Paiement</h3>
            </div>
            {canPay ? (
              <>
                <p className="text-sm mb-4" style={{ color: '#3730A3' }}>Dossier validé ! Procédez au paiement.</p>
                <Button data-testid="goto-payment-btn" onClick={() => navigate("/payment")} className="w-full rounded-full text-white" style={{ backgroundColor: '#C95B36' }}>
                  Payer maintenant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: '#525A61' }}>{isPaid ? "Paiement effectué" : "Sera débloqué après validation."}</p>
                <Button disabled variant="outline" className="w-full rounded-full" data-testid="payment-locked-btn">
                  {isPaid ? <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Payé</> : <><AlertCircle className="mr-2 h-4 w-4" /> Non disponible</>}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
