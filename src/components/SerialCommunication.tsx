
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
  coinValueA: number;
  coinValueB: number;
}

export const useSerialCommunication = ({
  mode,
  selectedCoinAcceptor,
  onCreditsChange,
  credits,
  onAddLog,
  coinValueA,
  coinValueB
}: SerialCommunicationProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (mode === 'PAID' && selectedCoinAcceptor && selectedCoinAcceptor !== 'none' && 'serial' in navigator) {
      setupSerialConnection();
    }
  }, [mode, selectedCoinAcceptor, coinValueA, coinValueB]);

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
                onCreditsChange(credits + coinValueA);
                onAddLog('CREDIT_ADDED', `COIN DEPOSITED - $${coinValueA} ("a")`, undefined, coinValueA);
                toast({ title: "Credit Added", description: `+${coinValueA} Credit${coinValueA > 1 ? 's' : ''} from coin acceptor` });
              } else if (text.includes('b')) {
                onCreditsChange(credits + coinValueB);
                onAddLog('CREDIT_ADDED', `COIN DEPOSITED - $${coinValueB} ("b")`, undefined, coinValueB);
                toast({ title: "Credits Added", description: `+${coinValueB} Credits from coin acceptor` });
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
