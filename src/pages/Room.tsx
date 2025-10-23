import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, SkipForward } from 'lucide-react';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadRoom();
      } else {
        navigate('/auth');
      }
    });
  }, [roomId]);

  const loadRoom = async () => {
    if (!roomId) return;

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomData) {
      setRoom(roomData);
      loadRoomPlaylist(roomId);
      subscribeToRoomUpdates(roomId);
    }
  };

  const loadRoomPlaylist = async (rId: string) => {
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('room_id', rId)
      .order('position');

    if (data) setPlaylist(data);
  };

  const subscribeToRoomUpdates = (rId: string) => {
    const channel = supabase.channel(`room:${rId}`);
    
    channel
      .on('broadcast', { event: 'room_update' }, (payload) => {
        console.log('Room update:', payload);
        loadRoomPlaylist(rId);
      })
      .subscribe();
  };

  const sendRoomControl = async (action: string) => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`);
    await channel.send({
      type: 'broadcast',
      event: 'room_control',
      payload: { action, userId },
    });

    toast({ title: `Sent ${action} command` });
  };

  if (!room) {
    return <div className="p-4">Loading room...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle>{room.name}</CardTitle>
          <CardDescription>Shared Room - Everyone can control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => sendRoomControl('play')}>
              <Play className="mr-2" /> Play
            </Button>
            <Button onClick={() => sendRoomControl('pause')} variant="outline">
              <Pause className="mr-2" /> Pause
            </Button>
            <Button onClick={() => sendRoomControl('next')} variant="outline">
              <SkipForward className="mr-2" /> Next
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Playlist</h3>
            {playlist.map((item) => (
              <div key={item.id} className="p-2 bg-muted rounded">
                {item.title}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
