// lib/archiveProject.js
import { supabase } from './supabase'

/**
 * Archiwizuje projekt - kopiuje dane do archived_* tabel i usuwa pliki z storage
 * @param {string} projectId - UUID projektu do archiwizacji
 * @param {string} archivedBy - UUID usera który archiwizuje
 * @returns {Promise<{success: boolean, message: string, error?: any}>}
 */
export async function archiveProject(projectId, archivedBy) {
  try {
    console.log(`🗄️ Starting archive process for project: ${projectId}`)

    // KROK 1: Pobierz dane projektu
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    // KROK 2: Pobierz wszystkie powiązane dane
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('project_id', projectId)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .in('category_id', categories?.map(c => c.id) || [])

    const { data: bids } = await supabase
      .from('bids')
      .select('*')
      .in('task_id', tasks?.map(t => t.id) || [])

    const { data: ratings } = await supabase
      .from('task_ratings')
      .select('*')
      .in('task_id', tasks?.map(t => t.id) || [])

    const { data: documents } = await supabase
      .from('task_documents')
      .select('*')
      .in('task_id', tasks?.map(t => t.id) || [])

    // KROK 3: Oblicz statystyki
    const totalTasks = tasks?.length || 0
    const totalBids = bids?.length || 0
    const totalValue = bids
      ?.filter(b => b.status === 'accepted')
      ?.reduce((sum, b) => sum + Number(b.price || 0), 0) || 0

    // KROK 4: Zapisz projekt do archived_projects
    const { data: archivedProject, error: archiveError } = await supabase
      .from('archived_projects')
      .insert({
        original_project_id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        project_type: project.project_type,
        start_date: project.start_date,
        end_date: project.end_date,
        created_by: project.created_by,
        archived_by: archivedBy,
        original_created_at: project.created_at,
        original_updated_at: project.updated_at,
        total_tasks: totalTasks,
        total_bids: totalBids,
        total_value: totalValue
      })
      .select()
      .single()

    if (archiveError) {
      throw archiveError
    }

    console.log(`✅ Archived project created: ${archivedProject.id}`)

    // KROK 5: Kopiuj categories do archived_categories
    if (categories && categories.length > 0) {
      const archivedCategories = categories.map(cat => ({
        archived_project_id: archivedProject.id,
        original_category_id: cat.id,
        name: cat.name,
        display_order: cat.display_order,
        original_created_at: cat.created_at
      }))

      const { data: insertedCategories } = await supabase
        .from('archived_categories')
        .insert(archivedCategories)
        .select()

      console.log(`✅ Archived ${insertedCategories?.length || 0} categories`)

      // Mapowanie old category ID → new archived category ID
      const categoryMap = {}
      categories.forEach((cat, idx) => {
        categoryMap[cat.id] = insertedCategories[idx].id
      })

      // KROK 6: Kopiuj tasks do archived_tasks
      if (tasks && tasks.length > 0) {
        const archivedTasks = tasks.map(task => ({
          archived_category_id: categoryMap[task.category_id],
          original_task_id: task.id,
          name: task.name,
          description: task.description,
          short_description: task.short_description,
          suggested_price: task.suggested_price,
          final_price: task.final_price,
          estimated_duration: task.estimated_duration,
          status: task.status,
          assigned_to: task.assigned_to,
          start_date: task.start_date,
          end_date: task.end_date,
          expected_completion_date: task.expected_completion_date,
          bid_deadline: task.bid_deadline,
          budget_min: task.budget_min,
          budget_max: task.budget_max,
          original_created_at: task.created_at
        }))

        const { data: insertedTasks } = await supabase
          .from('archived_tasks')
          .insert(archivedTasks)
          .select()

        console.log(`✅ Archived ${insertedTasks?.length || 0} tasks`)

        // Mapowanie old task ID → new archived task ID
        const taskMap = {}
        tasks.forEach((task, idx) => {
          taskMap[task.id] = insertedTasks[idx].id
        })

        // KROK 7: Kopiuj bids do archived_bids
        if (bids && bids.length > 0) {
          const archivedBids = bids.map(bid => ({
            archived_project_id: archivedProject.id,
            archived_task_id: taskMap[bid.task_id],
            original_bid_id: bid.id,
            subcontractor_id: bid.subcontractor_id,
            price: bid.price,
            duration: bid.duration,
            comment: bid.comment,
            status: bid.status,
            original_created_at: bid.created_at,
            original_updated_at: bid.updated_at
          }))

          const { data: insertedBids } = await supabase
            .from('archived_bids')
            .insert(archivedBids)
            .select()

          console.log(`✅ Archived ${insertedBids?.length || 0} bids`)
        }

        // KROK 8: Kopiuj ratings do archived_task_ratings
        if (ratings && ratings.length > 0) {
          const archivedRatings = ratings.map(rating => ({
            archived_task_id: taskMap[rating.task_id],
            original_rating_id: rating.id,
            subcontractor_id: rating.subcontractor_id,
            rated_by: rating.rated_by,
            rating: rating.rating,
            comment: rating.comment,
            original_created_at: rating.created_at
          }))

          const { data: insertedRatings } = await supabase
            .from('archived_task_ratings')
            .insert(archivedRatings)
            .select()

          console.log(`✅ Archived ${insertedRatings?.length || 0} ratings`)
        }
      }
    }

    // KROK 9: USUŃ PLIKI Z SUPABASE STORAGE
    const filesToDelete = []

    // Project image
    if (project.project_image_url) {
      const fileName = project.project_image_url.split('/').pop()
      filesToDelete.push({ bucket: 'project-files', path: `projects/${fileName}` })
    }

    // Gantt image
    if (project.gantt_image_url) {
      const fileName = project.gantt_image_url.split('/').pop()
      filesToDelete.push({ bucket: 'project-files', path: `gantt/${fileName}` })
    }

    // Task documents (PDFs)
    if (documents && documents.length > 0) {
      documents.forEach(doc => {
        if (doc.file_url) {
          const fileName = doc.file_url.split('/').pop()
          filesToDelete.push({ bucket: 'project-files', path: `documents/${fileName}` })
        }
      })
    }

    // Usuń wszystkie pliki
    let deletedFilesCount = 0
    for (const file of filesToDelete) {
      try {
        const { error: deleteError } = await supabase.storage
          .from(file.bucket)
          .remove([file.path])

        if (!deleteError) {
          deletedFilesCount++
          console.log(`🗑️ Deleted: ${file.path}`)
        }
      } catch (err) {
        console.warn(`⚠️ Could not delete ${file.path}:`, err.message)
      }
    }

    console.log(`✅ Deleted ${deletedFilesCount} files from storage`)

    // KROK 10: USUŃ ORYGINALNY PROJEKT (CASCADE kasuje resztę)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      throw deleteError
    }

    console.log(`✅ Original project deleted (CASCADE cleaned all related data)`)

    return {
      success: true,
      message: `Project archived successfully. ${deletedFilesCount} files deleted from storage.`,
      archivedProjectId: archivedProject.id,
      stats: {
        totalTasks,
        totalBids,
        totalValue,
        filesDeleted: deletedFilesCount
      }
    }

  } catch (error) {
    console.error('❌ Archive error:', error)
    return {
      success: false,
      message: 'Failed to archive project',
      error: error.message
    }
  }
}
