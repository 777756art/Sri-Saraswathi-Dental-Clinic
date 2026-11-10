export const MEDIA_CATEGORIES = ["Whitening", "Implants", "Veneers", "Team", "Clinic", "Education"] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export type ClinicMediaKind = "image" | "video";

export interface ClinicMediaRecord {
  id: string;
  name: string;
  kind: ClinicMediaKind;
  mimeType: string;
  size: number;
  category: MediaCategory;
  createdAt: number;
  includeInGallery: boolean;
  blob: Blob;
}

const DATABASE_NAME = "smilecare-clinic-media";
const DATABASE_VERSION = 1;
const STORE_NAME = "media";

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support local media storage."));
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("kind", "kind");
        store.createIndex("category", "category");
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };
      resolve(database);
    };

    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error("Could not open the media library."));
    };

    request.onblocked = () => {
      databasePromise = undefined;
      reject(new Error("Close other Sri Saraswathi tabs, then try again."));
    };
  });

  return databasePromise;
}

export async function listClinicMedia(): Promise<ClinicMediaRecord[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll() as IDBRequest<ClinicMediaRecord[]>;
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Could not load the media library."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not load the media library."));
  });
}

export async function saveClinicMedia(record: ClinicMediaRecord): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save this file."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save this file."));
  });
}

export async function removeClinicMedia(id: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove this file."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not remove this file."));
  });
}
