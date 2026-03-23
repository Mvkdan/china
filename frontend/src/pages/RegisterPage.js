import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères"); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.firstName, form.lastName);
      toast.success("Compte créé avec succès !");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      {/* Left: Image */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/28396975/pexels-photo-28396975.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Université"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(28,53,48,0.7) 0%, rgba(28,53,48,0.3) 100%)' }} />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-white text-2xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Rejoignez des milliers d'étudiants qui ont choisi la Chine
          </p>
          <p className="text-white/80 mt-2 text-sm">
            Inscription simplifiée en quelques étapes.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#FDFBF7' }}>
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: '#1C3530', fontFamily: 'Chivo, sans-serif' }}>
              Créer un compte
            </h1>
            <p className="mt-3 text-base" style={{ color: '#525A61' }}>
              Commencez votre candidature pour les universités chinoises
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium" style={{ color: '#1A2024' }}>Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
                  <Input id="firstName" data-testid="register-firstname-input" placeholder="Prénom" value={form.firstName} onChange={e => update('firstName', e.target.value)} className="pl-10 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom</Label>
                <Input id="lastName" data-testid="register-lastname-input" placeholder="Nom" value={form.lastName} onChange={e => update('lastName', e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#1A2024' }}>Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
                <Input id="email" data-testid="register-email-input" type="email" placeholder="vous@exemple.com" value={form.email} onChange={e => update('email', e.target.value)} className="pl-10 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#1A2024' }}>Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
                <Input id="password" data-testid="register-password-input" type="password" placeholder="Minimum 6 caractères" value={form.password} onChange={e => update('password', e.target.value)} className="pl-10 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" required />
              </div>
            </div>

            <Button type="submit" data-testid="register-submit-button" disabled={loading} className="w-full rounded-full text-white font-semibold py-5" style={{ backgroundColor: '#1C3530' }}>
              {loading ? <span className="animate-spin mr-2">...</span> : <UserPlus className="mr-2 h-4 w-4" />}
              Créer mon compte
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#525A61' }}>
            Déjà inscrit ?{" "}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#C95B36' }} data-testid="goto-login-link">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
