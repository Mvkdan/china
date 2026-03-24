import { supabase } from './supabase';

/**
 * Helpers pour gérer les applications
 */
export const applicationHelpers = {
  // Récupérer l'application de l'utilisateur
  async getApplication(userId) {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Mettre à jour une étape spécifique
  async updateStep(userId, step, stepData) {
    // Récupérer l'application actuelle
    const app = await this.getApplication(userId);
    
    if (!app) {
      throw new Error('Application not found');
    }

    // Mettre à jour les completed_steps
    const completedSteps = app.completed_steps || [];
    if (!completedSteps.includes(step)) {
      completedSteps.push(step);
    }

    // Mettre à jour l'application
    const { data, error } = await supabase
      .from('applications')
      .update({
        [step]: stepData,
        completed_steps: completedSteps,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Soumettre l'application (changer statut)
  async submitApplication(userId) {
    const { data, error } = await supabase
      .from('applications')
      .update({
        status: 'A_Verifier',
        submission_date: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Helpers pour gérer les documents
 */
export const documentHelpers = {
  // Uploader un document
  async uploadDocument(userId, applicationId, file, documentType) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${documentType}/${fileName}`;

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Créer l'enregistrement dans la table documents
    const { data, error } = await supabase
      .from('documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Récupérer tous les documents d'une application
  async getDocuments(applicationId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtenir l'URL signée d'un document
  async getDocumentUrl(filePath) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // URL valide 1h

    if (error) throw error;
    return data.signedUrl;
  },

  // Supprimer un document
  async deleteDocument(documentId, filePath) {
    // Supprimer du storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) throw storageError;

    // Supprimer de la table
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  }
};

/**
 * Helpers pour les notifications
 */
export const notificationHelpers = {
  // Créer une notification
  async create(userId, title, message, type = 'info') {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marquer comme lu
  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Marquer toutes comme lues
  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }
};

/**
 * Helpers pour les universités
 */
export const universityHelpers = {
  // Récupérer toutes les universités
  async getAll() {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  // Assigner une université à une application
  async assignToApplication(applicationId, universityId, adminId, notes = null) {
    const { data, error } = await supabase
      .from('application_universities')
      .insert({
        application_id: applicationId,
        university_id: universityId,
        assigned_by: adminId,
        notes
      })
      .select('*, universities(*)')
      .single();

    if (error) throw error;
    return data;
  },

  // Retirer une université d'une application
  async removeFromApplication(applicationId, universityId) {
    const { error } = await supabase
      .from('application_universities')
      .delete()
      .eq('application_id', applicationId)
      .eq('university_id', universityId);

    if (error) throw error;
  },

  // Récupérer les universités assignées à une application
  async getAssignedUniversities(applicationId) {
    const { data, error } = await supabase
      .from('application_universities')
      .select('*, universities(*)')
      .eq('application_id', applicationId);

    if (error) throw error;
    return data;
  }
};

/**
 * Helpers pour l'admin
 */
export const adminHelpers = {
  // Récupérer tous les étudiants avec leurs applications
  async getAllStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        applications (
          id,
          status,
          completed_steps,
          submission_date,
          created_at,
          application_universities (
            id,
            universities (id, name, city)
          )
        )
      `)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer un étudiant spécifique avec détails complets
  async getStudentDetail(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        applications (
          *,
          application_universities (
            *,
            universities (*)
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    // Récupérer aussi les documents
    if (data.applications && data.applications.length > 0) {
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', data.applications[0].id);
      
      data.applications[0].documents = docs || [];
    }

    return data;
  },

  // Changer le statut d'une application
  async updateApplicationStatus(applicationId, status) {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Valider/rejeter un document
  async updateDocumentStatus(documentId, status, feedback = null, adminId) {
    const { data, error } = await supabase
      .from('documents')
      .update({
        status,
        feedback,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
