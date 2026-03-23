import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { StudentLayout } from "@/components/StudentLayout";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, CreditCard, CheckCircle2, Clock, AlertCircle, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_MAP = {
  Draft: { label: "Brouillon", desc: "Complétez votre profil et uploadez vos documents", step: 0, color: "#334155", bg: "#F1F5F9" },
  Pending_Review: { label: "En attente de vérification", desc: "Votre dossier est en cours de vérification par notre équipe", step: 1, color: "#92400E", bg: "#FEF3C7" },
  Awaiting_Payment: { label: "Paiement requis", desc: "Vos documents sont validés. Procédez au paiement.", step: 2, color: "#3730A3", bg: "#E0E7FF" },
  Paid: { label: "Payé", desc: "Paiement reçu. Nous envoyons votre dossier à l'université.", step: 3, color: "#166534", bg: "#DCFCE7" },
  Submitted_to_Uni: { label: "Soumis à l'université", desc: "Votre dossier a été envoyé à l'université choisie.", step: 4, color: "#6B21A8", bg: "#F3E8FF" },
  Accepted: { label: "Admis", desc: "Félicitations ! Vous avez été accepté !", step: 5, color: "#065F46", bg: "#D1FAE5" },
};

const PROGRESS_STEPS = [
  { label: "Profil", icon: FileText },
  { label: "Vérification", icon: Clock },
  { label: "Paiement", icon: CreditCard },
  { label: "Soumis", icon: Upload },
  { label: "Décision", icon: GraduationCap },
  { label: "Admis", icon: CheckCircle2 },
];

export default function StudentDashboard() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/application").then(r => setApplication(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  const status = STATUS_MAP[application?.status] || STATUS_MAP.Draft;
  const currentStep = status.step;
  const completedSteps = application?.completed_steps || [];
  const formProgress = Math.round((completedSteps.length / 7) * 100);

  return (
    <StudentLayout>
      <div data-testid="student-dashboard" className="space-y-8">
        {/* Status Banner */}
        <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: status.bg, color: status.color }}>
                {currentStep >= 5 ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {status.label}
              </div>
              <p className="mt-3 text-sm" style={{ color: '#525A61' }}>{status.desc}</p>
            </div>
            {application?.university && (
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: '#525A61' }}>Université choisie</p>
                <p className="text-sm font-semibold" style={{ color: '#1A2024' }}>{application.university?.name || "—"}</p>
              </div>
            )}
          </div>
        </div>

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
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCurrent ? 'ring-2 ring-offset-2' : ''}`}
                      style={{
                        backgroundColor: done ? '#1C3530' : '#E2E4E7',
                        color: done ? 'white' : '#525A61',
                        ringColor: isCurrent ? '#C95B36' : undefined,
                      }}
                      data-testid={`progress-step-${i}`}
                    >
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
          {/* Form Card */}
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1C3530' }}>
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Formulaire</h3>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: '#525A61' }}>Progression</span>
                <span className="font-semibold" style={{ color: '#1A2024' }}>{formProgress}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ backgroundColor: '#E2E4E7' }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${formProgress}%`, backgroundColor: '#1C3530' }} />
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: '#525A61' }}>{completedSteps.length}/7 étapes complétées</p>
            <Button data-testid="goto-application-btn" onClick={() => navigate("/application")} className="w-full rounded-full text-white" style={{ backgroundColor: '#1C3530' }}>
              {formProgress === 100 ? "Modifier" : "Continuer"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Documents Card */}
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C95B36' }}>
                <Upload className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Documents</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#525A61' }}>
              Uploadez vos pièces justificatives obligatoires (passeport, photo, diplôme, etc.)
            </p>
            <Button data-testid="goto-documents-btn" onClick={() => navigate("/documents")} variant="outline" className="w-full rounded-full border-slate-300 hover:border-[#1C3530]">
              Gérer les documents <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Payment Card */}
          <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: application?.status === "Awaiting_Payment" ? '#3730A3' : '#E2E4E7' }}>
                <CreditCard className="h-5 w-5" style={{ color: application?.status === "Awaiting_Payment" ? 'white' : '#525A61' }} />
              </div>
              <h3 className="font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Paiement</h3>
            </div>
            {application?.status === "Awaiting_Payment" ? (
              <>
                <p className="text-sm mb-4" style={{ color: '#3730A3' }}>Vos documents sont validés. Procédez au paiement pour finaliser.</p>
                <Button data-testid="goto-payment-btn" onClick={() => navigate("/payment")} className="w-full rounded-full text-white" style={{ backgroundColor: '#C95B36' }}>
                  Payer maintenant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: '#525A61' }}>
                  {["Paid", "Submitted_to_Uni", "Accepted"].includes(application?.status) ? "Paiement effectué" : "Le paiement sera débloqué après validation de vos documents."}
                </p>
                <Button disabled variant="outline" className="w-full rounded-full" data-testid="payment-locked-btn">
                  {["Paid", "Submitted_to_Uni", "Accepted"].includes(application?.status) ? (
                    <><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Payé</>
                  ) : (
                    <><AlertCircle className="mr-2 h-4 w-4" /> Non disponible</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
