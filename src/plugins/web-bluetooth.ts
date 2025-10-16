/**
 * Web Bluetooth API wrapper for desktop PWA support
 * Enables Bluetooth mesh on Chrome/Edge desktop browsers
 */

const SERVICE_UUID = 'F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C';
const CHARACTERISTIC_UUID = 'A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D';

export interface WebBluetoothPeer {
  id: string;
  nickname: string;
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  characteristic?: BluetoothRemoteGATTCharacteristic;
  lastSeen: number;
}

export class WebBluetoothService {
  private devices: Map<string, WebBluetoothPeer> = new Map();
  private myNickname = 'Bitpoints User';
  private isScanning = false;
  private onTokenReceived?: (token: string, sender: WebBluetoothPeer) => void;
  private onPeerDiscovered?: (peer: WebBluetoothPeer) => void;

  /**
   * Check if Web Bluetooth is available
   */
  static isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 
           'bluetooth' in navigator;
  }

  /**
   * Initialize with nickname
   */
  initialize(nickname: string) {
    this.myNickname = nickname;
  }

  /**
   * Request and connect to a Bluetooth device
   */
  async requestDevice(): Promise<WebBluetoothPeer | null> {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID]
      });

      // Extract nickname from device name
      let nickname = 'Unknown';
      if (device.name && device.name.startsWith('BP:')) {
        nickname = device.name.substring(3);
      }

      const peer: WebBluetoothPeer = {
        id: device.id,
        nickname,
        device,
        lastSeen: Date.now()
      };

      this.devices.set(device.id, peer);
      
      // Connect to device
      await this.connectToPeer(peer);

      if (this.onPeerDiscovered) {
        this.onPeerDiscovered(peer);
      }

      return peer;
    } catch (error) {
      console.error('Failed to request Bluetooth device:', error);
      return null;
    }
  }

  /**
   * Connect to a peer and set up token receiving
   */
  private async connectToPeer(peer: WebBluetoothPeer): Promise<void> {
    try {
      if (!peer.device.gatt) {
        console.error('Device has no GATT server');
        return;
      }

      // Connect to GATT server
      const server = await peer.device.gatt.connect();
      peer.server = server;

      // Get service
      const service = await server.getPrimaryService(SERVICE_UUID);

      // Get characteristic
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      peer.characteristic = characteristic;

      // Set up notifications for incoming tokens
      characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (value) {
          this.handleReceivedData(value, peer);
        }
      });

      await characteristic.startNotifications();

      console.log(`Connected to peer: ${peer.nickname} (${peer.id})`);
    } catch (error) {
      console.error('Failed to connect to peer:', error);
    }
  }

  /**
   * Send token to a specific peer
   */
  async sendToken(token: string, peerId: string): Promise<boolean> {
    const peer = this.devices.get(peerId);
    if (!peer || !peer.characteristic) {
      console.error('Peer not connected:', peerId);
      return false;
    }

    try {
      // Create token message
      const message = {
        type: 'ECASH_TOKEN',
        token,
        sender: this.myNickname,
        timestamp: Date.now()
      };

      const data = new TextEncoder().encode(JSON.stringify(message));
      
      // Write to characteristic
      await peer.characteristic.writeValue(data);
      
      console.log(`Sent token to ${peer.nickname} via Web Bluetooth`);
      return true;
    } catch (error) {
      console.error('Failed to send token:', error);
      return false;
    }
  }

  /**
   * Handle received data from characteristic
   */
  private handleReceivedData(value: DataView, sender: WebBluetoothPeer) {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(value);
      const message = JSON.parse(text);

      if (message.type === 'ECASH_TOKEN' && message.token) {
        console.log(`Received token from ${sender.nickname} via Web Bluetooth`);
        
        if (this.onTokenReceived) {
          this.onTokenReceived(message.token, sender);
        }
      }
    } catch (error) {
      console.error('Failed to parse received data:', error);
    }
  }

  /**
   * Get list of connected peers
   */
  getPeers(): WebBluetoothPeer[] {
    return Array.from(this.devices.values());
  }

  /**
   * Disconnect from a peer
   */
  async disconnect(peerId: string) {
    const peer = this.devices.get(peerId);
    if (peer && peer.server) {
      peer.server.disconnect();
      this.devices.delete(peerId);
    }
  }

  /**
   * Disconnect from all peers
   */
  disconnectAll() {
    for (const peer of this.devices.values()) {
      if (peer.server) {
        peer.server.disconnect();
      }
    }
    this.devices.clear();
  }

  /**
   * Set callback for token received
   */
  setOnTokenReceived(callback: (token: string, sender: WebBluetoothPeer) => void) {
    this.onTokenReceived = callback;
  }

  /**
   * Set callback for peer discovered
   */
  setOnPeerDiscovered(callback: (peer: WebBluetoothPeer) => void) {
    this.onPeerDiscovered = callback;
  }
}

export const webBluetoothService = new WebBluetoothService();

