import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/routes/__root';

export const Route = createFileRoute('/my-team')({ component: MyTeamPage });

function MyTeamPage() {
  const auth = useAuthContext();
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.user) return;
    (async () => {
      const sb = supabase as any;
      const { data: tm } = await sb.from('team_members').select('team_id').eq('user_id', auth.user!.id).maybeSingle();
      if (tm?.team_id) { setTeamId(tm.team_id); return; }
      const { data: own } = await sb.from('teams').select('id').eq('owner_user_id', auth.user!.id).maybeSingle();
      if (own?.id) setTeamId(own.id);
    })();
  }, [auth.user]);

  if (!teamId) return <div className="p-6 text-muted-foreground">Вы не состоите ни в одной команде</div>;

  return (
    <div className="p-6">
      <Link to="/teams/$teamId" params={{ teamId }} className="text-emerald underline">Перейти к моей команде →</Link>
    </div>
  );
}