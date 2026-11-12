import { unlink } from 'fs/promises';
import { basename, join } from 'path';

export async function DeleteFile(
  fileName: string,
  folder: string,
): Promise<void> {
  const filePath = join(process.cwd(), 'uploads', folder, basename(fileName));

  try {
    await unlink(filePath);
  } catch (error) {
    throw error;
  }
}
