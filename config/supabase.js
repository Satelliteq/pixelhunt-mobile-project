import { createClient } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';

const supabaseUrl = 'https://amikewcdxjzqrpoqwizr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtld2NkeGp6cXJwb3F3aXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMzk5NjksImV4cCI6MjA1NzYxNTk2OX0.MZWorujMKcfZJr86q8N5s83SeReIbXjfOQdfISBcO54';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Storage error:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Storage error:', error);
        }
      },
    },
  },
  db: {
    schema: 'public'
  }
});

export const isSupabaseConfigured = () => {
  return true;
};

export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign in error:', error.message);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({ native: 'pixelhunt://auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Google sign in error:', error.message);
    throw error;
  }
};

export const signUpWithEmail = async (email, password, name) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          avatar_url: null,
        },
      },
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign up error:', error.message);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error.message);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AuthSession.makeRedirectUri({ native: 'pixelhunt://auth/callback' })
    });
    if (error) throw error;
  } catch (error) {
    console.error('Password reset error:', error.message);
    throw error;
  }
};

// Veri çekme yardımcı fonksiyonları
export const fetchTests = async (options = {}) => {
  try {
    let query = supabase
      .from('tests')
      .select('*, category:categories!tests_category_id_fkey(*)');

    if (options.featured) {
      query = query.eq('featured', true);
    }

    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending || false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tests:', error);
    throw error;
  }
};

export const fetchCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const fetchUserTests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*, category:categories!tests_category_id_fkey(*)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user tests:', error);
    throw error;
  }
}; 