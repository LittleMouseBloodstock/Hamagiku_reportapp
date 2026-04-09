const { createClient } = require('@supabase/supabase-js');

function resolveSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';

  return {
    url: String(url).trim(),
    serviceRole: String(serviceRole).trim(),
  };
}

function createSupabaseAdminClient() {
  const { url, serviceRole } = resolveSupabaseAdminConfig();
  if (!url || !serviceRole) return null;

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = {
  resolveSupabaseAdminConfig,
  createSupabaseAdminClient,
};
