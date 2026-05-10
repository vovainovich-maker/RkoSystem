import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/**
 * Redeem an access key: assigns the calling user to the key's team and role.
 * Accepts a JWT token directly so auth works reliably regardless of middleware.
 */
export const redeemAccessKey = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({ key: z.string().min(4), token: z.string().min(10) }).parse(data))
  .handler(async ({ data }) => {
    // Verify token and get user ID
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(data.token);
    if (authErr || !authData?.user) throw new Error('Не авторизован');
    const userId = authData.user.id;

    // Find the access key
    const { data: key, error } = await supabaseAdmin
      .from('access_keys')
      .select('*')
      .eq('key_value', data.key)
      .eq('active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!key) throw new Error('Ключ не найден или отключён');
    if (key.expires_at && new Date(key.expires_at) < new Date()) throw new Error('Ключ истёк');
    if (key.max_uses && key.max_uses > 0 && (key.uses ?? 0) >= key.max_uses) throw new Error('Лимит использований исчерпан');

    // Check if user already used this key
    const { data: existingUsage } = await supabaseAdmin
      .from('access_key_usage')
      .select('id')
      .eq('access_key_id', key.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingUsage) throw new Error('Вы уже использовали этот ключ');

    // 1. Assign user to team
    let teamName = '';
    if (key.team_id) {
      // Add to team_members
      await supabaseAdmin.from('team_members').upsert(
        { team_id: key.team_id, user_id: userId, team_role: key.assigned_role || 'member' },
        { onConflict: 'team_id,user_id' } as any
      );
      // Get team name for profile
      const { data: team } = await supabaseAdmin.from('teams').select('name').eq('id', key.team_id).single();
      teamName = team?.name || '';
      // Update profile with team_id and team name
      await supabaseAdmin.from('profiles').update({
        team_id: key.team_id,
        team: teamName || null,
      }).eq('user_id', userId);
    }

    // 2. Assign role
    let role = key.assigned_role || 'user';
    // Map 'team_lead' or 'owner_team' to 'teamlead' to match DB schema if needed
    if (role === 'team_lead' || role === 'owner_team') role = 'teamlead';
    
    if (['user', 'teamlead', 'admin', 'super_admin'].includes(role)) {
      const { data: existing } = await supabaseAdmin.from('user_roles').select('id').eq('user_id', userId).maybeSingle();
      if (existing) {
        await supabaseAdmin.from('user_roles').update({ role: role as any }).eq('user_id', userId);
      } else {
        await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: role as any });
      }
    }

    // 3. Increment usage counter
    await supabaseAdmin.from('access_keys').update({
      uses: (key.uses ?? 0) + 1,
    }).eq('id', key.id);

    // 4. Log the usage
    await supabaseAdmin.from('access_key_usage').insert({
      access_key_id: key.id,
      user_id: userId,
    });

    return { ok: true, team_id: key.team_id, team_name: teamName, role };
  });

/**
 * Impersonate user — Full session switch.
 * Generates magic link tokens for both the target user and the admin (for return).
 * Only accessible by admin / super_admin roles.
 */
export const impersonateUserV2 = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ targetUserId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const adminId = context.userId;

    // 1. Verify caller is admin
    const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', adminId);
    const adminRole = (roles || []).find((r: any) => r.role === 'admin' || r.role === 'super_admin')?.role;
    if (!adminRole) throw new Error('Только администратор может это делать');

    // 2. Get target user info
    const { data: target, error: terr } = await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    if (terr || !target?.user?.email) throw new Error('Пользователь не найден или нет email');

    // Get target profile for name
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('name,team_id')
      .eq('user_id', data.targetUserId)
      .single();

    // 3. Generate magic link for target user
    const { data: link, error: lerr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: target.user.email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (lerr || !tokenHash) throw new Error(lerr?.message || 'Не удалось создать сессию');

    // 4. Generate return magic link for admin
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(adminId);
    let returnTokenHash: string | null = null;
    let adminEmail: string | null = adminUser?.user?.email || null;
    if (adminEmail) {
      const { data: adminLink } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: adminEmail,
      });
      returnTokenHash = adminLink?.properties?.hashed_token || null;
    }

    // Get admin profile name
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('user_id', adminId)
      .single();

    // 5. Log impersonation
    await supabaseAdmin.from('impersonation_logs').insert({
      admin_user_id: adminId,
      target_user_id: data.targetUserId,
      reason: 'admin login as user',
    });

    return {
      tokenHash,
      email: target.user.email,
      targetName: targetProfile?.name || target.user.email,
      returnTokenHash,
      adminEmail,
      adminName: adminProfile?.name || 'Admin',
      adminRole,
    };
  });