import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

// Define the root data directory for our local JSON database
const DATA_DIR = path.join(process.cwd(), '../../packages/db/data');
const REMOTE_DB_BUCKET = process.env.RUMO_REMOTE_DB_BUCKET || 'rumo-data';
const REMOTE_DB_PREFIX = process.env.RUMO_REMOTE_DB_PREFIX || 'json-db';
const REMOTE_DB_ENABLED = Boolean(
  process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const REMOTE_FILE_PREFIX = 'remote:';
const REMOTE_CACHE_TTL_MS = 750;
const remoteDataCache = new Map<string, { value: unknown; loadedAt: number }>();

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function encodeStoragePath(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getRemoteKey(filename: string) {
  return `${REMOTE_DB_PREFIX}/${filename}`;
}

function getRemoteMarker(filename: string) {
  return `${REMOTE_FILE_PREFIX}${filename}`;
}

function buildRemoteScript() {
  return `
const url = (process.env.RUMO_REMOTE_URL || '').replace(/\\/$/, '');
const token = process.env.RUMO_REMOTE_TOKEN;
const bucket = process.env.RUMO_REMOTE_BUCKET;
const key = process.env.RUMO_REMOTE_KEY;
const op = process.env.RUMO_REMOTE_OP;
const payload = process.env.RUMO_REMOTE_PAYLOAD || '';
const encodedKey = key.split('/').map(encodeURIComponent).join('/');
const headers = { apikey: token, Authorization: 'Bearer ' + token };

async function main() {
  if (op === 'download') {
    const res = await fetch(url + '/storage/v1/object/' + bucket + '/' + encodedKey, { headers });
    if (!res.ok) {
      console.error(await res.text());
      process.exit(2);
    }
    process.stdout.write(await res.text());
    return;
  }

  if (op === 'upload') {
    const res = await fetch(url + '/storage/v1/object/' + bucket + '/' + encodedKey, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'x-upsert': 'true' },
      body: Buffer.from(payload, 'base64').toString('utf8'),
    });
    if (!res.ok) {
      console.error(await res.text());
      process.exit(3);
    }
    process.stdout.write(await res.text());
    return;
  }

  if (op === 'exists') {
    const res = await fetch(url + '/storage/v1/object/info/' + bucket + '/' + encodedKey, { headers });
    if (res.status === 400 || res.status === 404) {
      process.stdout.write(JSON.stringify({ exists: false }));
      return;
    }
    if (!res.ok) {
      console.error(await res.text());
      process.exit(4);
    }
    process.stdout.write(JSON.stringify({ exists: true }));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
`;
}

function runRemoteStorage(op: 'download' | 'upload' | 'exists', remoteKey: string, payload?: string) {
  const result = spawnSync(
    process.execPath,
    ['-e', buildRemoteScript()],
    {
      env: {
        ...process.env,
        RUMO_REMOTE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        RUMO_REMOTE_TOKEN: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        RUMO_REMOTE_BUCKET: REMOTE_DB_BUCKET,
        RUMO_REMOTE_KEY: remoteKey,
        RUMO_REMOTE_OP: op,
        RUMO_REMOTE_PAYLOAD: payload ? Buffer.from(payload, 'utf8').toString('base64') : '',
      },
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const errorOutput = (result.stderr || result.stdout || '').trim();
    throw new Error(errorOutput || `Remote storage operation failed: ${op}`);
  }

  return result.stdout.trim();
}

// Helper to ensure data directory and files exist
function ensureDbFile(filename: string, initialData: any) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }

  if (REMOTE_DB_ENABLED) {
    const remoteKey = getRemoteKey(filename);
    try {
      const existsResult = runRemoteStorage('exists', remoteKey);
      const existsPayload = existsResult ? JSON.parse(existsResult) as { exists?: boolean } : {};
      if (!existsPayload.exists) {
        runRemoteStorage('upload', remoteKey, JSON.stringify(initialData, null, 2));
        const marker = getRemoteMarker(filename);
        remoteDataCache.set(marker, { value: cloneData(initialData), loadedAt: Date.now() });
        return marker;
      }
      return getRemoteMarker(filename);
    } catch (error) {
      console.warn(`[db] Remote persistence bootstrap failed for ${filename}. Reads may fall back to local seed until storage recovers.`, error);
      return getRemoteMarker(filename);
    }
  }
  return filePath;
}

// Initial mock data to seed the database so it is not empty
const initialTrips = [
  {
    id: 'HOR-9921',
    createdDate: '29-05-2024',
    name: 'Viagem Roma Premium',
    destinations: ['Roma'],
    startDate: '2024-07-24',
    endDate: '2024-07-31',
    travelers: ['DR', '+1'],
    status: 'Publicado',
    clientName: 'Digueira Rumo',
    itinerary: [
      {
        id: 'item-1',
        day: 1,
        type: 'flight',
        title: 'Voo ITA Airways',
        subTitle: 'AZ 673',
        details: 'Voo direto de São Paulo (GRU) para Roma (FCO)',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5',
        meta: {
          airline: 'ITA Airways',
          flightNumber: 'AZ 673',
          origin: 'São Paulo (GRU)',
          destination: 'Roma (FCO)',
          departureTime: '14:25',
          arrivalTime: '06:45 (+1 dia)',
          duration: '11h 20m',
        }
      }
    ]
  },
  {
    id: 'HOR-8842',
    createdDate: '14-04-2024',
    name: "Grand Tour de l'Italie",
    destinations: ['Milão', 'Veneza', 'Florença'],
    startDate: '2025-04-01',
    endDate: '2025-04-19',
    travelers: ['RR'],
    status: 'Confirmado',
    clientName: 'Raquel Rasera',
    itinerary: [
      {
        id: 'item-2',
        day: 1,
        type: 'activity',
        title: 'MILÃO - CORAÇÃO DA ITÁLIA',
        subTitle: 'Principais Bairros',
        details: 'Exploração guiada pelos principais bairros históricos de Milão, incluindo a praça do Duomo.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOQiAieOx5qVQtY3TDB2WMJsJDEoi69xdHwHXJiA9BAPXRGTCt33ocGTKv4ruztp7PjotVhrQnwVcQKg1NhDYeB8PYCUrDOZiRIChPoRUxGidQ0fknumzwFh3VJ2_F0Di-bBK-y-Iv8aBatLJx1OcIv8aUhkTdJL8wcPH64UmiCU9OPRFbvEQMgmKjuNG2I2F2lUisTokdPU6J3cfTVJ1MDOLLoAljUHn6TGSCDjNb5VjTyvd6GDvpycoH9JMoPJw6JAIZBSztv5tW',
        meta: {
          type: 'Tour Guiado',
          duration: '3 horas'
        }
      },
      {
        id: 'item-3',
        day: 2,
        type: 'hotel',
        title: 'NH Collection Touring',
        subTitle: 'Acomodação em Milão',
        details: 'Hotel 4 estrelas premium localizado no centro de Milão.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoZjJz35m8EyEiFJD7-B6xM8MSfSGJ3gFAUHCpWbTtzC6gpvyGHkg2esanTe5uy10gOLbK38rEN5gmMyY0xjPCar1KNb6yej5dVjEcRywodUMS8QNbnXFAop6lEuP4OAyAxqnnPG5FFsZlbTT8UJjM1PrSR-6qpkWRr0MDZ2fi-CQGacKPT4PGQmosNgIcTYbPLjHW7nzohmbMGFDXZqDY0-TUpJR_PPlmy7hsl7vFJFwvFnUL781RvzGhXXmqVWJ4I0FHtzZvLDUi',
        meta: {
          address: 'Via Iginio Ugo Tarchetti, 2',
          rooms: '1 Quarto Duplo',
          checkin: '15:00'
        }
      }
    ]
  }
];

const initialClients = [
  { id: 'client-1', fullName: 'Digueira Rumo', email: 'digueira@rumo.com', phone: '+55 11 99999-9999', cpf: '123.456.789-00', passport: 'BR123456' },
  { id: 'client-2', fullName: 'Raquel Rasera', email: 'raquel@rumo.com', phone: '+55 11 98888-8888', cpf: '987.654.321-11', passport: 'BR654321' },
  { id: 'client-3', fullName: 'André Negrini', email: 'andre@rumo.com', phone: '+55 11 97777-7777', cpf: '456.789.123-22', passport: 'BR789123' },
];

const hashPassword = (password: string, salt: string) =>
  crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');

const createPasswordHash = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${hashPassword(password, salt)}`;
};

const verifyPasswordHash = (password: string, passwordHash?: string) => {
  if (!passwordHash) return false;
  const [salt, storedHash] = passwordHash.split(':');
  if (!salt || !storedHash) return false;
  const candidate = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
};

const initialUsers = [
  {
    id: 'user-platform-admin',
    fullName: 'Administrador Rumo',
    email: 'platform@rumo.com',
    role: 'platform_admin',
    agencyId: 'platform',
    phone: '',
    avatarUrl: '',
    accessStatus: 'active',
    accessExpiresAt: '2099-12-31T23:59:59.000Z',
    passwordHash: createPasswordHash('rumo123'),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-1',
    fullName: 'Digueira Rumo',
    email: 'admin@rumo.com',
    role: 'agency_admin',
    phone: '+55 11 99999-9999',
    avatarUrl: '',
    passwordHash: createPasswordHash('rumo123'),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    fullName: 'Rodriguera Rumo',
    email: 'rodrigo@rumo.com',
    role: 'agent',
    phone: '+55 11 96666-6666',
    avatarUrl: '',
    passwordHash: createPasswordHash('rumo123'),
    createdAt: new Date().toISOString(),
  },
];

const initialPhotos = [
  {
    id: 'photo-1',
    folder: 'Europa/Milão',
    name: 'Catedral Duomo',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOQiAieOx5qVQtY3TDB2WMJsJDEoi69xdHwHXJiA9BAPXRGTCt33ocGTKv4ruztp7PjotVhrQnwVcQKg1NhDYeB8PYCUrDOZiRIChPoRUxGidQ0fknumzwFh3VJ2_F0Di-bBK-y-Iv8aBatLJx1OcIv8aUhkTdJL8wcPH64UmiCU9OPRFbvEQMgmKjuNG2I2F2lUisTokdPU6J3cfTVJ1MDOLLoAljUHn6TGSCDjNb5VjTyvd6GDvpycoH9JMoPJw6JAIZBSztv5tW'
  },
  {
    id: 'photo-2',
    folder: 'Europa/Milão',
    name: 'NH Hotel',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoZjJz35m8EyEiFJD7-B6xM8MSfSGJ3gFAUHCpWbTtzC6gpvyGHkg2esanTe5uy10gOLbK38rEN5gmMyY0xjPCar1KNb6yej5dVjEcRywodUMS8QNbnXFAop6lEuP4OAyAxqnnPG5FFsZlbTT8UJjM1PrSR-6qpkWRr0MDZ2fi-CQGacKPT4PGQmosNgIcTYbPLjHW7nzohmbMGFDXZqDY0-TUpJR_PPlmy7hsl7vFJFwvFnUL781RvzGhXXmqVWJ4I0FHtzZvLDUi'
  },
  {
    id: 'photo-3',
    folder: 'Europa/Roma',
    name: 'Coliseu',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOQiAieOx5qVQtY3TDB2WMJsJDEoi69xdHwHXJiA9BAPXRGTCt33ocGTKv4ruztp7PjotVhrQnwVcQKg1NhDYeB8PYCUrDOZiRIChPoRUxGidQ0fknumzwFh3VJ2_F0Di-bBK-y-Iv8aBatLJx1OcIv8aUhkTdJL8wcPH64UmiCU9OPRFbvEQMgmKjuNG2I2F2lUisTokdPU6J3cfTVJ1MDOLLoAljUHn6TGSCDjNb5VjTyvd6GDvpycoH9JMoPJw6JAIZBSztv5tW'
  }
];

const initialFolders = ['Europa/Milão', 'Europa/Roma', 'América/Orlando', 'América/Miami'];

const initialFolderCovers: Record<string, string> = {};

const initialSessions: any[] = [];
const initialNotifications: any[] = [];
const initialTravelerInvites: any[] = [];
const initialTravelerTripAccess: any[] = [];

const SESSION_TTL_DAYS = 7;
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'rumo-dev-session-secret';

const initialSettings = {
  agencyName: 'Horizon Enterprise',
  logoUrl: '',
  defaultCurrency: 'BRL',
  plan: 'business',
  amadeusKey: '',
  tboKey: '',
  claudeKey: '',
  pixabayKey: '',
  unsplashKey: '',
  notificationEmail: 'alertas@horizonenterprise.com',
};

const initialAgencies = [
  {
    id: 'agency-default',
    name: 'Horizon Enterprise',
    slug: 'horizon-enterprise',
    logoUrl: '',
    plan: 'business',
    subscriptionStatus: 'active',
    accessExpiresAt: '2099-12-31T23:59:59.000Z',
    createdAt: new Date().toISOString(),
  },
];

// Initialize files
const TRIPS_FILE = ensureDbFile('trips.json', initialTrips);
const CLIENTS_FILE = ensureDbFile('clients.json', initialClients);
const USERS_FILE = ensureDbFile('users.json', initialUsers);
const PHOTOS_FILE = ensureDbFile('photos.json', initialPhotos);
const FOLDERS_FILE = ensureDbFile('folders.json', initialFolders);
const FOLDER_COVERS_FILE = ensureDbFile('folder-covers.json', initialFolderCovers);
const LIBRARY_ORDER_FILE = ensureDbFile('library-order.json', {});
const SESSIONS_FILE = ensureDbFile('sessions.json', initialSessions);
const SETTINGS_FILE = ensureDbFile('settings.json', initialSettings);
const AGENCIES_FILE = ensureDbFile('agencies.json', initialAgencies);
const NOTIFICATIONS_FILE = ensureDbFile('notifications.json', initialNotifications);
const TRAVELER_INVITES_FILE = ensureDbFile('traveler-invites.json', initialTravelerInvites);
const TRAVELER_TRIP_ACCESS_FILE = ensureDbFile('traveler-trip-access.json', initialTravelerTripAccess);
const AI_GENERATIONS_FILE = ensureDbFile('ai-generations.json', []);

const existingUsers = readData<any[]>(USERS_FILE);
if (existingUsers.some((user) => !user.passwordHash || !user.agencyId || !user.accessStatus || !user.accessExpiresAt)) {
  writeData(
    USERS_FILE,
    existingUsers.map((user) => ({
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      agencyId: 'agency-default',
      accessStatus: 'active',
      accessExpiresAt: '2099-12-31T23:59:59.000Z',
      ...user,
      passwordHash: user.passwordHash || createPasswordHash('rumo123'),
    }))
  );
}

const usersAfterNormalization = readData<any[]>(USERS_FILE);
if (!usersAfterNormalization.some((user) => user.role === 'platform_admin')) {
  writeData(USERS_FILE, [
    {
      id: 'user-platform-admin',
      fullName: 'Administrador Rumo',
      email: 'platform@rumo.com',
      role: 'platform_admin',
      agencyId: 'platform',
      phone: '',
      avatarUrl: '',
      accessStatus: 'active',
      accessExpiresAt: '2099-12-31T23:59:59.000Z',
      passwordHash: createPasswordHash('rumo123'),
      createdAt: new Date().toISOString(),
    },
    ...usersAfterNormalization,
  ]);
}

const existingTrips = readData<any[]>(TRIPS_FILE);
if (
  existingTrips.some(
    (trip) =>
      !trip.agencyId ||
      !Array.isArray(trip.documents) ||
      !Array.isArray(trip.transportation) ||
      !Array.isArray(trip.accommodations)
  )
) {
  writeData(
    TRIPS_FILE,
    existingTrips.map((trip) => ({
      agencyId: 'agency-default',
      documents: [],
      transportation: [],
      accommodations: [],
      ...trip,
    }))
  );
}

const existingClients = readData<any[]>(CLIENTS_FILE);
if (existingClients.some((client) => !client.agencyId)) {
  writeData(
    CLIENTS_FILE,
    existingClients.map((client) => ({
      agencyId: 'agency-default',
      appAccessStatus: 'pending',
      ...client,
    }))
  );
}

// Generic read/write helpers
function readData<T>(filePath: string): T {
  if (filePath.startsWith(REMOTE_FILE_PREFIX) && REMOTE_DB_ENABLED) {
    const cached = remoteDataCache.get(filePath);
    if (cached && Date.now() - cached.loadedAt < REMOTE_CACHE_TTL_MS) {
      return cloneData(cached.value as T);
    }

    const filename = filePath.slice(REMOTE_FILE_PREFIX.length);
    try {
      const remoteText = runRemoteStorage('download', getRemoteKey(filename));
      const parsed = JSON.parse(remoteText) as T;
      remoteDataCache.set(filePath, { value: cloneData(parsed), loadedAt: Date.now() });
      return cloneData(parsed);
    } catch (error) {
      console.warn(`[db] Failed to read remote file ${filename}. Falling back to local seed.`, error);
      filePath = path.join(DATA_DIR, filename);
    }
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    return [] as unknown as T;
  }
}

function writeData<T>(filePath: string, data: T): void {
  if (filePath.startsWith(REMOTE_FILE_PREFIX) && REMOTE_DB_ENABLED) {
    const filename = filePath.slice(REMOTE_FILE_PREFIX.length);
    const serialized = JSON.stringify(data, null, 2);
    try {
      runRemoteStorage('upload', getRemoteKey(filename), serialized);
      remoteDataCache.set(filePath, { value: cloneData(data), loadedAt: Date.now() });
      return;
    } catch (error) {
      if (filename === 'ai-generations.json') {
        console.error(`[db] Warning: Failed to persist non-critical remote file ${filename}:`, error);
        remoteDataCache.set(filePath, { value: cloneData(data), loadedAt: Date.now() });
        return;
      }
      throw new Error(
        `[db] Failed to persist remote file ${filename}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toBase64Url(input: string) {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function signSessionPayload(payload: string) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function createSessionToken(userId: string, expiresAt: string) {
  const payload = toBase64Url(JSON.stringify({ userId, expiresAt }));
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function parseSessionToken(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = signSessionPayload(payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as {
      userId?: string;
      expiresAt?: string;
    };

    if (!parsed.userId || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt) <= new Date()) return null;

    return {
      id: token,
      userId: parsed.userId,
      createdAt: '',
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

// Database ORM Client
export const db = {
  agencies: {
    findMany: () => readData<any[]>(AGENCIES_FILE),
    findOne: (id: string) => readData<any[]>(AGENCIES_FILE).find((agency) => agency.id === id),
    create: (data: any) => {
      const agencies = readData<any[]>(AGENCIES_FILE);
      const id = `agency-${Date.now()}`;
      const newAgency = {
        id,
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || id,
        logoUrl: data.logoUrl || '',
        plan: data.plan || 'starter',
        subscriptionStatus: 'active',
        accessExpiresAt: data.accessExpiresAt || addDays(new Date(), 30).toISOString(),
        createdAt: new Date().toISOString(),
      };
      agencies.push(newAgency);
      writeData(AGENCIES_FILE, agencies);
      return newAgency;
    },
    update: (id: string, data: any) => {
      const agencies = readData<any[]>(AGENCIES_FILE);
      const index = agencies.findIndex((agency) => agency.id === id);
      if (index === -1) return null;
      agencies[index] = { ...agencies[index], ...data };
      writeData(AGENCIES_FILE, agencies);
      return agencies[index];
    },
  },
  trips: {
    findMany: (agencyId?: string) => {
      const trips = readData<any[]>(TRIPS_FILE);
      return agencyId ? trips.filter((trip) => trip.agencyId === agencyId) : trips;
    },
    findOne: (id: string) => readData<any[]>(TRIPS_FILE).find((t) => t.id === id),
    create: (data: any) => {
      const trips = readData<any[]>(TRIPS_FILE);
      const newTrip = {
        id: `HOR-${Math.floor(1000 + Math.random() * 9000)}`,
        createdDate: new Date().toLocaleDateString('pt-BR').replace(/\//g, '-'),
        status: 'Pendente',
        itinerary: [],
        ...data,
      };
      trips.push(newTrip);
      writeData(TRIPS_FILE, trips);
      return newTrip;
    },
    update: (id: string, data: any) => {
      const trips = readData<any[]>(TRIPS_FILE);
      const index = trips.findIndex((t) => t.id === id);
      if (index === -1) return null;
      trips[index] = { ...trips[index], ...data };
      writeData(TRIPS_FILE, trips);
      return trips[index];
    },
    delete: (id: string) => {
      const trips = readData<any[]>(TRIPS_FILE);
      const filtered = trips.filter((t) => t.id !== id);
      writeData(TRIPS_FILE, filtered);
      return true;
    }
  },
  clients: {
    findMany: (agencyId?: string) => {
      const clients = readData<any[]>(CLIENTS_FILE);
      return agencyId ? clients.filter((client) => client.agencyId === agencyId) : clients;
    },
    create: (data: any) => {
      const clients = readData<any[]>(CLIENTS_FILE);
      const newClient = {
        id: `client-${Date.now()}`,
        ...data,
      };
      clients.push(newClient);
      writeData(CLIENTS_FILE, clients);
      return newClient;
    },
    delete: (id: string) => {
      const clients = readData<any[]>(CLIENTS_FILE);
      const filtered = clients.filter((c) => c.id !== id);
      writeData(CLIENTS_FILE, filtered);
      return true;
    }
  },
  users: {
    findMany: (agencyId?: string) => {
      const users = readData<any[]>(USERS_FILE);
      const filtered = agencyId ? users.filter((user) => user.agencyId === agencyId) : users;
      return filtered.map(sanitizeUser);
    },
    findOne: (id: string) => sanitizeUser(readData<any[]>(USERS_FILE).find((u) => u.id === id)),
    findByEmail: (email: string) => readData<any[]>(USERS_FILE).find((u) => u.email.toLowerCase() === email.toLowerCase()),
    create: (data: any) => {
      const users = readData<any[]>(USERS_FILE);
      const exists = users.some((u) => u.email.toLowerCase() === data.email.toLowerCase());
      if (exists) {
        throw new Error('E-mail ja cadastrado');
      }
      const { password, ...userData } = data;
      const newUser = {
        id: `user-${Date.now()}`,
        role: 'agent',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
        accessStatus: 'active',
        accessExpiresAt: userData.accessExpiresAt || addDays(new Date(), 30).toISOString(),
        ...userData,
        passwordHash: password ? createPasswordHash(password) : undefined,
      };
      users.push(newUser);
      writeData(USERS_FILE, users);
      return sanitizeUser(newUser);
    },
    update: (id: string, data: any) => {
      const users = readData<any[]>(USERS_FILE);
      const index = users.findIndex((user) => user.id === id);
      if (index === -1) return null;
      users[index] = { ...users[index], ...data };
      writeData(USERS_FILE, users);
      return sanitizeUser(users[index]);
    },
    delete: (id: string) => {
      const users = readData<any[]>(USERS_FILE);
      const filtered = users.filter((u) => u.id !== id);
      writeData(USERS_FILE, filtered);
      return true;
    },
  },
  sessions: {
    create: (userId: string) => {
      const expiresAt = addDays(new Date(), SESSION_TTL_DAYS).toISOString();
      const newSession = {
        id: createSessionToken(userId, expiresAt),
        userId,
        createdAt: new Date().toISOString(),
        expiresAt,
      };
      return newSession;
    },
    findOne: (id: string) => parseSessionToken(id),
    delete: (_id: string) => {
      return true;
    },
  },
  auth: {
    register: (data: any) => {
      if (data.accessKey !== 'rumo123') {
        throw new Error('Chave de acesso invalida');
      }

      if (data.email !== data.emailConfirm) {
        throw new Error('Os e-mails informados nao conferem');
      }

      const agency = db.agencies.create({
        name: data.agencyName || 'Nova Agencia',
        accessExpiresAt: addDays(new Date(), 30).toISOString(),
      });

      return db.users.create({
        fullName: data.fullName,
        agencyId: agency.id,
        email: data.email,
        phone: data.phone || '',
        role: 'agency_admin',
        accessStatus: 'active',
        accessExpiresAt: agency.accessExpiresAt,
        password: data.password,
      });
    },
    registerTraveler: (data: any) => {
      if (!data.fullName || !data.email || !data.password) {
        throw new Error('Dados obrigatorios ausentes');
      }
      if (data.emailConfirm && data.email !== data.emailConfirm) {
        throw new Error('Os e-mails informados nao conferem');
      }

      const inviteToken = data.inviteToken || data.linkOrToken || '';
      const normalizedToken = String(inviteToken).trim().split('/').filter(Boolean).pop() || '';
      const invite = normalizedToken ? db.travelerInvites.findByToken(normalizedToken) : null;
      if (!invite || invite.status !== 'active' || new Date(invite.expiresAt) < new Date()) {
        throw new Error('Cadastro de viajante exige um convite valido de uma agencia');
      }

      const trip = db.trips.findOne(invite.tripId);
      if (!trip || trip.agencyId !== invite.agencyId) {
        throw new Error('Viagem do convite nao encontrada');
      }

      const existingUser = db.users.findByEmail(data.email);
      if (existingUser && existingUser.agencyId !== invite.agencyId) {
        throw new Error('Este e-mail ja pertence a outro tenant/agencia');
      }

      const traveler = db.users.create({
        fullName: data.fullName,
        agencyId: invite.agencyId,
        email: data.email,
        phone: data.phone || '',
        role: 'traveler',
        accessStatus: 'active',
        accessExpiresAt: '2099-12-31T23:59:59.000Z',
        password: data.password,
      });
      db.travelerTrips.importByInviteToken(traveler.id, normalizedToken);
      return traveler;
    },
    login: (email: string, password: string) => {
      const user = db.users.findByEmail(email);
      if (!user || !verifyPasswordHash(password, user.passwordHash)) {
        return null;
      }
      const agency = db.agencies.findOne(user.agencyId);
      const now = new Date();
      const userExpired = user.accessExpiresAt && new Date(user.accessExpiresAt) < now;
      const agencyExpired = agency?.accessExpiresAt && new Date(agency.accessExpiresAt) < now;
      const requiresAgencyAccess = user.role !== 'traveler' && user.role !== 'platform_admin';
      if (
        user.accessStatus !== 'active' ||
        userExpired ||
        (requiresAgencyAccess && (!agency || agency.subscriptionStatus !== 'active' || agencyExpired))
      ) {
        throw new Error('Acesso expirado ou desativado');
      }

      const session = db.sessions.create(user.id);
      return {
        session,
        user: sanitizeUser(user),
      };
    },
    me: (sessionId?: string) => {
      if (!sessionId) return null;
      const session = db.sessions.findOne(sessionId);
      if (!session) return null;
      return db.users.findOne(session.userId);
    },
  },
  travelerTrips: {
    findManyForUser: (userId: string) => {
      const user = db.users.findOne(userId);
      if (!user || user.role !== 'traveler') return [];
      const accessRows = readData<any[]>(TRAVELER_TRIP_ACCESS_FILE).filter(
        (access) => access.userId === userId && access.agencyId === user.agencyId
      );
      return accessRows
        .map((access) => db.trips.findOne(access.tripId))
        .filter(Boolean)
        .filter((trip: any) => trip.agencyId === user.agencyId)
        .map((trip: any) => {
          const agency = db.agencies.findOne(trip.agencyId);
          return {
            ...trip,
            agency: agency
              ? {
                  id: agency.id,
                  name: agency.name,
                  logoUrl: agency.logoUrl,
                  plan: agency.plan,
                }
              : null,
          };
        });
    },
    importByInviteToken: (userId: string, token: string) => {
      const user = db.users.findOne(userId);
      if (!user || user.role !== 'traveler') {
        throw new Error('Acesso permitido apenas para viajantes');
      }

      const normalizedToken = token.trim().split('/').filter(Boolean).pop() || token.trim();
      const invite = db.travelerInvites.findByToken(normalizedToken);
      if (!invite || invite.status !== 'active' || new Date(invite.expiresAt) < new Date()) {
        throw new Error('Convite invalido ou expirado');
      }

      const trip = db.trips.findOne(invite.tripId);
      if (!trip || trip.agencyId !== invite.agencyId) {
        throw new Error('Viagem nao encontrada');
      }
      if (user.agencyId !== invite.agencyId) {
        throw new Error('Este convite pertence a outra agencia');
      }

      const accessRows = readData<any[]>(TRAVELER_TRIP_ACCESS_FILE);
      const existing = accessRows.find(
        (access) => access.userId === userId && access.tripId === trip.id && access.agencyId === invite.agencyId
      );
      if (!existing) {
        accessRows.push({
          id: `traveler-access-${Date.now()}`,
          agencyId: invite.agencyId,
          userId,
          tripId: trip.id,
          inviteId: invite.id,
          travelerName: invite.travelerName,
          createdAt: new Date().toISOString(),
        });
        writeData(TRAVELER_TRIP_ACCESS_FILE, accessRows);
      }
      return trip;
    },
  },
  photos: {
    findMany: () => readData<any[]>(PHOTOS_FILE),
    create: (data: any) => {
      const photos = readData<any[]>(PHOTOS_FILE);
      const newPhoto = {
        id: `photo-${Date.now()}`,
        ...data,
      };
      photos.push(newPhoto);
      writeData(PHOTOS_FILE, photos);
      return newPhoto;
    },
    updateAll: (data: any[]) => {
      writeData(PHOTOS_FILE, data);
      return data;
    }
  },
  folders: {
    findMany: () => readData<string[]>(FOLDERS_FILE),
    create: (name: string) => {
      const folders = readData<string[]>(FOLDERS_FILE);
      if (!folders.includes(name)) {
        folders.push(name);
        writeData(FOLDERS_FILE, folders);
      }
      return name;
    },
    updateAll: (data: string[]) => {
      writeData(FOLDERS_FILE, data);
      return data;
    }
  },
  folderCovers: {
    get: () => readData<Record<string, string>>(FOLDER_COVERS_FILE),
    set: (folderPath: string, url: string) => {
      const covers = readData<Record<string, string>>(FOLDER_COVERS_FILE);
      if (url) {
        covers[folderPath] = url;
      } else {
        delete covers[folderPath];
      }
      writeData(FOLDER_COVERS_FILE, covers);
      return covers;
    },
    save: (covers: Record<string, string>) => {
      writeData(FOLDER_COVERS_FILE, covers);
      return covers;
    }
  },
  libraryOrder: {
    get: () => readData<Record<string, string[]>>(LIBRARY_ORDER_FILE),
    save: (order: Record<string, string[]>) => {
      writeData(LIBRARY_ORDER_FILE, order);
      return order;
    }
  },
  settings: {
    get: (agencyId?: string) => {
      const settings = readData<any>(SETTINGS_FILE);
      const agency = agencyId ? db.agencies.findOne(agencyId) : null;
      return {
        ...settings,
        agencyName: agency?.name || settings.agencyName,
        logoUrl: agency?.logoUrl || settings.logoUrl,
        plan: agency?.plan || settings.plan,
        subscriptionStatus: agency?.subscriptionStatus || 'active',
        accessExpiresAt: agency?.accessExpiresAt || '',
      };
    },
    update: (data: any) => {
      const current = readData<any>(SETTINGS_FILE);
      const updated = { ...current, ...data };
      writeData(SETTINGS_FILE, updated);
      if (data.agencyId) {
        const agencyPatch: Record<string, unknown> = {
          name: data.agencyName,
          logoUrl: data.logoUrl,
        };
        if (typeof data.plan !== 'undefined') agencyPatch.plan = data.plan;
        if (typeof data.subscriptionStatus !== 'undefined') agencyPatch.subscriptionStatus = data.subscriptionStatus;
        if (typeof data.accessExpiresAt !== 'undefined') agencyPatch.accessExpiresAt = data.accessExpiresAt;
        db.agencies.update(data.agencyId, agencyPatch);
      }
      return db.settings.get(data.agencyId);
    }
  },
  notifications: {
    findMany: (agencyId?: string, tripId?: string) => {
      const notifications = readData<any[]>(NOTIFICATIONS_FILE);
      return notifications.filter((notification) => {
        const matchesAgency = !agencyId || notification.agencyId === agencyId;
        const matchesTrip = !tripId || notification.tripId === tripId;
        return matchesAgency && matchesTrip;
      });
    },
    create: (data: any) => {
      const notifications = readData<any[]>(NOTIFICATIONS_FILE);
      const newNotification = {
        id: `notification-${Date.now()}`,
        status: 'queued',
        createdAt: new Date().toISOString(),
        ...data,
      };
      notifications.push(newNotification);
      writeData(NOTIFICATIONS_FILE, notifications);
      return newNotification;
    }
  },
  travelerInvites: {
    findMany: (agencyId?: string, tripId?: string) => {
      const invites = readData<any[]>(TRAVELER_INVITES_FILE);
      return invites.filter((invite) => {
        const matchesAgency = !agencyId || invite.agencyId === agencyId;
        const matchesTrip = !tripId || invite.tripId === tripId;
        return matchesAgency && matchesTrip;
      });
    },
    findByToken: (token: string) => readData<any[]>(TRAVELER_INVITES_FILE).find((invite) => invite.token === token),
    create: (data: any) => {
      const invites = readData<any[]>(TRAVELER_INVITES_FILE);
      const token = crypto.randomBytes(24).toString('hex');
      const newInvite = {
        id: `invite-${Date.now()}`,
        token,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt || addDays(new Date(), 30).toISOString(),
        ...data,
      };
      invites.push(newInvite);
      writeData(TRAVELER_INVITES_FILE, invites);
      return newInvite;
    },
  },
  aiGenerations: {
    findMany: (tripId?: string, agencyId?: string) => {
      const logs = readData<any[]>(AI_GENERATIONS_FILE);
      return logs.filter((log) => {
        const matchesTrip = !tripId || log.tripId === tripId;
        const matchesAgency = !agencyId || log.agencyId === agencyId;
        return matchesTrip && matchesAgency;
      });
    },
    create: (data: any) => {
      const logs = readData<any[]>(AI_GENERATIONS_FILE);
      const entry = {
        id: `gen-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        createdAt: new Date().toISOString(),
        ...data,
      };
      logs.push(entry);
      writeData(AI_GENERATIONS_FILE, logs);
      return entry;
    },
  },
};
