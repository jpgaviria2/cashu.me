import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useWalletStore } from "./wallet";
import { useNostrStore } from "./nostr";
import { nip19 } from "nostr-tools";
import { notifySuccess, notifyError, notifyWarning, notify } from "../js/notify";
import axios from "axios";

/**
 * Trails Coffee Identity Store
 * 
 * Provides frictionless user identity via npub@trailscoffee.com
 * - Derives npub deterministically from wallet seed
 * - Registers with npubcash-server for Lightning address
 * - Enables social backup via Nostr contacts
 * - No seed phrase friction for users
 */

export interface TrailsIdentityProfile {
  npub: string;
  lightningAddress: string; // e.g., npub1abc...@trailscoffee.com
  nip05: string; // NIP-05 identifier
  registered: boolean;
  registeredAt?: number;
  displayName?: string;
  avatar?: string;
}

export const useTrailsIdentityStore = defineStore("trailsIdentity", {
  state: () => ({
    profile: useLocalStorage<TrailsIdentityProfile | null>(
      "trails.identity.profile",
      null
    ),
    npubcashServerUrl: useLocalStorage<string>(
      "trails.npubcash.server",
      "https://npubcash.trailscoffee.com"
    ),
    defaultMintUrl: useLocalStorage<string>(
      "trails.defaultMint",
      "https://ecash.trailscoffee.com"
    ),
    autoRegisterEnabled: useLocalStorage<boolean>(
      "trails.identity.autoRegister",
      true
    ),
    socialBackupContacts: useLocalStorage<string[]>(
      "trails.identity.socialBackup",
      []
    ),
    onboardingComplete: useLocalStorage<boolean>(
      "trails.onboarding.complete",
      false
    ),
  }),
  getters: {
    /**
     * Get the user's npub derived from wallet seed
     */
    userNpub(): string {
      const nostrStore = useNostrStore();
      return nip19.npubEncode(nostrStore.seedSignerPublicKey);
    },
    /**
     * Get short npub for display (npub1abc...xyz)
     */
    shortNpub(): string {
      if (!this.userNpub) return "";
      return `${this.userNpub.slice(0, 10)}...${this.userNpub.slice(-4)}`;
    },
    /**
     * Check if user has a registered Lightning address
     */
    hasLightningAddress(): boolean {
      return this.profile?.registered === true && !!this.profile?.lightningAddress;
    },
    /**
     * Get the full Lightning address
     */
    lightningAddress(): string {
      if (!this.profile?.lightningAddress) {
        // Generate default format even if not registered
        return `${this.shortNpub}@trailscoffee.com`;
      }
      return this.profile.lightningAddress;
    },
  },
  actions: {
    /**
     * Initialize identity from wallet seed
     * Called automatically on app start
     */
    async initializeIdentity() {
      const walletStore = useWalletStore();
      const nostrStore = useNostrStore();

      // Ensure wallet mnemonic is initialized
      walletStore.initializeMnemonic();

      // Generate Nostr keypair from seed
      await nostrStore.walletSeedGenerateKeyPair();

      const npub = this.userNpub;

      // If no profile exists, create one
      if (!this.profile) {
        this.profile = {
          npub: npub,
          lightningAddress: `${this.shortNpub}@trailscoffee.com`,
          nip05: `${this.shortNpub}@trailscoffee.com`,
          registered: false,
        };
      }

      // Auto-register if enabled and not already registered
      if (this.autoRegisterEnabled && !this.profile.registered) {
        await this.registerWithNpubCash();
      }

      return this.profile;
    },

    /**
     * Register user's npub with npubcash-server
     * Creates Lightning address and enables offline receive
     */
    async registerWithNpubCash(): Promise<boolean> {
      try {
        const nostrStore = useNostrStore();
        const npub = this.userNpub;

        // Call npubcash-server API to register
        // The server will:
        // 1. Create a Lightning address for this npub
        // 2. Hold received ecash tokens until user claims them
        // 3. Provide NIP-05 verification

        const response = await axios.post(
          `${this.npubcashServerUrl}/api/v1/register`,
          {
            npub: npub,
            pubkey: nostrStore.seedSignerPublicKey,
            // Optional: custom username (defaults to short npub)
            username: this.profile?.displayName || this.shortNpub,
          }
        );

        if (response.data.success) {
          this.profile = {
            ...this.profile,
            npub: npub,
            lightningAddress: response.data.lightningAddress,
            nip05: response.data.nip05,
            registered: true,
            registeredAt: Date.now(),
          } as TrailsIdentityProfile;

          notifySuccess(
            `Lightning address created: ${response.data.lightningAddress}`
          );
          return true;
        } else {
          throw new Error(response.data.error || "Registration failed");
        }
      } catch (error: any) {
        console.error("Failed to register with npubcash:", error);
        // Don't show error if it's just a network error (server not deployed yet)
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          console.log("npubcash server not available - Lightning address created locally but not registered");
          notifyWarning(
            "Lightning address created locally. Server registration will happen when npubcash server is deployed.",
            "Server not available yet"
          );
        } else {
          notifyError(
            `Could not register Lightning address: ${error.message || "Unknown error"}`
          );
        }
        return false;
      }
    },

    /**
     * Claim pending ecash from npubcash-server
     * Called when user opens app or manually refreshes
     */
    async claimPendingEcash(): Promise<boolean> {
      if (!this.profile?.registered) {
        console.log("Not registered with npubcash, skipping claim");
        return false;
      }

      try {
        const nostrStore = useNostrStore();

        // Fetch pending tokens from npubcash-server
        const response = await axios.get(
          `${this.npubcashServerUrl}/api/v1/claim`,
          {
            params: {
              pubkey: nostrStore.seedSignerPublicKey,
            },
          }
        );

        if (response.data.tokens && response.data.tokens.length > 0) {
          // Add tokens to wallet
          const receiveStore = (await import("./receiveTokensStore")).useReceiveTokensStore();
          const walletStore = useWalletStore();

          for (const tokenStr of response.data.tokens) {
            receiveStore.receiveData.tokensBase64 = tokenStr;
            try {
              await walletStore.redeem();
              notifySuccess(`Claimed pending payment!`);
            } catch (error) {
              console.error("Failed to redeem token:", error);
            }
          }
          return true;
        } else {
          console.log("No pending ecash to claim");
          return false;
        }
      } catch (error: any) {
        console.error("Failed to claim pending ecash:", error);
        // Don't show error to user - this is a background operation
        return false;
      }
    },

    /**
     * Setup social backup by sharing encrypted seed with trusted contacts
     * Uses Nostr NIP-17 private messages
     */
    async setupSocialBackup(contactNpubs: string[]) {
      const walletStore = useWalletStore();
      const nostrStore = useNostrStore();

      if (contactNpubs.length === 0) {
        notifyError("Please select at least one contact for backup");
        return false;
      }

      try {
        // Split seed into Shamir shares (optional advanced feature)
        // For now, send encrypted full seed to each contact
        const mnemonic = walletStore.mnemonic;

        const backupMessage = JSON.stringify({
          type: "trails-coffee-backup",
          mnemonic: mnemonic,
          timestamp: Date.now(),
          note: "Backup from Trails Coffee Rewards. Keep this safe!",
        });

        // Send to each contact via NIP-17
        for (const npub of contactNpubs) {
          const decoded = nip19.decode(npub);
          const pubkey = decoded.data as string;

          await nostrStore.sendNip17DirectMessage(
            pubkey,
            backupMessage
          );
        }

        this.socialBackupContacts = contactNpubs;
        notifySuccess(`Backup sent to ${contactNpubs.length} contact(s)`);
        return true;
      } catch (error: any) {
        console.error("Social backup failed:", error);
        notifyError(`Backup failed: ${error.message}`);
        return false;
      }
    },

    /**
     * Complete onboarding flow
     */
    completeOnboarding() {
      this.onboardingComplete = true;
      notifySuccess("Welcome to Trails Coffee Rewards! ☕");
    },

    /**
     * Reset identity (for testing or account recovery)
     */
    resetIdentity() {
      this.profile = null;
      this.socialBackupContacts = [];
      this.onboardingComplete = false;
    },

    /**
     * Update profile information
     */
    updateProfile(updates: Partial<TrailsIdentityProfile>) {
      if (this.profile) {
        this.profile = { ...this.profile, ...updates };
      }
    },
  },
});

