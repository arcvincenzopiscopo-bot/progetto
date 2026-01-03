import { supabase } from './supabaseClient';

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  full_name?: string;
  avatar_url?: string;
}

export const createUserProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: userId,
          email: email,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data ? data[0] : null;
  } catch (err) {
    console.error('Unexpected error creating user profile:', err);
    return null;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error fetching user profile:', err);
    return null;
  }
};

export {};
