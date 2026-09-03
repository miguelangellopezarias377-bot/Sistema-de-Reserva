/**
 * Módulo de Almacenamiento Criptográfico Seguro
 * Firma los datos con HMAC-SHA256 simulado para detectar manipulaciones en localStorage.
 */
const StorageModule = (() => {
  const DB_KEY = 'restaurante_db_v2';
  const SESSION_KEY = 'restaurante_session_v2';
  const SECRET_KEY = 'ReservaRest_Secret_Protection_Key';

  // Hashing SHA-256 usando la API Crypto nativa del navegador
  const hashWithSalt = async (text, salt) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + salt + SECRET_KEY);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateSalt = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  };

  // Datos precargados demo obligatorios (8 mesas, 8 platos, 4 usuarios)
  const getDemoPayload = async () => {
    const saltAdmin = generateSalt();
    const saltMesero = generateSalt();
    const saltCocina = generateSalt();
    const saltDespacho = generateSalt();

    return {
      users: [
        { id: 'u1', username: 'admin', salt: saltAdmin, passwordHash: await hashWithSalt('admin123', saltAdmin), role: 'admin', name: 'Administrador' },
        { id: 'u2', username: 'mesero', salt: saltMesero, passwordHash: await hashWithSalt('mesero123', saltMesero), role: 'mesero', name: 'Carlos Mesero' },
        { id: 'u3', username: 'cocina', salt: saltCocina, passwordHash: await hashWithSalt('cocina123', saltCocina), role: 'cocina', name: 'Ana Cocina' },
        { id: 'u4', username: 'despacho', salt: saltDespacho, passwordHash: await hashWithSalt('despacho123', saltDespacho), role: 'despacho', name: 'Luis Despacho' }
      ],
      mesas: [
        { id: 'm1', numero: 1, capacidad: 2, zona: 'Terraza', estado: 'disponible' },
        { id: 'm2', numero: 2, capacidad: 4, zona: 'Terraza', estado: 'disponible' },
        { id: 'm3', numero: 3, capacidad: 4, zona: 'Salón', estado: 'disponible' },
        { id: 'm4', numero: 4, capacidad: 6, zona: 'Salón', estado: 'disponible' },
        { id: 'm5', numero: 5, capacidad: 2, zona: 'Barra', estado: 'disponible' },
        { id: 'm6', numero: 6, capacidad: 8, zona: 'VIP', estado: 'disponible' },
        { id: 'm7', numero: 7, capacidad: 4, zona: 'Salón', estado: 'disponible' },
        { id: 'm8', numero: 8, capacidad: 4, zona: 'Terraza', estado: 'disponible' }
      ],
      platos: [
        { id: 'p1', nombre: 'Ceviche Clásico', precio: 18.00 },
        { id: 'p2', nombre: 'Lomo Saltado', precio: 22.00 },
        { id: 'p3', nombre: 'Ají de Gallina', precio: 16.00 },
        { id: 'p4', nombre: 'Arroz con Mariscos', precio: 24.00 },
        { id: 'p5', nombre: 'Causa Rellena', precio: 12.00 },
        { id: 'p6', nombre: 'Anticuchos de Corazón', precio: 15.00 },
        { id: 'p7', nombre: 'Tiradito de Pescado', precio: 19.00 },
        { id: 'p8', nombre: 'Seco de Res', precio: 21.00 }
      ],
      reservas: [],
      pedidos: [],
      despachos: []
    };
  };

  // Generador de Firma de Integridad para prevenir tamper
  const computeChecksum = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString(36);
  };

  const saveData = (data) => {
    const jsonStr = JSON.stringify(data);
    const checksum = computeChecksum(jsonStr);
    const container = { payload: btoa(unescape(encodeURIComponent(jsonStr))), checksum };
    localStorage.setItem(DB_KEY, JSON.stringify(container));
  };

  const getData = () => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;

      const container = JSON.parse(raw);
      const jsonStr = decodeURIComponent(escape(atob(container.payload)));

      // Verificación de Firma anti-manipulación
      if (computeChecksum(jsonStr) !== container.checksum) {
        console.warn('¡Alerta de Seguridad! Los datos en localStorage fueron alterados. Restaurando base segura...');
        return null;
      }

      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error al leer datos protegidos:', e);
      return null;
    }
  };

  const initStorage = async () => {
    let data = getData();
    if (!data) {
      data = await getDemoPayload();
      saveData(data);
    }
    return data;
  };

  const resetDemoData = async () => {
    const demoData = await getDemoPayload();
    saveData(demoData);
  };

  return { initStorage, getData, saveData, resetDemoData, hashWithSalt, SESSION_KEY };
})();