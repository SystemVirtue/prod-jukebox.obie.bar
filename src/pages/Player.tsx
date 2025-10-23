import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Player() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [isApproved, setIsApproved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get or create device ID
    let storedDeviceId = localStorage.getItem('player_device_id');
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID();
      localStorage.setItem('player_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        checkDeviceApproval(storedDeviceId, session.user.id);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        checkDeviceApproval(storedDeviceId, session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkDeviceApproval = async (devId: string, uid: string) => {
    const { data, error } = await supabase
      .from('approved_devices')
      .select('*')
      .eq('device_id', devId)
      .eq('user_id', uid)
      .single();

    if (data && !error) {
      setIsApproved(true);
      subscribeToRealtime(uid);
    }
  };

  const subscribeToRealtime = (uid: string) => {
    const channel = supabase.channel(`user:${uid}`);
    
    channel
      .on('broadcast', { event: 'player_control' }, (payload) => {
        console.log('Received control:', payload);
        handlePlayerControl(payload.payload);
      })
      .subscribe();

    // Load playlist
    loadPlaylist(uid);
  };

  const loadPlaylist = async (uid: string) => {
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', uid)
      .order('position');

    if (data && data.length > 0) {
      playVideo((data as any)[0].video_id);
    }
  };

  const handlePlayerControl = (control: any) => {
    switch (control.action) {
      case 'play':
        playVideo(control.videoId);
        break;
      case 'pause':
        // Implement pause
        break;
      case 'next':
        // Implement next
        break;
      case 'volume':
        // Implement volume
        break;
    }
  };

  const playVideo = (videoId: string) => {
    setCurrentVideo(videoId);
    // YouTube IFrame API implementation here
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to use the player</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Device Approval Required</CardTitle>
            <CardDescription>Enter this ID in the admin panel to approve this device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-bold text-center p-8 bg-muted rounded-lg">
              {deviceId}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div id="youtube-player" className="w-full h-screen"></div>
      {currentVideo && (
        <div className="fixed bottom-4 left-4 bg-card p-4 rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground">Now Playing:</p>
          <p className="font-semibold">{currentVideo}</p>
        </div>
      )}
    </div>
  );
}
