import { apiClient } from '../api/client';

/**
 * Tải về file Excel/CSV từ một API endpoint.
 * Dùng apiClient (có interceptor auth) với responseType=blob.
 */
export async function downloadExport(url: string, filename: string): Promise<void> {
  const response = await apiClient.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data as BlobPart], {
    type: response.headers['content-type'] as string ?? 'application/octet-stream',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
