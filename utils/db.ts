
import { ProjectData, ProjectMeta } from '../types';

const DB_NAME = 'ClipAnimDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

// Open Database
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      }
    };
  });
};

// Save a full project
export const saveProjectToDB = async (project: ProjectData): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(project);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get list of all projects (Metadata only)
// We iterate using a cursor to avoid loading the full heavy objects into memory just for the menu
export const getProjectList = async (): Promise<ProjectMeta[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('lastModified');
    const request = index.openCursor(null, 'prev'); // Newest first
    const projects: ProjectMeta[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        // Only extract the metadata fields
        const { id, name, lastModified, thumbnailUrl } = cursor.value;
        projects.push({ id, name, lastModified, thumbnailUrl });
        cursor.continue();
      } else {
        resolve(projects);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Load a specific project
export const loadProjectFromDB = async (id: string): Promise<ProjectData | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete a project
export const deleteProjectFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
