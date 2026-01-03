import { supabase } from './supabaseClient';

interface User {
  id: string;
  username: string;
  password: string; // In un'applicazione reale, dovrebbe essere hashata
  team?: string; // Campo opzionale per il team
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

export const ensureUsersTableExists = async (): Promise<boolean> => {
  try {
    // Prova a verificare se la tabella esiste
    const { data, error } = await supabase
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
