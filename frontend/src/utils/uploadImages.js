import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload multiple images to Firebase Storage.
 * @param {File[]} files - Array of File objects
 * @param {string} folder - Storage folder path (e.g. 'products/owner123')
 * @returns {Promise<string[]>} Array of download URLs
 */
export async function uploadImages(files, folder = 'products') {
  const urls = [];
  for (const file of files) {
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}
