import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import StudentDashboard from "@/pages/StudentDashboard";
import ApplicationWizard from "@/pages/ApplicationWizard";
import DocumentVault from "@/pages/DocumentVault";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminStudentDetailEnhanced from "@/pages/AdminStudentDetailEnhanced";

function ProtectedRoute({ children, adminOnly = false }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (adminOnly && profile.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (!adminOnly && profile.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C3530]"></div></div>;
  if (profile) return <Navigate to={profile.role === "admin" ? "/admin" : "/dashboard"} replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/application" element={<ProtectedRoute><ApplicationWizard /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentVault /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/student/:studentId" element={<ProtectedRoute adminOnly><AdminStudentDetailEnhanced /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
