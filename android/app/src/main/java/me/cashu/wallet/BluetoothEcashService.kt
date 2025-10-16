package me.cashu.wallet

import android.content.Context
import android.util.Log
import me.cashu.wallet.mesh.BluetoothMeshService
import me.cashu.wallet.mesh.BluetoothMeshDelegate
import me.cashu.wallet.model.EcashMessage
import me.cashu.wallet.model.DeliveryStatus
import me.cashu.wallet.protocol.BitchatPacket
import me.cashu.wallet.protocol.MessageType
import me.cashu.wallet.model.RoutedPacket
import android.bluetooth.BluetoothDevice
import kotlinx.coroutines.*
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * BluetoothEcashService - High-level service for sending/receiving ecash tokens via Bluetooth mesh
 * 
 * This wraps BluetoothMeshService and provides ecash-specific functionality:
 * - Send tokens to nearby peers or broadcast
 * - Receive tokens and store for claiming
 * - Track peer discovery and connection status
 * - Manage delivery status and notifications
 */
class BluetoothEcashService(private val context: Context) {
    
    companion object {
        private const val TAG = "BluetoothEcashService"
        private const val ECASH_MESSAGE_TYPE: UByte = 0xE1u  // Custom message type for ecash
    }
    
    private val meshService = BluetoothMeshService(context)
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    // Ecash-specific state
    private val pendingTokens = ConcurrentHashMap<String, EcashMessage>()
    private val receivedTokens = ConcurrentHashMap<String, EcashMessage>()
    
    // Delegate for callbacks to UI
    var delegate: EcashDelegate? = null
    
    init {
        setupMeshDelegate()
    }
    
    /**
     * Wire up the mesh service delegate to handle incoming packets
     */
    private fun setupMeshDelegate() {
        meshService.delegate = object : BluetoothMeshDelegate {
            override fun didReceiveMessage(message: me.cashu.wallet.model.BitchatMessage) {
                // We handle ecash via custom packet type, not BitchatMessage
            }
            
            override fun didUpdatePeerList(peers: List<me.cashu.wallet.mesh.PeerManager.PeerInfo>) {
                Log.d(TAG, "Peer list updated: ${peers.size} peers")
                peers.forEach { peer ->
                    delegate?.onPeerDiscovered(peer)
                }
            }
            
            override fun didReceiveCustomPacket(packet: BitchatPacket, fromPeerID: String?, relayAddress: String?) {
                // Check if this is an ecash packet
                if (packet.type == ECASH_MESSAGE_TYPE) {
                    handleIncomingEcashPacket(packet, fromPeerID, relayAddress)
                }
            }
            
            override fun didUpdateNostrPublicKey(peerID: String, nostrPublicKey: String) {
                Log.d(TAG, "Peer $peerID updated nostr key: $nostrPublicKey")
            }
            
            override fun didReceiveIdentityAnnouncement(peerID: String, publicKey: ByteArray, nickname: String?) {
                Log.d(TAG, "Identity announcement from $peerID: ${nickname ?: "no nickname"}")
            }
            
            override fun didConnectToPeer(peerID: String, device: BluetoothDevice?) {
                Log.d(TAG, "Connected to peer: $peerID")
            }
            
            override fun didDisconnectFromPeer(peerID: String) {
                Log.d(TAG, "Disconnected from peer: $peerID")
                delegate?.onPeerLost(peerID)
            }
        }
    }
    
    /**
     * Start the Bluetooth mesh service
     * Begins advertising and scanning for nearby peers
     */
    fun start() {
        Log.i(TAG, "Starting Bluetooth ecash service")
        meshService.start()
    }
    
    /**
     * Stop the Bluetooth mesh service
     */
    fun stop() {
        Log.i(TAG, "Stopping Bluetooth ecash service")
        meshService.stop()
    }
    
    /**
     * Send ecash token to specific peer(s) via Bluetooth mesh
     * 
     * @param token Base64-encoded Cashu token
     * @param amount Amount in base units
     * @param unit Currency unit ("sat" or "point")
     * @param mint Mint URL
     * @param peerID Target peer ID (null for broadcast)
     * @param memo Optional memo text
     * @param senderNpub Sender's Nostr npub
     * @return Message ID for tracking delivery
     */
    fun sendEcashToken(
        token: String,
        amount: Int,
        unit: String,
        mint: String,
        peerID: String?,
        memo: String?,
        senderNpub: String
    ): String {
        val message = EcashMessage(
            sender = senderNpub,
            senderPeerID = meshService.myPeerID,
            timestamp = Date(),
            amount = amount,
            unit = unit,
            cashuToken = token,
            mint = mint,
            memo = memo,
            claimed = false,
            deliveryStatus = DeliveryStatus.Sending,
            recipientNpub = peerID  // peerID can be used as recipient identifier
        )
        
        // Store in pending tokens
        pendingTokens[message.id] = message
        
        // Convert to binary payload
        val payload = message.toBinaryPayload()
        if (payload == null) {
            Log.e(TAG, "Failed to serialize ecash message")
            delegate?.onTokenSendFailed(message.id, "Serialization failed")
            return message.id
        }
        
        // Create BitchatPacket with custom ecash type
        val packet = BitchatPacket(
            type = ECASH_MESSAGE_TYPE,
            payload = payload,
            ttl = 7u,  // Max hops for mesh relay
            timestamp = System.currentTimeMillis()
        )
        
        serviceScope.launch {
            try {
                if (peerID != null) {
                    // Send to specific peer
                    Log.d(TAG, "Sending ecash token to peer $peerID: ${amount} ${unit}")
                    meshService.sendPacketToPeer(peerID, packet)
                } else {
                    // Broadcast to all nearby peers
                    Log.d(TAG, "Broadcasting ecash token: ${amount} ${unit}")
                    meshService.broadcastPacket(packet)
                }
                
                // Update status
                val updatedMessage = message.copy(deliveryStatus = DeliveryStatus.Sent)
                pendingTokens[message.id] = updatedMessage
                delegate?.onTokenSent(message.id)
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send ecash token", e)
                delegate?.onTokenSendFailed(message.id, e.message ?: "Unknown error")
            }
        }
        
        return message.id
    }
    
    /**
     * Broadcast ecash token to all nearby peers (for kids without specific contacts)
     */
    fun broadcastEcashToken(
        token: String,
        amount: Int,
        unit: String,
        mint: String,
        memo: String?,
        senderNpub: String
    ): String {
        return sendEcashToken(token, amount, unit, mint, null, memo, senderNpub)
    }
    
    /**
     * Get list of currently available peers
     */
    fun getAvailablePeers(): List<me.cashu.wallet.mesh.PeerManager.PeerInfo> {
        return meshService.getAllPeers()
    }
    
    /**
     * Get unclaimed tokens received via Bluetooth
     */
    fun getUnclaimedTokens(): List<EcashMessage> {
        return receivedTokens.values.filter { !it.claimed }.toList()
    }
    
    /**
     * Mark a token as claimed after successful redemption with mint
     */
    fun markTokenClaimed(messageId: String) {
        receivedTokens[messageId]?.let { message ->
            val updated = message.copy(
                claimed = true,
                deliveryStatus = DeliveryStatus.Claimed(meshService.myPeerID, Date())
            )
            receivedTokens[messageId] = updated
            Log.d(TAG, "Token ${messageId} marked as claimed")
        }
    }
    
    /**
     * Handle incoming ecash packet from mesh network
     */
    private fun handleIncomingEcashPacket(
        packet: BitchatPacket,
        fromPeerID: String?,
        relayAddress: String?
    ) {
        serviceScope.launch {
            try {
                val message = EcashMessage.fromBinaryPayload(packet.payload)
                if (message == null) {
                    Log.e(TAG, "Failed to parse ecash message from packet")
                    return@launch
                }
                
                Log.i(TAG, "Received ecash token: ${message.amount} ${message.unit} from ${message.sender}")
                
                // Check if this is for us or if we should relay it
                val isForUs = message.recipientNpub == null || 
                              message.recipientNpub == getCurrentUserNpub()
                
                if (isForUs) {
                    // Store the token for claiming
                    receivedTokens[message.id] = message
                    
                    // Notify delegate
                    delegate?.onEcashReceived(message)
                    
                    // If from a peer, update delivery status
                    fromPeerID?.let { peerID ->
                        val updatedMessage = message.copy(
                            deliveryStatus = DeliveryStatus.Delivered(peerID, Date())
                        )
                        receivedTokens[message.id] = updatedMessage
                        delegate?.onTokenDelivered(message.id, peerID)
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error handling incoming ecash packet", e)
            }
        }
    }
    
    /**
     * Get current user's Nostr npub
     * TODO: Integrate with cashu.me's Nostr identity management
     */
    private fun getCurrentUserNpub(): String? {
        // TODO: Get from SharedPreferences or cashu.me's nostr store
        return null
    }
    
    /**
     * Cleanup resources
     */
    fun destroy() {
        serviceScope.cancel()
        meshService.stop()
    }
}

/**
 * Delegate interface for ecash-specific callbacks
 */
interface EcashDelegate {
    /**
     * Called when an ecash token is received via Bluetooth
     */
    fun onEcashReceived(message: EcashMessage)
    
    /**
     * Called when a new peer is discovered nearby
     */
    fun onPeerDiscovered(peer: me.cashu.wallet.mesh.PeerManager.PeerInfo)
    
    /**
     * Called when a peer disconnects
     */
    fun onPeerLost(peerID: String)
    
    /**
     * Called when a token is successfully sent
     */
    fun onTokenSent(messageId: String)
    
    /**
     * Called when a token send fails
     */
    fun onTokenSendFailed(messageId: String, reason: String)
    
    /**
     * Called when a token is delivered to a peer
     */
    fun onTokenDelivered(messageId: String, peerID: String)
}

