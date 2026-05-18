import { invoke } from '@tauri-apps/api/core';
import type { AppInfo, ExternalToolStatus, PdfFilePayload, StartupContext } from '../types';

export async function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>('app_info');
}

export async function loadPdfBase64(path: string): Promise<PdfFilePayload> {
  return invoke<PdfFilePayload>('load_pdf_base64', { path });
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
