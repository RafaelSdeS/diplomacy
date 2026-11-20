import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CHAVE, SUPABASE_URL } from '$app/env/public';
import type { Database } from './database.types.ts';

// Cliente único do app. A sessão fica no navegador e é renovada sozinha.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_CHAVE);

export type Participacao = Database['public']['Views']['minhas_participacoes']['Row'];
export type Papel = Database['public']['Enums']['papel'];
