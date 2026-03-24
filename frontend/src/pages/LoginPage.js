import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#FDFBF7' }}>
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: '#1C3530', fontFamily: 'Chivo, sans-serif' }}>
              ChinaStudy
            </h1>
            <p className="mt-3 text-base" style={{ color: '#525A61' }}>
              Votre passerelle vers les universités chinoises
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#1A2024' }}>Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
                <Input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#1A2024' }}>Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#525A61' }} />
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full rounded-full text-white font-semibold py-5"
              style={{ backgroundColor: '#1C3530' }}
            >
              {loading ? <span className="animate-spin mr-2">⏳</span> : <LogIn className="mr-2 h-4 w-4" />}
              Se connecter
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#525A61' }}>
            Pas encore de compte ?{" "}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#C95B36' }} data-testid="goto-register-link">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Image */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/7102/notes-macbook-study-conference.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Étudiant"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(28,53,48,0.7) 0%, rgba(28,53,48,0.3) 100%)' }} />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-white text-2xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Simplifiez votre inscription dans les meilleures universités chinoises
          </p>
          <p className="text-white/80 mt-2 text-sm">
            Un formulaire simplifié, un suivi en temps réel, un accompagnement personnalisé.
          </p>
        </div>
      </div>
    </div>
  );
}
