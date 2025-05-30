
import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  timestamp: string;
  type: 'SONG_PLAYED' | 'USER_SELECTION' | 'CREDIT_ADDED' | 'CREDIT_REMOVED';
  description: string;
  videoId?: string;
  creditAmount?: number;
}

interface SerialCommunicationProps {
  mode: 'FREEPLAY' | 'PAID';
  selectedCoinAcceptor: string;
  onCreditsChange: (credits: number) => void;
  credits: number;
  onAddLog: (type: LogEntry['type'], description: string, videoId?: string, creditAmount?: number) => void;
}

export const useSerialCommunication = ({
  mode,
  selectedCoinAcceptor,
  onCreditsChange,
  credits,
  onAddLog
}: SerialCommunicationProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (mode === 'PAID' && selectedCoinAcceptor && selectedCoinAcceptor !== 'none' && 'serial' in navigator) {
      setupSerialConnection();
    }
  }, [mode, selectedCoinAcceptor]);

  const setupSerialConnection = async () => {
    try {
      if ('serial' in navigator) {
        const ports = await (navigator as any).serial.getPorts();
        let targetPort = ports.find((port: any) => 
          port.getInfo().usbProductId === 1420 || 
          port.getInfo().serialNumber?.includes('usbserial-1420')
        );

        if (!targetPort) {
          targetPort = await (navigator as any).serial.requestPort();
        }

        await targetPort.open({ baudRate: 9600 });

        const reader = targetPort.readable.getReader();
        const decoder = new TextDecoder();

        const readLoop = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              
              const text = decoder.decode(value);
              if (text.includes('a')) {
                onCreditsChange(credits + 1);
                onAddLog('CREDIT_ADDED', 'COIN DEPOSITED - $1 ("a")', undefined, 1);
                toast({ title: "Credit Added", description: "+1 Credit from coin acceptor" });
              } else if (text.includes('b')) {
                onCreditsChange(credits + 3);
                onAddLog('CREDIT_ADDED', 'COIN DEPOSITED - $3 ("b")', undefined, 3);
                toast({ title: "Credits Added", description: "+3 Credits from coin acceptor" });
              }
            }
          } catch (error) {
            console.error('Serial read error:', error);
          }
        };

        readLoop();
      }
    } catch (error) {
      console.error('Serial connection error:', error);
      toast({
        title: "Serial Connection Error",
        description: "Failed to connect to coin acceptor",
        variant: "destructive"
      });
    }
  };
};
