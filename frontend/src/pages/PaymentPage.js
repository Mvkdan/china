import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { StudentLayout } from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { CreditCard, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

export default function PaymentPage() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const sessionId = searchParams.get("session_id");

  const fetchApp = useCallback(async () => {
    try {
      const res = await api.get("/application");
      setApplication(res.data);
    } catch (err) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  // Poll payment status if returning from Stripe
  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;
    const maxAttempts = 8;
    setPolling(true);

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPolling(false);
        toast.error("Vérification du paiement expirée. Rechargez la page.");
        return;
      }
      try {
        const res = await api.get(`/payments/status/${sessionId}`);
        if (res.data.payment_status === "paid") {
          setPolling(false);
          toast.success("Paiement confirmé !");
          fetchApp();
          return;
        }
      } catch (err) {
        // continue polling
      }
      attempts++;
      setTimeout(poll, 2500);
    };
    poll();
  }, [sessionId, api, fetchApp]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const origin = window.location.origin;
      const res = await api.post("/payments/create-session", { origin_url: origin });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la création du paiement");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  const isPaid = ["Paid", "Submitted_to_Uni", "Accepted"].includes(application?.status);
  const canPay = application?.status === "Awaiting_Payment";

  return (
    <StudentLayout>
      <div data-testid="payment-page" className="max-w-lg mx-auto">
        <div className="rounded-xl border bg-white shadow-sm p-8" style={{ borderColor: '#E2E4E7' }}>
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}
              style={{ backgroundColor: isPaid ? '#DCFCE7' : canPay ? '#E0E7FF' : '#F1F5F9' }}>
              {isPaid ? <CheckCircle2 className="h-8 w-8" style={{ color: '#166534' }} /> :
               canPay ? <CreditCard className="h-8 w-8" style={{ color: '#3730A3' }} /> :
               <AlertCircle className="h-8 w-8" style={{ color: '#525A61' }} />}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
              {isPaid ? "Paiement confirmé" : canPay ? "Paiement des frais de dossier" : "Paiement non disponible"}
            </h1>
          </div>

          {polling && (
            <div className="flex items-center justify-center gap-2 py-4 mb-6 rounded-lg" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Vérification du paiement en cours...</span>
            </div>
          )}

          {isPaid && (
            <div className="text-center">
              <p className="text-sm" style={{ color: '#525A61' }}>
                Votre paiement a été reçu. Votre dossier est en cours de traitement.
              </p>
            </div>
          )}

          {canPay && !polling && (
            <>
              <div className="border rounded-lg p-4 mb-6" style={{ borderColor: '#E2E4E7' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#525A61' }}>Frais de dossier</span>
                  <span className="text-2xl font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>500,00 EUR</span>
                </div>
              </div>
              <Button
                data-testid="pay-now-button"
                onClick={handlePay}
                disabled={paying}
                className="w-full rounded-full text-white py-5 text-base font-semibold"
                style={{ backgroundColor: '#C95B36' }}
              >
                {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                {paying ? "Redirection vers Stripe..." : "Payer maintenant"}
              </Button>
              <p className="text-xs text-center mt-4" style={{ color: '#525A61' }}>
                Paiement sécurisé par Stripe. Cartes bancaires acceptées.
              </p>
            </>
          )}

          {!isPaid && !canPay && !polling && (
            <div className="text-center">
              <p className="text-sm" style={{ color: '#525A61' }}>
                Le paiement sera débloqué une fois vos documents validés par notre équipe.
              </p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
