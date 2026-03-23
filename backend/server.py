from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Header, Query, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import zipfile
import csv
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
import requests
from fpdf import FPDF
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret')
APP_FEE = float(os.environ.get('APP_FEE', '500.00'))

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "china-study-platform"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Universities list with deadlines
UNIVERSITIES = [
    {"id": "blcu", "name": "Beijing Language and Culture University (BLCU)", "city": "Beijing", "deadline": "2026-06-15"},
    {"id": "shanghai", "name": "Shanghai University", "city": "Shanghai", "deadline": "2026-05-30"},
    {"id": "fudan", "name": "Fudan University", "city": "Shanghai", "deadline": "2026-05-15"},
    {"id": "peking", "name": "Peking University", "city": "Beijing", "deadline": "2026-04-30"},
    {"id": "tsinghua", "name": "Tsinghua University", "city": "Beijing", "deadline": "2026-05-01"},
    {"id": "zhejiang", "name": "Zhejiang University", "city": "Hangzhou", "deadline": "2026-06-01"},
    {"id": "wuhan", "name": "Wuhan University", "city": "Wuhan", "deadline": "2026-06-30"},
    {"id": "sun_yatsen", "name": "Sun Yat-sen University", "city": "Guangzhou", "deadline": "2026-06-15"},
    {"id": "nanjing", "name": "Nanjing University", "city": "Nanjing", "deadline": "2026-05-31"},
    {"id": "sichuan", "name": "Sichuan University", "city": "Chengdu", "deadline": "2026-07-15"},
]

DOCUMENT_TYPES = [
    {"id": "passport_scan", "label": "Scan du Passeport", "multiple": False, "group": "identity"},
    {"id": "id_photo", "label": "Photo d'identité (fond blanc)", "multiple": False, "group": "identity"},
    {"id": "diploma", "label": "Diplôme", "multiple": True, "group": "diplomas"},
    {"id": "bulletin_2nde_1", "label": "Bulletin 2nde - 1er trimestre", "multiple": False, "group": "bulletins_2nde"},
    {"id": "bulletin_2nde_2", "label": "Bulletin 2nde - 2ème trimestre", "multiple": False, "group": "bulletins_2nde"},
    {"id": "bulletin_2nde_3", "label": "Bulletin 2nde - 3ème trimestre", "multiple": False, "group": "bulletins_2nde"},
    {"id": "bulletin_1ere_1", "label": "Bulletin 1ère - 1er trimestre", "multiple": False, "group": "bulletins_1ere"},
    {"id": "bulletin_1ere_2", "label": "Bulletin 1ère - 2ème trimestre", "multiple": False, "group": "bulletins_1ere"},
    {"id": "bulletin_1ere_3", "label": "Bulletin 1ère - 3ème trimestre", "multiple": False, "group": "bulletins_1ere"},
    {"id": "bulletin_terminale_1", "label": "Bulletin Terminale - 1er trimestre", "multiple": False, "group": "bulletins_terminale"},
    {"id": "bulletin_terminale_2", "label": "Bulletin Terminale - 2ème trimestre", "multiple": False, "group": "bulletins_terminale"},
    {"id": "bulletin_terminale_3", "label": "Bulletin Terminale - 3ème trimestre", "multiple": False, "group": "bulletins_terminale"},
    {"id": "criminal_record", "label": "Casier Judiciaire", "multiple": False, "group": "other"},
    {"id": "medical_certificate", "label": "Certificat Médical", "multiple": False, "group": "other"},
]

APPLICATION_STATUSES = ["Nouveau", "A_Verifier", "Correction_Requise", "Pret_Soumission", "Paid", "Soumis", "Admis"]

CANNED_RESPONSES = [
    {"id": "passport_cut", "label": "Passeport coupé", "text": "Le scan du passeport est coupé, merci de reprendre une photo entière montrant toutes les informations."},
    {"id": "photo_blur", "label": "Photo floue", "text": "La photo est floue ou de mauvaise qualité. Merci de fournir une photo nette sur fond blanc."},
    {"id": "photo_background", "label": "Fond non blanc", "text": "La photo d'identité doit être prise sur un fond blanc uni. Merci de la refaire."},
    {"id": "criminal_old", "label": "Casier ancien", "text": "Le casier judiciaire doit dater de moins de 6 mois. Merci de fournir un document récent."},
    {"id": "medical_stamp", "label": "Certificat sans tampon", "text": "Le certificat médical manque le tampon officiel de l'hôpital. Merci de faire tamponner le document."},
    {"id": "diploma_unreadable", "label": "Diplôme illisible", "text": "Le scan du diplôme est illisible. Merci de scanner à nouveau en haute résolution."},
    {"id": "transcript_incomplete", "label": "Bulletin incomplet", "text": "Le bulletin scolaire est incomplet ou partiellement coupé. Merci de fournir le document complet."},
    {"id": "wrong_format", "label": "Mauvais format", "text": "Le document n'est pas au bon format. Merci de le fournir en PDF ou image (JPG/PNG)."},
    {"id": "missing_translation", "label": "Traduction manquante", "text": "Ce document nécessite une traduction certifiée en anglais ou en chinois."},
]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── Auth helpers ──
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return user

# ── Pydantic Models ──
class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ApplicationUpdate(BaseModel):
    step: str
    data: dict

class DocumentStatusUpdate(BaseModel):
    status: str
    feedback: Optional[str] = None

class StudentStatusUpdate(BaseModel):
    status: str

class PaymentRequest(BaseModel):
    origin_url: str

# ── Auth Routes ──
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Un compte avec cet email existe déjà")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "role": "student",
        "first_name": req.first_name,
        "last_name": req.last_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    # Create empty application
    application = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "identity": {},
        "education": {},
        "contacts": {},
        "emergency_contact": {},
        "financial_guarantor": {},
        "family": {},
        "university": None,
        "status": "Nouveau",
        "completed_steps": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.applications.insert_one(application)
    token = create_token(user_id, "student")
    return {"token": token, "user": {"id": user_id, "email": req.email.lower(), "role": "student", "first_name": req.first_name, "last_name": req.last_name}}

# ── Admin University Assignment ──
class UniversityAssignment(BaseModel):
    university_id: str
    university_name: str
    university_city: str

@api_router.put("/admin/students/{student_id}/university")
async def assign_university(student_id: str, assignment: UniversityAssignment, admin=Depends(require_admin)):
    app_data = await db.applications.find_one({"user_id": student_id})
    if not app_data:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    university = {"id": assignment.university_id, "name": assignment.university_name, "city": assignment.university_city}
    await db.applications.update_one(
        {"user_id": student_id},
        {"$set": {"university": university, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Université assignée avec succès", "university": university}

# ── Delete document ──
@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    if doc["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    await db.documents.delete_one({"id": doc_id})
    return {"message": "Document supprimé"}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "role": user["role"], "first_name": user.get("first_name", ""), "last_name": user.get("last_name", "")}}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "role": user["role"], "first_name": user.get("first_name", ""), "last_name": user.get("last_name", "")}

# ── Application Routes ──
@api_router.get("/application")
async def get_application(user=Depends(get_current_user)):
    app_data = await db.applications.find_one({"user_id": user["id"]}, {"_id": 0})
    if not app_data:
        raise HTTPException(status_code=404, detail="Aucune candidature trouvée")
    return app_data

@api_router.put("/application")
async def update_application(update: ApplicationUpdate, user=Depends(get_current_user)):
    app_data = await db.applications.find_one({"user_id": user["id"]})
    if not app_data:
        raise HTTPException(status_code=404, detail="Aucune candidature trouvée")
    if app_data["status"] not in ["Nouveau", "Correction_Requise"]:
        raise HTTPException(status_code=400, detail="La candidature ne peut plus être modifiée à ce stade")
    
    valid_steps = ["identity", "education", "contacts", "emergency_contact", "financial_guarantor", "family"]
    if update.step not in valid_steps:
        raise HTTPException(status_code=400, detail=f"Étape invalide: {update.step}")
    
    completed_steps = app_data.get("completed_steps", [])
    if update.step not in completed_steps:
        completed_steps.append(update.step)
    
    update_dict = {
        update.step: update.data,
        "completed_steps": completed_steps,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.applications.update_one({"user_id": user["id"]}, {"$set": update_dict})
    updated = await db.applications.find_one({"user_id": user["id"]}, {"_id": 0})
    return updated

@api_router.post("/application/submit")
async def submit_application(user=Depends(get_current_user)):
    app_data = await db.applications.find_one({"user_id": user["id"]}, {"_id": 0})
    if not app_data:
        raise HTTPException(status_code=404, detail="Aucune candidature trouvée")
    if app_data["status"] not in ["Nouveau", "Correction_Requise"]:
        raise HTTPException(status_code=400, detail="La candidature a déjà été soumise")
    
    required_steps = ["identity", "education", "contacts", "emergency_contact", "financial_guarantor", "family"]
    completed = app_data.get("completed_steps", [])
    missing = [s for s in required_steps if s not in completed]
    if missing:
        raise HTTPException(status_code=400, detail=f"Étapes manquantes: {', '.join(missing)}")
    
    # Check minimum required documents (passport, id_photo, at least 1 diploma)
    docs = await db.documents.find({"application_id": app_data["id"]}, {"_id": 0}).to_list(100)
    uploaded_types = {d["doc_type"] for d in docs}
    minimum_required = {"passport_scan", "id_photo"}
    missing_docs = minimum_required - uploaded_types
    if missing_docs:
        labels = [dt["label"] for dt in DOCUMENT_TYPES if dt["id"] in missing_docs]
        raise HTTPException(status_code=400, detail=f"Documents manquants: {', '.join(labels)}")
    has_diploma = any(d["doc_type"] == "diploma" for d in docs)
    if not has_diploma:
        raise HTTPException(status_code=400, detail="Au moins un diplôme est requis")
    
    await db.applications.update_one(
        {"user_id": user["id"]},
        {"$set": {"status": "A_Verifier", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Create notification
    await create_notification(user["id"], "Candidature soumise", "Votre candidature est en cours de vérification par notre équipe.")
    return {"message": "Candidature soumise avec succès", "status": "A_Verifier"}

# ── Document Routes ──
@api_router.post("/documents/upload")
async def upload_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    valid_types = {dt["id"] for dt in DOCUMENT_TYPES}
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type de document invalide: {doc_type}")
    
    app_data = await db.applications.find_one({"user_id": user["id"]}, {"_id": 0})
    if not app_data:
        raise HTTPException(status_code=404, detail="Aucune candidature trouvée")
    
    # Read file
    data = await file.read()
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    storage_path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    
    result = put_object(storage_path, data, file.content_type or "application/octet-stream")
    
    # For diploma type, allow multiple uploads; for others, replace previous
    if doc_type != "diploma":
        await db.documents.delete_many({"application_id": app_data["id"], "doc_type": doc_type})
    
    doc = {
        "id": str(uuid.uuid4()),
        "application_id": app_data["id"],
        "user_id": user["id"],
        "doc_type": doc_type,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "status": "Pending",
        "feedback": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/documents")
async def get_documents(user=Depends(get_current_user)):
    app_data = await db.applications.find_one({"user_id": user["id"]}, {"_id": 0})
    if not app_data:
        return []
    docs = await db.documents.find({"application_id": app_data["id"]}, {"_id": 0}).to_list(100)
    return docs

@api_router.get("/documents/{doc_id}/download")
async def download_document(doc_id: str, user=Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    # Allow if owner or admin
    if doc["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    data, content_type = get_object(doc["storage_path"])
    return Response(content=data, media_type=doc.get("content_type", content_type), headers={
        "Content-Disposition": f"inline; filename=\"{doc['original_filename']}\""
    })

# ── Admin Routes ──
@api_router.get("/admin/students")
async def get_all_students(admin=Depends(require_admin)):
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    result = []
    for student in students:
        app_data = await db.applications.find_one({"user_id": student["id"]}, {"_id": 0})
        docs = await db.documents.find({"user_id": student["id"]}, {"_id": 0}).to_list(100)
        result.append({
            **student,
            "application": app_data,
            "documents_count": len(docs),
            "documents_approved": len([d for d in docs if d["status"] == "Approved"]),
        })
    return result

@api_router.get("/admin/students/{student_id}")
async def get_student_detail(student_id: str, admin=Depends(require_admin)):
    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0, "password_hash": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    app_data = await db.applications.find_one({"user_id": student_id}, {"_id": 0})
    docs = await db.documents.find({"user_id": student_id}, {"_id": 0}).to_list(100)
    payments = await db.payment_transactions.find({"user_id": student_id}, {"_id": 0}).to_list(100)
    return {
        "student": student,
        "application": app_data,
        "documents": docs,
        "payments": payments
    }

@api_router.put("/admin/documents/{doc_id}/status")
async def update_document_status(doc_id: str, update: DocumentStatusUpdate, admin=Depends(require_admin)):
    if update.status not in ["Approved", "Rejected", "Pending"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    await db.documents.update_one(
        {"id": doc_id},
        {"$set": {"status": update.status, "feedback": update.feedback, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Create notification for student
    doc_label = next((dt["label"] for dt in DOCUMENT_TYPES if dt["id"] == doc.get("doc_type")), doc.get("doc_type", "Document"))
    if update.status == "Rejected":
        msg = f"Votre document '{doc_label}' a été rejeté."
        if update.feedback:
            msg += f" Motif : {update.feedback}"
        await create_notification(doc["user_id"], "Document rejeté", msg)
    elif update.status == "Approved":
        await create_notification(doc["user_id"], "Document validé", f"Votre document '{doc_label}' a été validé.")
    return {"message": "Statut du document mis à jour"}

@api_router.put("/admin/students/{student_id}/status")
async def update_student_status(student_id: str, update: StudentStatusUpdate, admin=Depends(require_admin)):
    if update.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    app_data = await db.applications.find_one({"user_id": student_id})
    if not app_data:
        raise HTTPException(status_code=404, detail="Candidature non trouvée")
    await db.applications.update_one(
        {"user_id": student_id},
        {"$set": {"status": update.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Create notification for student
    STATUS_LABELS = {
        "Nouveau": "Nouveau dossier",
        "A_Verifier": "En cours de vérification",
        "Correction_Requise": "Correction requise - Veuillez vérifier vos documents et corriger les éléments signalés.",
        "Pret_Soumission": "Dossier validé ! Le paiement est maintenant disponible.",
        "Paid": "Paiement reçu. Votre dossier est en cours de traitement.",
        "Soumis": "Votre dossier a été soumis à l'université.",
        "Admis": "Félicitations ! Vous avez été admis !"
    }
    await create_notification(student_id, "Statut mis à jour", STATUS_LABELS.get(update.status, f"Statut: {update.status}"))
    return {"message": f"Statut mis à jour: {update.status}"}

# ── Reference Data Routes ──
@api_router.get("/universities")
async def get_universities():
    return UNIVERSITIES

@api_router.get("/document-types")
async def get_document_types():
    return DOCUMENT_TYPES

# ── Payment Routes ──
@api_router.post("/payments/create-session")
async def create_payment_session(req: PaymentRequest, http_request: Request, user=Depends(get_current_user)):
    app_data = await db.applications.find_one({"user_id": user["id"]}, {"_id": 0})
    if not app_data:
        raise HTTPException(status_code=404, detail="Aucune candidature trouvée")
    if app_data["status"] != "Pret_Soumission":
        raise HTTPException(status_code=400, detail="Le paiement n'est pas encore requis pour cette candidature")
    
    # Check for existing paid transaction
    existing = await db.payment_transactions.find_one({"user_id": user["id"], "payment_status": "paid"})
    if existing:
        raise HTTPException(status_code=400, detail="Le paiement a déjà été effectué")
    
    stripe_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/payment?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment"
    
    checkout_req = CheckoutSessionRequest(
        amount=APP_FEE,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["id"], "application_id": app_data["id"]}
    )
    session = await stripe_checkout.create_checkout_session(checkout_req)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "application_id": app_data["id"],
        "amount": APP_FEE,
        "currency": "eur",
        "session_id": session.session_id,
        "payment_status": "initiated",
        "metadata": {"user_id": user["id"], "application_id": app_data["id"]},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user=Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    # If already paid, return
    if transaction["payment_status"] == "paid":
        return transaction
    
    stripe_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        new_status = status.payment_status
        
        update_data = {
            "payment_status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_data})
        
        if new_status == "paid":
            await db.applications.update_one(
                {"id": transaction["application_id"]},
                {"$set": {"status": "Paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        transaction["payment_status"] = new_status
        return transaction
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        return transaction

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                await db.applications.update_one(
                    {"id": transaction["application_id"]},
                    {"$set": {"status": "Paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ── Notification Helper ──
async def create_notification(user_id: str, title: str, message: str):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif)

# ── Notifications Routes ──
@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifs

@api_router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}

@api_router.put("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"message": "ok"}

# ── Private Notes Routes ──
class NoteCreate(BaseModel):
    text: str

@api_router.get("/admin/students/{student_id}/notes")
async def get_notes(student_id: str, admin=Depends(require_admin)):
    notes = await db.notes.find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes

@api_router.post("/admin/students/{student_id}/notes")
async def add_note(student_id: str, note: NoteCreate, admin=Depends(require_admin)):
    n = {
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "admin_id": admin["id"],
        "admin_name": f"{admin.get('first_name','')} {admin.get('last_name','')}",
        "text": note.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notes.insert_one(n)
    n.pop("_id", None)
    return n

@api_router.delete("/admin/notes/{note_id}")
async def delete_note(note_id: str, admin=Depends(require_admin)):
    await db.notes.delete_one({"id": note_id})
    return {"message": "Note supprimée"}

# ── Canned Responses ──
@api_router.get("/canned-responses")
async def get_canned_responses():
    return CANNED_RESPONSES

# ── PDF Generation ──
@api_router.get("/admin/students/{student_id}/pdf")
async def generate_student_pdf(student_id: str, admin=Depends(require_admin)):
    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0, "password_hash": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    app_data = await db.applications.find_one({"user_id": student_id}, {"_id": 0})
    docs = await db.documents.find({"user_id": student_id}, {"_id": 0}).to_list(100)

    identity = app_data.get("identity", {}) if app_data else {}
    education = app_data.get("education", {}) if app_data else {}
    contacts = app_data.get("contacts", {}) if app_data else {}
    emergency = app_data.get("emergency_contact", {}) if app_data else {}
    guarantor = app_data.get("financial_guarantor", {}) if app_data else {}
    family = app_data.get("family", {}) if app_data else {}
    university = app_data.get("university", {}) if app_data else {}

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Try to get ID photo for the PDF
    id_photo_doc = next((d for d in docs if d["doc_type"] == "id_photo"), None)
    photo_path = None
    if id_photo_doc:
        try:
            photo_data, ct = get_object(id_photo_doc["storage_path"])
            ext = id_photo_doc["original_filename"].split(".")[-1].lower()
            if ext in ["jpg", "jpeg", "png"]:
                photo_path = f"/tmp/photo_{student_id}.{ext}"
                with open(photo_path, "wb") as f:
                    f.write(photo_data)
        except Exception:
            pass

    # Header
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "ChinaStudy - Fiche Recapitulative", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Generee le {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
    pdf.ln(8)

    # Photo + Identity side by side
    if photo_path:
        try:
            pdf.image(photo_path, x=pdf.get_x(), y=pdf.get_y(), w=30)
            pdf.set_x(45)
        except Exception:
            pass

    def section(title):
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(28, 53, 48)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 8, f"  {title}", ln=True, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 10)

    def row(label, value):
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(60, 6, label, border=0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, str(value or "-"), ln=True)

    section("Identite")
    row("Nom:", identity.get("last_name"))
    row("Prenom:", identity.get("first_name"))
    row("N. Passeport:", identity.get("passport_number"))
    row("Expiration:", identity.get("passport_expiry"))
    row("Nationalite:", identity.get("nationality"))
    row("Date de naissance:", identity.get("date_of_birth"))
    row("Sexe:", identity.get("gender"))
    row("Etat matrimonial:", identity.get("marital_status"))
    pdf.ln(3)

    section("Education")
    row("Diplome:", education.get("highest_degree"))
    row("Etablissement:", education.get("institution_name"))
    row("Chinois:", education.get("chinese_level"))
    row("Anglais:", education.get("english_level"))
    pdf.ln(3)

    section("Contacts")
    phone = f"{contacts.get('phone_code','')} {contacts.get('phone_number','')}" if contacts.get('phone_number') else ""
    row("Telephone:", phone)
    row("Adresse actuelle:", contacts.get("current_address"))
    row("Adresse permanente:", contacts.get("permanent_address"))
    pdf.ln(3)

    section("Contact d'urgence")
    row("Nom:", f"{emergency.get('last_name','')} {emergency.get('first_name','')}")
    rel = emergency.get("relationship_other") if emergency.get("relationship") == "Autre" else emergency.get("relationship")
    row("Relation:", rel)
    e_phone = f"{emergency.get('phone_code','')} {emergency.get('phone_number','')}" if emergency.get('phone_number') else ""
    row("Telephone:", e_phone)
    row("Email:", emergency.get("email"))
    pdf.ln(3)

    section("Garant Financier")
    row("Nom:", f"{guarantor.get('last_name','')} {guarantor.get('first_name','')}")
    row("Profession:", guarantor.get("profession"))
    row("Relation:", guarantor.get("relationship"))
    g_phone = f"{guarantor.get('phone_code','')} {guarantor.get('phone_number','')}" if guarantor.get('phone_number') else ""
    row("Telephone:", g_phone)
    pdf.ln(3)

    section("Famille")
    row("Pere:", f"{family.get('father_last_name','')} {family.get('father_first_name','')}")
    row("Age/Profession:", f"{family.get('father_age','-')} ans / {family.get('father_profession','-')}")
    row("Mere:", f"{family.get('mother_last_name','')} {family.get('mother_first_name','')}")
    row("Age/Profession:", f"{family.get('mother_age','-')} ans / {family.get('mother_profession','-')}")
    pdf.ln(3)

    if university:
        section("Universite")
        row("Nom:", university.get("name"))
        row("Ville:", university.get("city"))
        pdf.ln(3)

    section("Documents")
    for doc in docs:
        status_sym = "V" if doc["status"] == "Approved" else ("X" if doc["status"] == "Rejected" else "?")
        pdf.cell(0, 5, f"  [{status_sym}] {doc['doc_type']} - {doc['original_filename']} ({doc['status']})", ln=True)

    # Clean up temp photo
    if photo_path:
        try:
            os.remove(photo_path)
        except Exception:
            pass

    pdf_bytes = pdf.output()
    fname = f"{identity.get('last_name','ETUDIANT')}_{identity.get('first_name','')}_{identity.get('passport_number','')}.pdf".replace(" ", "_")
    return Response(content=bytes(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{fname}"'})

# ── ZIP Download ──
@api_router.get("/admin/students/{student_id}/zip")
async def download_student_zip(student_id: str, admin=Depends(require_admin)):
    student = await db.users.find_one({"id": student_id, "role": "student"}, {"_id": 0, "password_hash": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Étudiant non trouvé")
    app_data = await db.applications.find_one({"user_id": student_id}, {"_id": 0})
    docs = await db.documents.find({"user_id": student_id}, {"_id": 0}).to_list(100)
    
    identity = app_data.get("identity", {}) if app_data else {}
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in docs:
            try:
                data, ct = get_object(doc["storage_path"])
                filename = f"{doc['doc_type']}/{doc['original_filename']}"
                zf.writestr(filename, data)
            except Exception as e:
                logger.error(f"Error downloading doc {doc['id']}: {e}")
    
    zip_buffer.seek(0)
    fname = f"{identity.get('last_name','ETUDIANT')}_{identity.get('first_name','')}_{identity.get('passport_number','')}.zip".replace(" ", "_")
    return Response(content=zip_buffer.getvalue(), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{fname}"'})

# ── CSV Export ──
@api_router.get("/admin/export/csv")
async def export_csv(admin=Depends(require_admin)):
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nom", "Prenom", "Email", "Passeport", "Nationalite", "Date_Naissance", "Sexe", "Diplome", "Etablissement", "Chinois", "Anglais", "Universite", "Statut", "Date_Inscription"])
    for s in students:
        app = await db.applications.find_one({"user_id": s["id"]}, {"_id": 0})
        if not app:
            continue
        identity = app.get("identity", {})
        education = app.get("education", {})
        uni = app.get("university", {})
        writer.writerow([
            identity.get("last_name", ""), identity.get("first_name", ""), s.get("email", ""),
            identity.get("passport_number", ""), identity.get("nationality", ""), identity.get("date_of_birth", ""),
            identity.get("gender", ""), education.get("highest_degree", ""), education.get("institution_name", ""),
            education.get("chinese_level", ""), education.get("english_level", ""),
            uni.get("name", "") if uni else "", app.get("status", ""), app.get("created_at", "")
        ])
    csv_bytes = output.getvalue().encode("utf-8-sig")
    return Response(content=csv_bytes, media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="etudiants_chinastudy.csv"'})

# ── Seed Admin ──
@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    
    # Create admin user if not exists
    admin = await db.users.find_one({"email": "admin@chinastudy.com"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@chinastudy.com",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "first_name": "Admin",
            "last_name": "ChinaStudy",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created: admin@chinastudy.com / admin123")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.applications.create_index("user_id")
    await db.documents.create_index("application_id")
    await db.documents.create_index("user_id")
    await db.payment_transactions.create_index("session_id")
    await db.notifications.create_index("user_id")
    await db.notes.create_index("student_id")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
