import { invoke } from '@tauri-apps/api/core';
import type { AppInfo, AppSettings, ExternalToolStatus, PdfFilePayload, RecentFileEntry, StartupContext, TabState } from '../types';

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>('app_info');
}

export async function loadPdfBase64(path: string): Promise<PdfFilePayload> {
  return invoke<PdfFilePayload>('load_pdf_base64', { path });
}

export async function loadPdfUrl(path: string): Promise<{ path: string; fileName: string; sizeBytes: number; url: string }> {
  return invoke('load_pdf_url', { path });
}

export async function getStartupContext(): Promise<StartupContext> {
  return invoke<StartupContext>('get_startup_context');
}

export async function checkExternalTools(): Promise<ExternalToolStatus[]> {
  return invoke<ExternalToolStatus[]>('check_external_tools');
}

export async function runPdfOperation(operation: string, files: string[]): Promise<string> {
  return invoke<string>('run_pdf_operation', { operation, files });
}

export async function getRecentFiles(): Promise<RecentFileEntry[]> {
  return invoke<RecentFileEntry[]>('get_recent_files');
}

export async function addRecentFile(path: string, fileName: string): Promise<RecentFileEntry[]> {
  return invoke<RecentFileEntry[]>('add_recent_file', { path, fileName });
}

export async function mergePdfs(inputFiles: string[], outputPath: string): Promise<{ outputPath: string; inputCount: number; totalPagesEstimate: number }> {
  return invoke('merge_pdfs', { inputFiles, outputPath });
}

export async function checkQpdfAvailable(): Promise<{ available: boolean; path: string; version: string }> {
  return invoke('check_qpdf_available');
}

export async function getJobStatus(id: string): Promise<{
  id: string;
  name: string;
  status: string;
  progress: number;
  message: string;
} | null> {
  return invoke('get_job_status', { id });
}

export async function getActiveJobs(): Promise<
  { id: string; name: string; status: string; progress: number; message: string }[]
> {
  return invoke('get_active_jobs');
}

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('get_settings');
}

export async function updateSettings(next: AppSettings): Promise<AppSettings> {
  return invoke<AppSettings>('update_settings', { next });
}

export async function resetSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('reset_settings');
}

export async function clearRecentFiles(): Promise<void> {
  return invoke<void>('clear_recent_files');
}

export async function getAppDataPath(): Promise<string> {
  return invoke<string>('get_app_data_path');
}

export async function getTabState(): Promise<TabState> {
  return invoke<TabState>('get_tab_state');
}

export async function saveTabState(state: TabState): Promise<void> {
  return invoke<void>('save_tab_state', { state });
}

export async function installQpdfAuto(): Promise<string> {
  return invoke<string>('install_qpdf_auto');
}

export async function installTesseractAuto(): Promise<string> {
  return invoke<string>('install_tesseract_auto');
}

export async function checkElevation(): Promise<boolean> {
  return invoke<boolean>('check_elevation');
}

export async function reorderPages(inputFile: string, outputPath: string, pageOrder: number[]): Promise<string> {
  return invoke<string>('reorder_pages', { inputFile, outputPath, pageOrder });
}

export async function deletePages(inputFile: string, outputPath: string, pagesToDelete: number[], totalPages: number): Promise<string> {
  return invoke<string>('delete_pages', { inputFile, outputPath, pagesToDelete, totalPages });
}

export async function insertPages(baseFile: string, insertFile: string, outputPath: string, afterPage: number, baseTotalPages: number): Promise<string> {
  return invoke<string>('insert_pages', { baseFile, insertFile, outputPath, afterPage, baseTotalPages });
}
