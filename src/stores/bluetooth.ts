import { defineStore } from 'pinia';
import BluetoothEcash, { Peer, EcashMessage, SendTokenOptions } from 'src/plugins/bluetooth-ecash';
import { useWalletStore } from './wallet';
import { useNostrStore } from './nostr';
import { useReceiveTokensStore } from './receiveTokensStore';
import { useLocalStorage } from '@vueuse/core';
import { notifySuccess, notifyError, notifyWarning } from 'src/js/notify';

/**
 * Bluetooth Mesh Ecash Store
 *
 * Manages Bluetooth mesh networking for offline ecash token transfers
 */
export const useBluetoothStore = defineStore('bluetooth', {
  state: () => ({
    isActive: false,
    isInitialized: false,
    nearbyPeers: [] as Peer[],
    unclaimedTokens: useLocalStorage<EcashMessage[]>('bluetooth-unclaimed-tokens', []),
    contacts: useLocalStorage<BluetoothContact[]>('bluetooth-contacts', []),
    pendingMessages: [] as string[],  // Message IDs being sent
    nickname: useLocalStorage<string>('bluetooth-nickname', 'Bitpoints User'),
  }),

  getters: {
    /**
     * Get peers sorted by last seen (most recent first)
     */
    sortedPeers: (state) => {
      return [...state.nearbyPeers].sort((a, b) => b.lastSeen - a.lastSeen);
    },

    /**
     * Get only directly connected peers (not via relay)
     */
    directPeers: (state) => {
      return state.nearbyPeers.filter(p => p.isDirect);
    },

    /**
     * Get peers with known Nostr identities
     */
    knownPeers: (state) => {
      return state.nearbyPeers.filter(p => p.nostrNpub && p.nostrNpub.length > 0);
    },

    /**
     * Get count of unclaimed tokens
     */
    unclaimedCount: (state) => {
      return state.unclaimedTokens.filter(t => !t.claimed).length;
    },

    /**
     * Total value of unclaimed tokens (in sats)
     */
    unclaimedValue: (state) => {
      return state.unclaimedTokens
        .filter(t => !t.claimed && t.unit === 'sat')
        .reduce((sum, t) => sum + t.amount, 0);
    },
  },

  actions: {
    /**
     * Initialize the Bluetooth service and event listeners
     */
    async initialize() {
      if (this.isInitialized) return;

      try {
        // Check if running as native app
        // @ts-ignore
        if (!window?.Capacitor) {
          console.log('Bluetooth mesh not available - not running as native app');
          return;
        }

        // Set up event listeners
        await BluetoothEcash.addListener('ecashReceived', (event: EcashMessage) => {
          console.log('Ecash received via Bluetooth:', event);
          this.handleEcashReceived(event);
        });

        await BluetoothEcash.addListener('peerDiscovered', (event: { peerID: string; nickname: string; lastSeen: number; isDirect: boolean; nostrNpub: string }) => {
          console.log('Peer discovered:', event);
          this.handlePeerDiscovered(event as Peer);
        });

        await BluetoothEcash.addListener('peerLost', (event: { peerID: string }) => {
          console.log('Peer lost:', event);
          this.handlePeerLost(event.peerID);
        });

        await BluetoothEcash.addListener('tokenSent', (event: { messageId: string }) => {
          console.log('Token sent:', event);
          this.handleTokenSent(event.messageId);
        });

        await BluetoothEcash.addListener('tokenDelivered', (event: { messageId: string; peerID: string }) => {
          console.log('Token delivered:', event);
          this.handleTokenDelivered(event.messageId, event.peerID);
        });

        this.isInitialized = true;
        console.log('Bluetooth ecash service initialized');
      } catch (e) {
        console.error('Failed to initialize Bluetooth service:', e);
      }
    },

    /**
     * Start Bluetooth mesh service
     */
    async startService() {
      try {
        // Request permissions first
        const { granted } = await BluetoothEcash.requestPermissions();
        if (!granted) {
          notifyWarning('Bluetooth permissions required for nearby payments');
          return false;
        }

        // Initialize with current nickname
        await BluetoothEcash.initialize({ nickname: this.nickname });

        await BluetoothEcash.startService();
        this.isActive = true;
        console.log(`Bluetooth mesh service started with nickname: ${this.nickname}`);

        // Start polling for peers
        this.startPeerPolling();

        return true;
      } catch (e) {
        console.error('Failed to start Bluetooth service:', e);
        notifyError('Failed to start Bluetooth service');
        return false;
      }
    },

    /**
     * Stop Bluetooth mesh service
     */
    async stopService() {
      try {
        await BluetoothEcash.stopService();
        this.isActive = false;
        this.nearbyPeers = [];
        console.log('Bluetooth mesh service stopped');
      } catch (e) {
        console.error('Failed to stop Bluetooth service:', e);
      }
    },

    /**
     * Update Bluetooth nickname
     * Restarts service if active to apply new nickname
     */
    async updateNickname(newNickname: string) {
      if (newNickname.length < 3 || newNickname.length > 32) {
        throw new Error('Nickname must be 3-32 characters');
      }

      const wasActive = this.isActive;
      this.nickname = newNickname;

      // Restart service to apply new nickname
      if (wasActive) {
        await this.stopService();
        await this.startService();
        console.log(`Bluetooth nickname updated to: ${newNickname}`);
      }
    },

    /**
     * Send ecash token to nearby peer(s)
     */
    async sendToken(options: SendTokenOptions): Promise<string | null> {
      console.log('🔵 [STORE] sendToken called with:', options);
      
      try {
        console.log('🔵 [STORE] Calling BluetoothEcash.sendToken...');
        const result = await BluetoothEcash.sendToken(options);
        console.log('🔵 [STORE] Native returned:', result);
        
        const { messageId } = result;
        this.pendingMessages.push(messageId);
        console.log('🔵 [STORE] Success, returning messageId:', messageId);
        return messageId;
      } catch (e) {
        console.error('🔵 [STORE ERROR]:', e);
        notifyError('Failed to send token via Bluetooth');
        return null;
      }
    },

    /**
     * Claim a received token
     */
    async claimToken(messageId: string) {
      try {
        const message = this.unclaimedTokens.find(t => t.id === messageId);
        if (!message) {
          throw new Error('Token not found');
        }

        // Use wallet store to receive the token
        const walletStore = useWalletStore();
        const receiveStore = useReceiveTokensStore();

        receiveStore.receiveData.tokensBase64 = message.cashuToken;
        const success = await receiveStore.receiveIfDecodes();

        if (success) {
          // Mark as claimed
          await BluetoothEcash.markTokenClaimed({ messageId });

          const index = this.unclaimedTokens.findIndex(t => t.id === messageId);
          if (index !== -1) {
            this.unclaimedTokens[index] = { ...message, claimed: true };
          }

          // Add sender to contacts
          this.addContact(message.sender, message.senderPeerID);

          notifySuccess(`Claimed ${message.amount} ${message.unit} from ${message.sender.substring(0, 16)}...`);
          return true;
        } else {
          throw new Error('Failed to redeem token with mint');
        }
      } catch (e) {
        console.error('Failed to claim token:', e);
        notifyError('Failed to claim token');
        return false;
      }
    },

    /**
     * Auto-claim all unclaimed tokens (when online)
     */
    async autoClaimTokens() {
      if (!navigator.onLine) {
        console.log('Offline - skipping auto-claim');
        return;
      }

      const unclaimed = this.unclaimedTokens.filter(t => !t.claimed);
      console.log(`Auto-claiming ${unclaimed.length} tokens`);

      for (const token of unclaimed) {
        await this.claimToken(token.id);
        // Small delay between claims
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    },

    /**
     * Handle ecash received event
     */
    handleEcashReceived(message: EcashMessage) {
      // Add to unclaimed tokens
      const existing = this.unclaimedTokens.find(t => t.id === message.id);
      if (!existing) {
        this.unclaimedTokens.push(message);

        // Show notification
        notifySuccess(`Received ${message.amount} ${message.unit} via Bluetooth!`, message.memo || 'From nearby peer');

        // Try to auto-claim if online
        if (navigator.onLine) {
          this.claimToken(message.id);
        }
      }
    },

    /**
     * Handle peer discovered event
     */
    handlePeerDiscovered(peer: Peer) {
      const existing = this.nearbyPeers.find(p => p.peerID === peer.peerID);
      if (!existing) {
        this.nearbyPeers.push(peer);
        console.log(`New peer discovered: ${peer.peerID} (${peer.nickname || 'unnamed'})`);
      } else {
        // Update existing peer info
        const index = this.nearbyPeers.findIndex(p => p.peerID === peer.peerID);
        this.nearbyPeers[index] = peer;
      }
    },

    /**
     * Handle peer lost event
     */
    handlePeerLost(peerID: string) {
      const index = this.nearbyPeers.findIndex(p => p.peerID === peerID);
      if (index !== -1) {
        this.nearbyPeers.splice(index, 1);
        console.log(`Peer lost: ${peerID}`);
      }
    },

    /**
     * Handle token sent event
     */
    handleTokenSent(messageId: string) {
      const index = this.pendingMessages.indexOf(messageId);
      if (index !== -1) {
        this.pendingMessages.splice(index, 1);
      }
    },

    /**
     * Handle token delivered event
     */
    handleTokenDelivered(messageId: string, peerID: string) {
      console.log(`Token ${messageId} delivered to ${peerID}`);
      // Could update UI to show delivery confirmation
    },

    /**
     * Poll for available peers periodically
     */
    async startPeerPolling() {
      if (!this.isActive) return;

      const poll = async () => {
        if (!this.isActive) return;

        try {
          const { peers } = await BluetoothEcash.getAvailablePeers();

          // Update peer list
          this.nearbyPeers = peers;

          // Poll again in 5 seconds
          setTimeout(poll, 5000);
        } catch (e) {
          console.error('Failed to poll peers:', e);
          setTimeout(poll, 10000);  // Retry slower on error
        }
      };

      poll();
    },

    /**
     * Add a contact after ecash exchange
     */
    addContact(npub: string, peerID: string) {
      const existing = this.contacts.find(c => c.npub === npub);
      if (!existing) {
        this.contacts.push({
          npub,
          peerID,
          addedAt: Date.now(),
          lastInteraction: Date.now(),
          nickname: '',
        });
        console.log(`Added contact: ${npub}`);

        // Sync to Nostr when online
        if (navigator.onLine) {
          this.syncContactsToNostr();
        }
      } else {
        // Update last interaction time
        const index = this.contacts.findIndex(c => c.npub === npub);
        this.contacts[index].lastInteraction = Date.now();
      }
    },

    /**
     * Sync contacts to Nostr contact list (NIP-02)
     */
    async syncContactsToNostr() {
      try {
        const nostrStore = useNostrStore();
        // TODO: Implement NIP-02 contact list publishing
        console.log('TODO: Sync contacts to Nostr', this.contacts);
      } catch (e) {
        console.error('Failed to sync contacts to Nostr:', e);
      }
    },
  },
});

/**
 * Bluetooth contact stored locally
 */
export interface BluetoothContact {
  npub: string;
  peerID: string;
  nickname: string;
  addedAt: number;
  lastInteraction: number;
}
