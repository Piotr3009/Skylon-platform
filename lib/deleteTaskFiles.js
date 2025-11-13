// lib/deleteTaskFiles.js
import { supabase } from './supabase'

/**
 * Usuwa wszystkie pliki powiązane z taskiem z Supabase Storage
 * @param {string} taskId - UUID taska
 * @returns {Promise<{success: boolean, filesDeleted: number, errors: array}>}
 */
export async function deleteTaskFiles(taskId) {
  try {
    console.log(`🗑️ Starting file deletion for task: ${taskId}`)

    // Pobierz wszystkie dokumenty tego taska
    const { data: documents, error: fetchError } = await supabase
      .from('task_documents')
      .select('*')
      .eq('task_id', taskId)

    if (fetchError) {
      console.error('Error fetching task documents:', fetchError)
      return {
        success: false,
        filesDeleted: 0,
        errors: [fetchError.message]
      }
    }

    if (!documents || documents.length === 0) {
      console.log('✅ No documents to delete')
      return {
        success: true,
        filesDeleted: 0,
        errors: []
      }
    }

    let filesDeleted = 0
    const errors = []

    // Usuń każdy plik z storage
    for (const doc of documents) {
      if (!doc.file_url) continue

      try {
        // Wyciągnij ścieżkę pliku z URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/project-files/documents/filename.pdf
        const urlParts = doc.file_url.split('/documents/')
        const fileName = urlParts[1] || doc.file_url.split('/').pop()
        const filePath = `documents/${fileName}`

        console.log(`🗑️ Deleting: ${filePath}`)

        const { error: deleteError } = await supabase.storage
          .from('project-files')
          .remove([filePath])

        if (deleteError) {
          console.warn(`⚠️ Could not delete ${filePath}:`, deleteError.message)
          errors.push(`Failed to delete ${doc.file_name}: ${deleteError.message}`)
        } else {
          filesDeleted++
          console.log(`✅ Deleted: ${filePath}`)
        }
      } catch (err) {
        console.error(`❌ Error deleting file for document ${doc.id}:`, err)
        errors.push(`Error deleting ${doc.file_name}: ${err.message}`)
      }
    }

    console.log(`✅ Deleted ${filesDeleted}/${documents.length} files from storage`)

    return {
      success: errors.length === 0,
      filesDeleted,
      errors
    }

  } catch (error) {
    console.error('❌ deleteTaskFiles error:', error)
    return {
      success: false,
      filesDeleted: 0,
      errors: [error.message]
    }
  }
}

/**
 * Usuwa wszystkie dokumenty subcontractora z Supabase Storage
 * @param {string} subcontractorId - UUID subcontractora
 * @returns {Promise<{success: boolean, filesDeleted: number, errors: array}>}
 */
export async function deleteSubcontractorDocuments(subcontractorId) {
  try {
    console.log(`🗑️ Starting file deletion for subcontractor: ${subcontractorId}`)

    // Pobierz wszystkie dokumenty subcontractora
    const { data: documents, error: fetchError } = await supabase
      .from('subcontractor_documents')
      .select('*')
      .eq('subcontractor_id', subcontractorId)

    if (fetchError) {
      console.error('Error fetching subcontractor documents:', fetchError)
      return {
        success: false,
        filesDeleted: 0,
        errors: [fetchError.message]
      }
    }

    if (!documents || documents.length === 0) {
      console.log('✅ No documents to delete')
      return {
        success: true,
        filesDeleted: 0,
        errors: []
      }
    }

    let filesDeleted = 0
    const errors = []

    // Usuń każdy plik z storage
    for (const doc of documents) {
      if (!doc.file_url) continue

      try {
        // Wyciągnij ścieżkę pliku z URL
        const urlParts = doc.file_url.split('/subcontractor-documents/')
        const fileName = urlParts[1] || doc.file_url.split('/').pop()
        const filePath = fileName

        console.log(`🗑️ Deleting: ${filePath}`)

        const { error: deleteError } = await supabase.storage
          .from('subcontractor-documents')
          .remove([filePath])

        if (deleteError) {
          console.warn(`⚠️ Could not delete ${filePath}:`, deleteError.message)
          errors.push(`Failed to delete ${doc.document_name}: ${deleteError.message}`)
        } else {
          filesDeleted++
          console.log(`✅ Deleted: ${filePath}`)
        }
      } catch (err) {
        console.error(`❌ Error deleting file for document ${doc.id}:`, err)
        errors.push(`Error deleting ${doc.document_name}: ${err.message}`)
      }
    }

    console.log(`✅ Deleted ${filesDeleted}/${documents.length} files from storage`)

    return {
      success: errors.length === 0,
      filesDeleted,
      errors
    }

  } catch (error) {
    console.error('❌ deleteSubcontractorDocuments error:', error)
    return {
      success: false,
      filesDeleted: 0,
      errors: [error.message]
    }
  }
}

/**
 * Usuwa pojedynczy dokument taska z DB i Storage
 * @param {string} documentId - UUID dokumentu
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSingleTaskDocument(documentId) {
  try {
    // Pobierz dokument
    const { data: doc, error: fetchError } = await supabase
      .from('task_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (fetchError || !doc) {
      return {
        success: false,
        error: 'Document not found'
      }
    }

    // Usuń plik z storage
    if (doc.file_url) {
      const urlParts = doc.file_url.split('/documents/')
      const fileName = urlParts[1] || doc.file_url.split('/').pop()
      const filePath = `documents/${fileName}`

      const { error: deleteError } = await supabase.storage
        .from('project-files')
        .remove([filePath])

      if (deleteError) {
        console.warn('Could not delete file from storage:', deleteError)
      }
    }

    // Usuń rekord z DB
    const { error: dbError } = await supabase
      .from('task_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      return {
        success: false,
        error: dbError.message
      }
    }

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Usuwa pojedynczy dokument subcontractora z DB i Storage
 * @param {string} documentId - UUID dokumentu
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSingleSubcontractorDocument(documentId) {
  try {
    // Pobierz dokument
    const { data: doc, error: fetchError } = await supabase
      .from('subcontractor_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (fetchError || !doc) {
      return {
        success: false,
        error: 'Document not found'
      }
    }

    // Usuń plik z storage
    if (doc.file_url) {
      const urlParts = doc.file_url.split('/subcontractor-documents/')
      const fileName = urlParts[1] || doc.file_url.split('/').pop()

      const { error: deleteError } = await supabase.storage
        .from('subcontractor-documents')
        .remove([fileName])

      if (deleteError) {
        console.warn('Could not delete file from storage:', deleteError)
      }
    }

    // Usuń rekord z DB
    const { error: dbError } = await supabase
      .from('subcontractor_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      return {
        success: false,
        error: dbError.message
      }
    }

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}