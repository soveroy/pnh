'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const BUCKET_NAME = 'evidence_photos'

export async function uploadEvidenceAction(
  base64: string,
  fileName: string,
  folderPath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Convert base64 to Buffer
    const buffer = Buffer.from(base64, 'base64')
    
    // Clean fileName and path
    const cleanFileName = fileName.replace(/[^\w\.-]/g, '_')
    const fullPath = `${folderPath}/${Date.now()}_${cleanFileName}`

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, buffer, {
        contentType: 'image/jpeg', // Default to jpeg, but ideally we detect from extension
        upsert: true
      })

    if (error) {
      // If bucket doesn't exist, this might fail. In a real app we'd ensure bucket exists.
      throw error
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fullPath)

    return { success: true, url: publicUrlData.publicUrl }
  } catch (e: any) {
    console.error('Upload error:', e)
    return { success: false, error: e.message }
  }
}

export async function deleteOldEvidenceAction(folderPath: string) {
  // Utility to clear out a folder (e.g. older than 30 days)
  // This is a placeholder for manual cleanup logic
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath)

    if (listError) throw listError

    if (files && files.length > 0) {
      const paths = files.map(f => `${folderPath}/${f.name}`)
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths)
      
      if (deleteError) throw deleteError
    }
    
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
