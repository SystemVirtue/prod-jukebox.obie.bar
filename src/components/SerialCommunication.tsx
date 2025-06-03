import { useEffect, useState } from 'react';
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
  onCreditsChange: (delta: number) => void;
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

  // Track connection status
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'connecting' | 'error'>('disconnected');
  
  useEffect(() => {
    if (mode === 'PAID' && selectedCoinAcceptor && selectedCoinAcceptor !== 'none' && 'serial' in navigator) {
      setConnectionStatus('connecting');
      setupSerialConnection();
    } else {
      setConnectionStatus('disconnected');
    }
    
    // Attempt reconnection every 30 seconds if in error state
    const reconnectionInterval = setInterval(() => {
      if (connectionStatus === 'error' && mode === 'PAID' && selectedCoinAcceptor && selectedCoinAcceptor !== 'none' && 'serial' in navigator) {
        console.log('Attempting to reconnect to coin acceptor...');
        setConnectionStatus('connecting');
        setupSerialConnection();
      }
    }, 30000);
    
    return () => clearInterval(reconnectionInterval);
  }, [mode, selectedCoinAcceptor, coinValueA, coinValueB, connectionStatus]);
  
  // Log connection status changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      onAddLog('CREDIT_ADDED', 'Coin acceptor connected successfully', undefined, 0);
      toast({
        title: "Coin Acceptor Connected",
        description: "Ready to accept coins"
      });
    } else if (connectionStatus === 'error') {
      onAddLog('CREDIT_ADDED', 'Coin acceptor connection error', undefined, 0);
    }
  }, [connectionStatus]);

  const setupSerialConnection = async () => {
    try {
      if (!('serial' in navigator)) {
        console.error('Web Serial API not supported');
        setConnectionStatus('error');
        toast({
          title: "Serial API Not Supported",
          description: "This browser doesn't support Web Serial API",
          variant: "destructive"
        });
        return;
      }

      // Log the connection attempt
      console.log('Attempting to connect to coin acceptor...');
      
      const ports = await (navigator as any).serial.getPorts();
      let targetPort = ports.find((port: any) => 
        port.getInfo().usbProductId === 1420 || 
        port.getInfo().serialNumber?.includes('usbserial-1420')
      );

      if (!targetPort) {
        try {
          console.log('No previous connection found, requesting port selection...');
          targetPort = await (navigator as any).serial.requestPort();
        } catch (portError) {
          console.error('User cancelled port selection or no ports available:', portError);
          setConnectionStatus('error');
          toast({
            title: "Port Selection Cancelled",
            description: "No coin acceptor was selected",
            variant: "destructive"
          });
          return;
        }
      }

      try {
        await targetPort.open({ baudRate: 9600 });
        console.log('Serial port opened successfully');
      } catch (openError) {
        console.error('Failed to open serial port:', openError);
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to open serial port. Device may be in use by another application.",
          variant: "destructive"
        });
        return;
      }

      // Set up reader
      let reader;
      try {
        reader = targetPort.readable.getReader();
        const decoder = new TextDecoder();
        
        // Update connection status to connected
        setConnectionStatus('connected');
        
        // Read loop with improved error handling
        const readLoop = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                console.log('Serial connection closed');
                setConnectionStatus('disconnected');
                break;
              }
              
              const text = decoder.decode(value);
              console.log('Received data from coin acceptor:', text);
              
              if (text.includes('a')) {
                onCreditsChange(coinValueA);
                onAddLog('CREDIT_ADDED', `COIN DEPOSITED - $${coinValueA} ("a")`, undefined, coinValueA);
                toast({ 
                  title: "Credit Added", 
                  description: `+${coinValueA} Credit${coinValueA > 1 ? 's' : ''} from coin acceptor` 
                });
              } else if (text.includes('b')) {
                onCreditsChange(coinValueB);
                onAddLog('CREDIT_ADDED', `COIN DEPOSITED - $${coinValueB} ("b")`, undefined, coinValueB);
                toast({ 
                  title: "Credits Added", 
                  description: `+${coinValueB} Credits from coin acceptor` 
                });
              }
            }
          } catch (error) {
            console.error('Serial read error:', error);
            setConnectionStatus('error');
            toast({
              title: "Connection Error",
              description: "Lost connection to coin acceptor. Will attempt to reconnect.",
              variant: "destructive"
            });
            
            // Release the reader to allow reconnection
            reader.releaseLock();
          }
        };

        // Start the read loop
        readLoop();
      } catch (readerError) {
        console.error('Failed to set up serial reader:', readerError);
        setConnectionStatus('error');
        toast({
          title: "Serial Error",
          description: "Failed to read from coin acceptor",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('Serial connection error:', error);
      setConnectionStatus('error');
      toast({
        title: "Serial Connection Error",
        description: "Failed to connect to coin acceptor",
        variant: "destructive"
      });
    }
  };
};
