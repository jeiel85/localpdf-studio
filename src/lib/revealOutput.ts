import { revealItemInDir } from '@tauri-apps/plugin-opener';

let lastSettings: { openFolderAfterJob: boolean } | null = null;

export function setRevealEnabled(enabled: boolean): void {
  lastSettings = { openFolderAfterJob: enabled };
}

export async function maybeReveal(outputPath: string | null | undefined): Promise<void> {
  if (!outputPath) return;
  if (!lastSettings?.openFolderAfterJob) return;
  try {
    await revealItemInDir(outputPath);
  } catch {
    // ignore failures silently
  }
}
