import { supabase } from './supabaseClient';

export async function testSupabaseConnection(): Promise<boolean> {
  const { error } = await supabase
    .from('supabase_test')
    .select('id')
    .limit(1);

  if (error) {
    console.error(
      'Supabase connection test:',
      error.message,
    );

    return false;
  }

  return true;
}
