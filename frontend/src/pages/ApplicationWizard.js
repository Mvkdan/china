import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { applicationHelpers } from "@/lib/helpers";
import { StudentLayout } from "@/components/StudentLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, Save, CalendarIcon, Send } from "lucide-react";

const STEPS = [
  { id: "identity", label: "Identité", num: 1 },
  { id: "education", label: "Éducation", num: 2 },
  { id: "contacts", label: "Contacts", num: 3 },
  { id: "emergency_contact", label: "Urgence", num: 4 },
  { id: "financial_guarantor", label: "Garant", num: 5 },
  { id: "family", label: "Famille", num: 6 },
];

const COUNTRY_CODES = [
  { code: "+33", country: "France" },
  { code: "+225", country: "Côte d'Ivoire" },
  { code: "+237", country: "Cameroun" },
  { code: "+221", country: "Sénégal" },
  { code: "+223", country: "Mali" },
  { code: "+224", country: "Guinée" },
  { code: "+228", country: "Togo" },
  { code: "+229", country: "Bénin" },
  { code: "+226", country: "Burkina Faso" },
  { code: "+235", country: "Tchad" },
  { code: "+242", country: "Congo" },
  { code: "+243", country: "RD Congo" },
  { code: "+212", country: "Maroc" },
  { code: "+216", country: "Tunisie" },
  { code: "+213", country: "Algérie" },
  { code: "+261", country: "Madagascar" },
  { code: "+241", country: "Gabon" },
  { code: "+240", country: "Guinée Éq." },
  { code: "+222", country: "Mauritanie" },
  { code: "+227", country: "Niger" },
  { code: "+250", country: "Rwanda" },
  { code: "+257", country: "Burundi" },
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "Royaume-Uni" },
  { code: "+86", country: "Chine" },
  { code: "+49", country: "Allemagne" },
  { code: "+34", country: "Espagne" },
  { code: "+39", country: "Italie" },
  { code: "+32", country: "Belgique" },
  { code: "+41", country: "Suisse" },
];

function DatePickerField({ value, onChange, label, id }) {
  const [open, setOpen] = useState(false);
  const dateVal = value ? new Date(value) : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium" style={{ color: '#1A2024' }}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" data-testid={`date-picker-${id}`} className="w-full justify-start text-left font-normal border-slate-300 hover:border-[#1C3530]">
            <CalendarIcon className="mr-2 h-4 w-4" style={{ color: '#525A61' }} />
            {dateVal ? format(dateVal, "dd/MM/yyyy") : <span style={{ color: '#525A61' }}>Sélectionner une date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateVal}
            onSelect={(d) => { onChange(d ? d.toISOString().split("T")[0] : ""); setOpen(false); }}
            locale={fr}
            captionLayout="dropdown-buttons"
            fromYear={1950}
            toYear={2030}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function PhoneField({ codeValue, numberValue, onCodeChange, onNumberChange, codeTestId, numberTestId }) {
  return (
    <div className="flex gap-2">
      <div className="w-40 shrink-0">
        <Select value={codeValue || ""} onValueChange={onCodeChange}>
          <SelectTrigger data-testid={codeTestId} className="border-slate-300 focus:border-[#1C3530]">
            <SelectValue placeholder="Indicatif" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {COUNTRY_CODES.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.code} {c.country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        data-testid={numberTestId}
        placeholder="Numéro de téléphone"
        value={numberValue || ""}
        onChange={e => onNumberChange(e.target.value)}
        className="flex-1 border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]"
      />
    </div>
  );
}

function IdentityStep({ data, onChange }) {
  const d = data || {};
  const u = (key, val) => onChange({ ...d, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom (Passeport)</Label>
          <Input data-testid="identity-last-name" placeholder="Nom de famille" value={d.last_name || ""} onChange={e => u("last_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Prénom (Passeport)</Label>
          <Input data-testid="identity-first-name" placeholder="Prénom" value={d.first_name || ""} onChange={e => u("first_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Numéro de Passeport</Label>
          <Input data-testid="identity-passport-number" placeholder="N° Passeport" value={d.passport_number || ""} onChange={e => u("passport_number", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
        <DatePickerField id="passport_expiry" label="Date d'expiration du Passeport" value={d.passport_expiry} onChange={v => u("passport_expiry", v)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nationalité</Label>
          <Input data-testid="identity-nationality" placeholder="Nationalité" value={d.nationality || ""} onChange={e => u("nationality", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
        <DatePickerField id="date_of_birth" label="Date de naissance" value={d.date_of_birth} onChange={v => u("date_of_birth", v)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Sexe</Label>
          <Select value={d.gender || ""} onValueChange={v => u("gender", v)}>
            <SelectTrigger data-testid="identity-gender" className="border-slate-300 focus:border-[#1C3530]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculin">Masculin</SelectItem>
              <SelectItem value="Féminin">Féminin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>État matrimonial</Label>
          <Select value={d.marital_status || ""} onValueChange={v => u("marital_status", v)}>
            <SelectTrigger data-testid="identity-marital-status" className="border-slate-300 focus:border-[#1C3530]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Célibataire">Célibataire</SelectItem>
              <SelectItem value="Marié(e)">Marié(e)</SelectItem>
              <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function EducationStep({ data, onChange }) {
  const d = data || {};
  const u = (key, val) => onChange({ ...d, [key]: val });
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Dernier diplôme obtenu</Label>
        <Select value={d.highest_degree || ""} onValueChange={v => u("highest_degree", v)}>
          <SelectTrigger data-testid="education-degree" className="border-slate-300"><SelectValue placeholder="Sélectionner le diplôme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Baccalauréat">Baccalauréat</SelectItem>
            <SelectItem value="Licence">Licence (Bac+3)</SelectItem>
            <SelectItem value="Master">Master (Bac+5)</SelectItem>
            <SelectItem value="Doctorat">Doctorat</SelectItem>
            <SelectItem value="Autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom de l'établissement</Label>
        <Input data-testid="education-institution" placeholder="Nom de votre établissement" value={d.institution_name || ""} onChange={e => u("institution_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Niveau de Chinois</Label>
          <Select value={d.chinese_level || ""} onValueChange={v => u("chinese_level", v)}>
            <SelectTrigger data-testid="education-chinese-level" className="border-slate-300"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Débutant">Débutant</SelectItem>
              <SelectItem value="HSK 1">HSK 1</SelectItem>
              <SelectItem value="HSK 2">HSK 2</SelectItem>
              <SelectItem value="HSK 3">HSK 3</SelectItem>
              <SelectItem value="HSK 4">HSK 4</SelectItem>
              <SelectItem value="HSK 5">HSK 5</SelectItem>
              <SelectItem value="HSK 6">HSK 6</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Niveau d'Anglais</Label>
          <Select value={d.english_level || ""} onValueChange={v => u("english_level", v)}>
            <SelectTrigger data-testid="education-english-level" className="border-slate-300"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Débutant">Débutant</SelectItem>
              <SelectItem value="Intermédiaire">Intermédiaire</SelectItem>
              <SelectItem value="Avancé">Avancé</SelectItem>
              <SelectItem value="Courant">Courant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ContactsStep({ data, onChange }) {
  const d = data || {};
  const u = (key, val) => onChange({ ...d, [key]: val });
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Adresse actuelle</Label>
        <Input data-testid="contacts-current-address" placeholder="Adresse actuelle complète" value={d.current_address || ""} onChange={e => u("current_address", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Adresse permanente (pays d'origine)</Label>
        <Input data-testid="contacts-permanent-address" placeholder="Adresse dans votre pays d'origine" value={d.permanent_address || ""} onChange={e => u("permanent_address", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Téléphone</Label>
        <PhoneField
          codeValue={d.phone_code}
          numberValue={d.phone_number}
          onCodeChange={v => u("phone_code", v)}
          onNumberChange={v => u("phone_number", v)}
          codeTestId="contacts-phone-code"
          numberTestId="contacts-phone-number"
        />
      </div>
    </div>
  );
}

function EmergencyContactStep({ data, onChange }) {
  const d = data || {};
  const u = (key, val) => onChange({ ...d, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom</Label>
          <Input data-testid="emergency-last-name" placeholder="Nom de famille" value={d.last_name || ""} onChange={e => u("last_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Prénom</Label>
          <Input data-testid="emergency-first-name" placeholder="Prénom" value={d.first_name || ""} onChange={e => u("first_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Relation</Label>
        <Select value={d.relationship || ""} onValueChange={v => { u("relationship", v); if (v !== "Autre") onChange({ ...d, relationship: v, relationship_other: "" }); else u("relationship", v); }}>
          <SelectTrigger data-testid="emergency-relationship" className="border-slate-300"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Père">Père</SelectItem>
            <SelectItem value="Mère">Mère</SelectItem>
            <SelectItem value="Frère/Sœur">Frère/Sœur</SelectItem>
            <SelectItem value="Époux/Épouse">Époux/Épouse</SelectItem>
            <SelectItem value="Oncle/Tante">Oncle/Tante</SelectItem>
            <SelectItem value="Autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {d.relationship === "Autre" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Précisez la relation</Label>
          <Input data-testid="emergency-relationship-other" placeholder="Ex: Tuteur, Ami proche..." value={d.relationship_other || ""} onChange={e => u("relationship_other", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Téléphone</Label>
        <PhoneField
          codeValue={d.phone_code}
          numberValue={d.phone_number}
          onCodeChange={v => u("phone_code", v)}
          onNumberChange={v => u("phone_number", v)}
          codeTestId="emergency-phone-code"
          numberTestId="emergency-phone-number"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Email</Label>
        <Input data-testid="emergency-email" type="email" placeholder="Email" value={d.email || ""} onChange={e => u("email", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
      </div>
    </div>
  );
}

function FinancialGuarantorStep({ data, onChange }) {
  const d = data || {};
  const u = (key, val) => onChange({ ...d, [key]: val });
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom du garant</Label>
          <Input data-testid="guarantor-last-name" placeholder="Nom de famille" value={d.last_name || ""} onChange={e => u("last_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Prénom du garant</Label>
          <Input data-testid="guarantor-first-name" placeholder="Prénom" value={d.first_name || ""} onChange={e => u("first_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Relation avec le garant</Label>
          <Input data-testid="guarantor-relationship" placeholder="Ex: Père, Oncle, etc." value={d.relationship || ""} onChange={e => u("relationship", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Profession</Label>
          <Input data-testid="guarantor-profession" placeholder="Profession du garant" value={d.profession || ""} onChange={e => u("profession", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Téléphone</Label>
        <PhoneField
          codeValue={d.phone_code}
          numberValue={d.phone_number}
          onCodeChange={v => u("phone_code", v)}
          onNumberChange={v => u("phone_number", v)}
          codeTestId="guarantor-phone-code"
          numberTestId="guarantor-phone-number"
        />
      </div>
    </div>
  );
}

function FamilyStep({ data, onChange }) {
  const d = data || {};
  const u = (key, val) => onChange({ ...d, [key]: val });
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-3" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Père</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom du père</Label>
            <Input data-testid="family-father-last-name" placeholder="Nom de famille" value={d.father_last_name || ""} onChange={e => u("father_last_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Prénom du père</Label>
            <Input data-testid="family-father-first-name" placeholder="Prénom" value={d.father_first_name || ""} onChange={e => u("father_first_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Âge</Label>
            <Input data-testid="family-father-age" type="number" placeholder="Âge" value={d.father_age || ""} onChange={e => u("father_age", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Profession</Label>
            <Input data-testid="family-father-profession" placeholder="Profession" value={d.father_profession || ""} onChange={e => u("father_profession", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
        </div>
      </div>
      <div className="border-t pt-6" style={{ borderColor: '#E2E4E7' }}>
        <h4 className="font-semibold mb-3" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>Mère</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Nom de la mère</Label>
            <Input data-testid="family-mother-last-name" placeholder="Nom de famille" value={d.mother_last_name || ""} onChange={e => u("mother_last_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Prénom de la mère</Label>
            <Input data-testid="family-mother-first-name" placeholder="Prénom" value={d.mother_first_name || ""} onChange={e => u("mother_first_name", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Âge</Label>
            <Input data-testid="family-mother-age" type="number" placeholder="Âge" value={d.mother_age || ""} onChange={e => u("mother_age", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: '#1A2024' }}>Profession</Label>
            <Input data-testid="family-mother-profession" placeholder="Profession" value={d.mother_profession || ""} onChange={e => u("mother_profession", e.target.value)} className="border-slate-300 focus:border-[#1C3530] focus:ring-1 focus:ring-[#1C3530]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationWizard() {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [application, setApplication] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await applicationHelpers.getApplication(profile.id);
      setApplication(data);
      setFormData({
        identity: data?.identity || {},
        education: data?.education || {},
        contacts: data?.contacts || {},
        emergency_contact: data?.emergency_contact || {},
        financial_guarantor: data?.financial_guarantor || {},
        family: data?.family || {},
      });
    } catch (err) {
      console.error('Error loading application:', err);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveStep = async (stepId, data) => {
    setSaving(true);
    try {
      const updated = await applicationHelpers.updateStep(profile.id, stepId, data);
      setApplication(updated);
      toast.success("Étape sauvegardée");
    } catch (err) {
      console.error('Error saving step:', err);
      toast.error("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const step = STEPS[currentStep];
    await saveStep(step.id, formData[step.id]);
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };

  const handlePrev = () => { if (currentStep > 0) setCurrentStep(c => c - 1); };

  const handleSubmit = async () => {
    const step = STEPS[currentStep];
    await saveStep(step.id, formData[step.id]);
    setSubmitting(true);
    try {
      await applicationHelpers.submitApplication(profile.id);
      toast.success("Candidature soumise avec succès !");
      fetchData();
    } catch (err) {
      console.error('Error submitting application:', err);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStepData = (stepId, data) => {
    setFormData(prev => ({ ...prev, [stepId]: data }));
  };

  if (loading) return <StudentLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div></StudentLayout>;

  const canEdit = !application?.status || application?.status === "Nouveau" || application?.status === "Correction_Requise";
  const step = STEPS[currentStep];
  const completedSteps = application?.completed_steps || [];
  const allStepsComplete = STEPS.every(s => completedSteps.includes(s.id));

  const renderStep = () => {
    switch (step.id) {
      case "identity": return <IdentityStep data={formData.identity} onChange={d => updateStepData("identity", d)} />;
      case "education": return <EducationStep data={formData.education} onChange={d => updateStepData("education", d)} />;
      case "contacts": return <ContactsStep data={formData.contacts} onChange={d => updateStepData("contacts", d)} />;
      case "emergency_contact": return <EmergencyContactStep data={formData.emergency_contact} onChange={d => updateStepData("emergency_contact", d)} />;
      case "financial_guarantor": return <FinancialGuarantorStep data={formData.financial_guarantor} onChange={d => updateStepData("financial_guarantor", d)} />;
      case "family": return <FamilyStep data={formData.family} onChange={d => updateStepData("family", d)} />;
      default: return null;
    }
  };

  return (
    <StudentLayout>
      <div data-testid="application-wizard" className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-28 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: '#525A61' }}>Étapes</h3>
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = completedSteps.includes(s.id);
              return (
                <button
                  key={s.id}
                  data-testid={`wizard-step-${s.id}`}
                  onClick={() => { if (canEdit) setCurrentStep(i); }}
                  className={`wizard-step w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium ${isActive ? 'shadow-sm' : ''}`}
                  style={{
                    backgroundColor: isActive ? '#1C3530' : isDone ? '#F1F5F9' : 'transparent',
                    color: isActive ? 'white' : isDone ? '#166534' : '#525A61',
                  }}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-white/20' : isDone ? 'bg-green-100' : 'bg-slate-200'}`}
                    style={{ color: isActive ? 'white' : isDone ? '#166534' : '#525A61' }}>
                    {isDone && !isActive ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Form Area */}
        <div className="flex-1 min-w-0">
          {/* Mobile step indicator */}
          <div className="lg:hidden mb-6 flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = completedSteps.includes(s.id);
              return (
                <button key={s.id} onClick={() => { if (canEdit) setCurrentStep(i); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${isActive ? 'text-white' : ''}`}
                  style={{ backgroundColor: isActive ? '#1C3530' : isDone ? '#DCFCE7' : '#F1F5F9', color: isActive ? 'white' : isDone ? '#166534' : '#525A61' }}>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Form Card */}
          <div className="rounded-xl border bg-white shadow-sm p-8" style={{ borderColor: '#E2E4E7' }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#1A2024', fontFamily: 'Chivo, sans-serif' }}>
                {step.num}. {step.label}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#525A61' }}>Étape {step.num} sur {STEPS.length}</p>
            </div>

            {!canEdit && (
              <div className="mb-6 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                Votre candidature a déjà été soumise. Les modifications ne sont pas possibles à ce stade.
              </div>
            )}

            {renderStep()}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: '#E2E4E7' }}>
              <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0} data-testid="wizard-prev-btn" className="rounded-full border-slate-300">
                <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
              </Button>
              <div className="flex gap-3">
                {canEdit && (
                  <Button variant="outline" onClick={() => saveStep(step.id, formData[step.id])} disabled={saving} data-testid="wizard-save-btn" className="rounded-full border-slate-300">
                    <Save className="mr-1 h-4 w-4" /> {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                )}
                {currentStep < STEPS.length - 1 ? (
                  <Button onClick={handleNext} disabled={saving || !canEdit} data-testid="wizard-next-btn" className="rounded-full text-white" style={{ backgroundColor: '#1C3530' }}>
                    Suivant <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : canEdit && (!application?.status || application?.status === "Nouveau") ? (
                  <Button onClick={handleSubmit} disabled={submitting || !allStepsComplete} data-testid="wizard-submit-btn" className="rounded-full text-white" style={{ backgroundColor: '#C95B36' }}>
                    <Send className="mr-1 h-4 w-4" /> {submitting ? "Soumission..." : "Soumettre la candidature"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
