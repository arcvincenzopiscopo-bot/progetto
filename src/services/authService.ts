import { supabase } from './supabaseClient';

interface User {
  id: string;
  username: string;
  password: string; // In un'applicazione reale, dovrebbe essere hashata
  team?: string; // Campo opzionale per il team
  admin?: number; // Campo per i privilegi di amministratore (0 = non admin, 1 = admin)
  created_at: string;
}

export const registerUser = async (username: string, password: string): Promise<User | null> => {
  try {
    console.log('Attempting to register user:', username);

    // Verifica se l'utente esiste già
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username);

    if (checkError) {
      console.error('Error checking existing user:', checkError.message);
      console.error('Details:', checkError.details);
      console.error('Hint:', checkError.hint);
      return null;
    }

    if (existingUsers && existingUsers.length > 0) {
      console.error('Username already exists');
      return null;
    }

    // Crea il nuovo utente
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          password, // In produzione, usa bcrypt per hashare la password
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error creating user:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('No data returned after user creation');
      return null;
    }

    console.log('User created successfully:', data[0]);
    return data[0];
  } catch (err) {
    console.error('Unexpected error in registerUser:', err);
    return null;
  }
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error logging in:', error);
      return null;
    }

    if (!data) {
      console.error('User not found');
      return null;
    }

    // In un'applicazione reale, dovresti verificare la password hashata
    // Esempio: const isValid = await bcrypt.compare(password, data.password);
    if (data.password !== password) {
      console.error('Invalid password');
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in loginUser:', err);
    return null;
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getUserById:', err);
    return null;
  }
};

// Funzione di compressione immagini
export const compressImage = async (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Validazione file
    if (!file.type.startsWith('image/')) {
      reject(new Error('Il file deve essere un\'immagine'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      reject(new Error('Il file è troppo grande (max 10MB)'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calcola nuove dimensioni mantenendo aspect ratio
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Disegna immagine ridimensionata
      ctx?.drawImage(img, 0, 0, width, height);

      // Converti a blob con compressione
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          reject(new Error('Errore nella compressione dell\'immagine'));
        }
      }, 'image/jpeg', quality);
    };

    img.onerror = () => {
      reject(new Error('Errore nel caricamento dell\'immagine'));
    };

    img.src = URL.createObjectURL(file);
  });
};

// Funzione di upload foto su Cloudinary
export const uploadPhoto = async (file: File, poiId: string): Promise<string> => {
  try {
    // Ridimensiona l'immagine a massimo 1800x1800 pixel prima dell'upload
    const resizedFile = await compressImage(file, 1800, 1800, 0.9);

    console.log(`Immagine ridimensionata: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(resizedFile.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Dimensioni: massima 1800x1800 pixel`);

    // Crea FormData per Cloudinary
    const formData = new FormData();
    formData.append('file', resizedFile);
    formData.append('upload_preset', 'poi-photos-preset'); // Preset unsigned
    formData.append('public_id', `poi-${poiId}-${Date.now()}`); // Nome univoco
    formData.append('folder', 'poi-photos'); // Cartella organizzativa

    // Upload a Cloudinary
    const response = await fetch('https://api.cloudinary.com/v1_1/dnewqku2w/image/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Errore nella risposta di Cloudinary');
    }

    const result = await response.json();

    if (!result.secure_url) {
      throw new Error('Errore nell\'upload della foto');
    }

    console.log('Foto caricata con successo:', result.secure_url);
    return result.secure_url;

  } catch (error) {
    console.error('Errore nell\'upload della foto:', error);
    throw error;
  }
};

// Funzione per eliminare una foto da Cloudinary
export const deletePhotoFromCloudinary = async (photoUrl: string): Promise<void> => {
  try {
    // Estrai il public_id dall'URL di Cloudinary
    // URL format: https://res.cloudinary.com/dnewqku2w/image/upload/v1234567890/poi-photos/poi-123-456789.jpg
    // Dobbiamo estrarre solo il public_id senza il timestamp e l'estensione
    // Esempio: da "v1767535800/poi-photos/poi-aabcc1d6-3f0a-40ed-bde3-9873bd820838-1767535800713"
    // Dobbiamo ottenere "poi-photos/poi-aabcc1d6-3f0a-40ed-bde3-9873bd820838-1767535800713"

    // Rimuovi il protocollo e il dominio
    const urlWithoutProtocol = photoUrl.replace('https://res.cloudinary.com/dnewqku2w/image/upload/', '');
    // Dividi per ottenere le parti dopo il dominio
    const parts = urlWithoutProtocol.split('/');
    // Prendi solo le parti della cartella e del filename (ignora il timestamp v1234567890)
    const folderAndFile = parts.filter(part => !part.startsWith('v')).join('/');
    // Rimuovi l'estensione .jpg
    const publicId = folderAndFile.split('.')[0];

    if (!publicId) {
      console.error('Impossibile estrarre il public_id dall\'URL della foto');
      return;
    }

    console.log('Tentativo di eliminazione della foto da Cloudinary:', publicId);

    // Verifica se le credenziali Cloudinary sono disponibili
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dnewqku2w';
    const apiKey = process.env.REACT_APP_CLOUDINARY_API_KEY;
    const apiSecret = process.env.REACT_APP_CLOUDINARY_API_SECRET;

    // Se le credenziali non sono configurate, fornisci istruzioni per l'eliminazione manuale
    if (!apiKey || !apiSecret || apiKey === 'your_api_key_here' || apiSecret === 'your_api_secret_here') {
      console.warn('⚠️ Credenziali Cloudinary non configurate. Eliminazione manuale richiesta.');
      console.log('📷 Foto da eliminare manualmente da Cloudinary:', photoUrl);
      console.log('Public ID:', publicId);
      console.log('Istruzioni per eliminazione manuale:');
      console.log('1. Accedi al dashboard Cloudinary');
      console.log('2. Vai alla cartella "poi-photos"');
      console.log('3. Trova e elimina manualmente questa immagine');
      return;
    }

    // Se le credenziali sono disponibili, procedi con l'eliminazione automatica
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;

      // Calcola la firma SHA-1
      // Nota: In un ambiente browser, dobbiamo usare l'API Web Crypto
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureString);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: apiKey,
          timestamp: timestamp,
          signature: signature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Errore nell\'eliminazione della foto da Cloudinary:', errorData);
        throw new Error('Errore nell\'eliminazione della foto da Cloudinary');
      }

      const result = await response.json();
      console.log('Foto eliminata da Cloudinary con successo:', result);

    } catch (cloudinaryError) {
      console.error('Errore nell\'eliminazione automatica da Cloudinary:', cloudinaryError);
      console.warn('Eliminazione automatica fallita. Eliminazione manuale richiesta.');
      console.log('📷 Foto da eliminare manualmente da Cloudinary:', photoUrl);
      console.log('Public ID:', publicId);
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione della foto da Cloudinary:', error);
    // Non lanciamo l'errore per non bloccare l'eliminazione del POI
  }
};

// Funzione per eliminare una foto
export const deletePhoto = async (photoUrl: string): Promise<void> => {
  try {
    // Estrai il nome del file dall'URL
    const fileName = photoUrl.split('/').pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from('poi-photos')
      .remove([fileName]);

    if (error) {
      console.error('Errore nell\'eliminazione della foto:', error);
    }
  } catch (error) {
    console.error('Errore nell\'eliminazione della foto:', error);
  }
};

export const ensureUsersTableExists = async (): Promise<boolean> => {
  try {
    // Prova a verificare se la tabella esiste
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    // Se non c'è errore, la tabella esiste
    if (!error) {
      console.log('Users table already exists');
      return true;
    }

    // Se c'è un errore, potrebbe essere che la tabella non esiste
    console.log('Users table does not exist, attempting to create it...');

    // In un'applicazione reale, dovresti usare l'API di Supabase per creare tabelle
    // Per ora, restituisci false per indicare che la tabella non esiste
    console.error('Cannot automatically create tables with client-side Supabase. Please create the table manually.');
    return false;
  } catch (err) {
    console.error('Error checking users table:', err);
    return false;
  }
};

export {};
