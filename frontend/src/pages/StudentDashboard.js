import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { StudentLayout } from "@/components/StudentLayout";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, CheckCircle2, Clock, AlertTriangle, ArrowRight, GraduationCap, Bell, Wrench, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_MAP = {
  Nouveau: { label: "Nouveau", desc: "Complétez votre formulaire et uploadez vos documents pour soumettre votre candidature.", step: 0, color: "#334155", bg: "#F1F5F9" },
  A_Verifier: { label: "En vérification", desc: "Votre dossier est en cours de vérification par notre équipe.", step: 1, color: "#92400E", bg: "#FEF3C7" },
  Correction_Requise: { label: "Correction requise", desc: "Des corrections sont nécessaires. Vérifiez vos documents et notifications.", step: 1, color: "#DC2626", bg: "#FEE2E2" },
  Pret_Soumission: { label: "Prêt pour soumission", desc: "Votre dossier est validé et sera soumis aux universités.", step: 2, color: "#3730A3", bg: "#E0E7FF" },
  Soumis: { label: "Soumis à l'université", desc: "Votre dossier a été envoyé aux universités. En attente de réponse.", step: 3, color: "#6B21A8", bg: "#F3E8FF" },
  Admis: { label: "Admis", desc: "Félicitations ! Vous avez été admis !", step: 4, color: "#065F46", bg: "#D1FAE5" },
};

const PROGRESS_STEPS = [
  { label: "Profil", icon: FileText },
  { label: "Vérification", icon: Clock },
  { label: "Soumission", icon: Send },
  { label: "Décision", icon: GraduationCap },
  { label: "Admis", icon: CheckCircle2 },
];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    
    try {
      // Charger l'application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (appError && appError.code !== 'PGRST116') throw appError;
      
      if (appData) {
        setApplication(appData);

        // Charger les universités assignées
        const { data: uniData, error: uniError } = await supabase
          .from('application_universities')
          .select('*, universities(*)')
          .eq('application_id', appData.id);

        if (uniError) throw uniError;
        setUniversities(uniData || []);
      }

      // Charger les notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifError) throw notifError;
      setNotifications(notifData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  const status = STATUS_MAP[application?.status] || STATUS_MAP.Nouveau;
  const currentStep = status.step;
  const completedSteps = application?.completed_steps || [];
  const formProgress = Math.round((completedSteps.length / 6) * 100);
  const unreadNotifs = notifications.filter(n => !n.read);
  const needsCorrection = application?.status === 'Correction_Requise';

  return (
    <StudentLayout>
      <div data-testid="student-dashboard" className="space-y-6">
        {/* Status Banner */}
        <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'white', borderColor: '#E2E4E7' }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: status.bg, color: status.color }}>
                {needsCorrection ? <AlertTriangle className="h-4 w-4" /> : currentStep >= 4 ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {status.label}
              </div>
              <p className="mt-3 text-sm" style={{ color: '#525A61' }}>{status.desc}</p>
            </div>
            {universities.length > 0 && (
              <div className="text-right">
                <p className="text-xs font-medium" style={{ color: '#525A61' }}>Universités assignées</p>
                {universities.map(uni => (
                  <p key={uni.id} className="text-sm font-semibold" style={{ color: '#1A2024' }}>{uni.universities.name}</p>
                ))}
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
        <div className="grid md:grid-cols-2 gap-6">
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
        </div>
      </div>
    </StudentLayout>
  );
}
