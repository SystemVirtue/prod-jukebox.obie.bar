import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, SkipForward, Volume2, Plus, Trash2 } from 'lucide-react';

export default function Admin() {
  const [userId, setUserId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [volume, setVolume] = useState([50]);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadPlaylist(session.user.id);
      }
    });
  }, []);

  const loadPlaylist = async (uid: string) => {
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', uid)
      .order('position');

    if (data) setPlaylist(data);
  };

  const sendControl = async (action: string, videoId?: string) => {
    if (!userId) return;

    const channel = supabase.channel(`user:${userId}`);
    await channel.send({
      type: 'broadcast',
      event: 'player_control',
      payload: { action, videoId, volume: volume[0] },
    });

    toast({ title: `Sent ${action} command` });
  };

  const approveDevice = async () => {
    if (!userId || !deviceId) return;

    const { error } = await (supabase
      .from('approved_devices') as any)
      .insert([{ device_id: deviceId, user_id: userId }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Device approved successfully' });
      setDeviceId('');
    }
  };

  const addToPlaylist = async (videoId: string, title: string) => {
    if (!userId) return;

    const position = playlist.length;
    const { error } = await (supabase
      .from('playlists') as any)
      .insert([{ user_id: userId, video_id: videoId, title, artist: '', position }]);

    if (!error) {
      loadPlaylist(userId);
      toast({ title: 'Added to playlist' });
    }
  };

  const removeFromPlaylist = async (id: string) => {
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (!error && userId) {
      loadPlaylist(userId);
      toast({ title: 'Removed from playlist' });
    }
  };

  const reorderPlaylist = async (fromIndex: number, toIndex: number) => {
    const newPlaylist = [...playlist];
    const [moved] = newPlaylist.splice(fromIndex, 1);
    newPlaylist.splice(toIndex, 0, moved);

    // Update positions in database
    for (let i = 0; i < newPlaylist.length; i++) {
      await (supabase
        .from('playlists') as any)
        .update({ position: i })
        .eq('id', newPlaylist[i].id);
    }

    if (userId) loadPlaylist(userId);
  };

  if (!userId) {
    return <div className="p-4">Please sign in</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Player Controls</CardTitle>
          <CardDescription>Control your music player</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => sendControl('play')} size="lg">
              <Play className="mr-2" /> Play
            </Button>
            <Button onClick={() => sendControl('pause')} size="lg" variant="outline">
              <Pause className="mr-2" /> Pause
            </Button>
            <Button onClick={() => sendControl('next')} size="lg" variant="outline">
              <SkipForward className="mr-2" /> Next
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 />
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-right">{volume[0]}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approve Device</CardTitle>
          <CardDescription>Enter the device ID shown on the player</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
            <Button onClick={approveDevice}>Approve</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playlist</CardTitle>
          <CardDescription>Manage your playlist</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {playlist.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="flex-1">{item.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFromPlaylist(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
