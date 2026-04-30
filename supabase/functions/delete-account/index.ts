import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, string | boolean>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase environment is not configured.' }, 500);
    }

    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user?.id) {
      return jsonResponse({ error: 'Unable to verify the current user.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const userId = user.id;

    const deleteByUserId = async (table: string) => {
      const { error } = await adminClient.from(table).delete().eq('user_id', userId);
      if (error) {
        throw new Error(`${table}: ${error.message}`);
      }
    };

    // Remove child rows first to avoid foreign key violations.
    await deleteByUserId('sequence_poses');
    await deleteByUserId('attendances');
    await deleteByUserId('memberships');
    await deleteByUserId('classes');
    await deleteByUserId('members');
    await deleteByUserId('products');
    await deleteByUserId('sequences');

    const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId);
    if (profileError) {
      throw new Error(`profiles: ${profileError.message}`);
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      throw new Error(`auth: ${authDeleteError.message}`);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete-account error.';
    return jsonResponse({ error: message }, 500);
  }
});
