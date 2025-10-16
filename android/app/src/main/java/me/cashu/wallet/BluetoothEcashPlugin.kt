package me.cashu.wallet

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.JSObject
import com.getcapacitor.JSArray
import me.cashu.wallet.model.EcashMessage
import me.cashu.wallet.mesh.PeerManager

/**
 * Capacitor plugin to expose Bluetooth ecash functionality to JavaScript
 * 
 * This bridges the BluetoothEcashService (Kotlin) to the Vue/Quasar frontend (TypeScript)
 */
@CapacitorPlugin(
    name = "BluetoothEcash",
    permissions = [
        Permission(strings = [Manifest.permission.BLUETOOTH], alias = "bluetooth"),
        Permission(strings = [Manifest.permission.BLUETOOTH_ADMIN], alias = "bluetoothAdmin"),
        Permission(strings = [Manifest.permission.BLUETOOTH_ADVERTISE], alias = "bluetoothAdvertise"),
        Permission(strings = [Manifest.permission.BLUETOOTH_CONNECT], alias = "bluetoothConnect"),
        Permission(strings = [Manifest.permission.BLUETOOTH_SCAN], alias = "bluetoothScan"),
        Permission(strings = [Manifest.permission.ACCESS_FINE_LOCATION], alias = "location"),
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")
    ]
)
class BluetoothEcashPlugin : Plugin() {
    
    companion object {
        private const val TAG = "BluetoothEcashPlugin"
        private const val PERMISSION_REQUEST_CODE = 12345
    }
    
    private var bluetoothService: BluetoothEcashService? = null
    
    override fun load() {
        super.load()
        Log.d(TAG, "BluetoothEcashPlugin loaded")
        
        // Initialize service
        bluetoothService = BluetoothEcashService(context).apply {
            delegate = object : EcashDelegate {
                override fun onEcashReceived(message: EcashMessage) {
                    Log.d(TAG, "Ecash received: ${message.amount} ${message.unit}")
                    notifyListeners("ecashReceived", ecashMessageToJSObject(message))
                }
                
                override fun onPeerDiscovered(peer: PeerManager.PeerInfo) {
                    Log.d(TAG, "Peer discovered: ${peer.peerID}")
                    notifyListeners("peerDiscovered", peerToJSObject(peer))
                }
                
                override fun onPeerLost(peerID: String) {
                    Log.d(TAG, "Peer lost: $peerID")
                    val ret = JSObject()
                    ret.put("peerID", peerID)
                    notifyListeners("peerLost", ret)
                }
                
                override fun onTokenSent(messageId: String) {
                    Log.d(TAG, "Token sent: $messageId")
                    val ret = JSObject()
                    ret.put("messageId", messageId)
                    notifyListeners("tokenSent", ret)
                }
                
                override fun onTokenSendFailed(messageId: String, reason: String) {
                    Log.e(TAG, "Token send failed: $messageId - $reason")
                    val ret = JSObject()
                    ret.put("messageId", messageId)
                    ret.put("reason", reason)
                    notifyListeners("tokenSendFailed", ret)
                }
                
                override fun onTokenDelivered(messageId: String, peerID: String) {
                    Log.d(TAG, "Token delivered: $messageId to $peerID")
                    val ret = JSObject()
                    ret.put("messageId", messageId)
                    ret.put("peerID", peerID)
                    notifyListeners("tokenDelivered", ret)
                }
            }
        }
    }
    
    /**
     * Start the Bluetooth mesh service
     */
    @PluginMethod
    fun startService(call: PluginCall) {
        try {
            // Check permissions first
            if (!hasRequiredPermissions()) {
                call.reject("Bluetooth permissions not granted")
                return
            }
            
            bluetoothService?.start()
            call.resolve()
            Log.i(TAG, "Bluetooth service started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start service", e)
            call.reject("Failed to start service: ${e.message}")
        }
    }
    
    /**
     * Stop the Bluetooth mesh service
     */
    @PluginMethod
    fun stopService(call: PluginCall) {
        try {
            bluetoothService?.stop()
            call.resolve()
            Log.i(TAG, "Bluetooth service stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop service", e)
            call.reject("Failed to stop service: ${e.message}")
        }
    }
    
    /**
     * Send ecash token to nearby peer(s)
     * 
     * @param token Base64-encoded Cashu token
     * @param amount Amount in base units
     * @param unit Currency unit ("sat" or "point")
     * @param mint Mint URL
     * @param peerID Optional peer ID (null for broadcast)
     * @param memo Optional memo
     * @param senderNpub Sender's Nostr npub
     */
    @PluginMethod
    fun sendToken(call: PluginCall) {
        try {
            val token = call.getString("token") ?: run {
                call.reject("Token is required")
                return
            }
            val amount = call.getInt("amount") ?: run {
                call.reject("Amount is required")
                return
            }
            val unit = call.getString("unit") ?: "sat"
            val mint = call.getString("mint") ?: run {
                call.reject("Mint URL is required")
                return
            }
            val peerID = call.getString("peerID")  // Optional
            val memo = call.getString("memo")
            val senderNpub = call.getString("senderNpub") ?: run {
                call.reject("Sender npub is required")
                return
            }
            
            val messageId = bluetoothService?.sendEcashToken(
                token, amount, unit, mint, peerID, memo, senderNpub
            ) ?: run {
                call.reject("Service not initialized")
                return
            }
            
            val ret = JSObject()
            ret.put("messageId", messageId)
            call.resolve(ret)
            
            Log.d(TAG, "Initiated ecash send: $messageId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send token", e)
            call.reject("Failed to send token: ${e.message}")
        }
    }
    
    /**
     * Get list of currently available peers
     */
    @PluginMethod
    fun getAvailablePeers(call: PluginCall) {
        try {
            val peers = bluetoothService?.getAvailablePeers() ?: emptyList()
            
            val peersArray = JSArray()
            peers.forEach { peer ->
                peersArray.put(peerToJSObject(peer))
            }
            
            val ret = JSObject()
            ret.put("peers", peersArray)
            call.resolve(ret)
            
            Log.d(TAG, "Returned ${peers.size} available peers")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get peers", e)
            call.reject("Failed to get peers: ${e.message}")
        }
    }
    
    /**
     * Get unclaimed tokens received via Bluetooth
     */
    @PluginMethod
    fun getUnclaimedTokens(call: PluginCall) {
        try {
            val tokens = bluetoothService?.getUnclaimedTokens() ?: emptyList()
            
            val tokensArray = JSArray()
            tokens.forEach { token ->
                tokensArray.put(ecashMessageToJSObject(token))
            }
            
            val ret = JSObject()
            ret.put("tokens", tokensArray)
            call.resolve(ret)
            
            Log.d(TAG, "Returned ${tokens.size} unclaimed tokens")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get unclaimed tokens", e)
            call.reject("Failed to get unclaimed tokens: ${e.message}")
        }
    }
    
    /**
     * Mark a token as claimed after successful redemption
     */
    @PluginMethod
    fun markTokenClaimed(call: PluginCall) {
        try {
            val messageId = call.getString("messageId") ?: run {
                call.reject("Message ID is required")
                return
            }
            
            bluetoothService?.markTokenClaimed(messageId)
            call.resolve()
            
            Log.d(TAG, "Marked token as claimed: $messageId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mark token claimed", e)
            call.reject("Failed to mark token claimed: ${e.message}")
        }
    }
    
    /**
     * Request Bluetooth permissions
     */
    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (hasRequiredPermissions()) {
            val ret = JSObject()
            ret.put("granted", true)
            call.resolve(ret)
            return
        }
        
        // Save call for permission result callback
        savedCall = call
        
        // Request permissions
        val permissions = getRequiredPermissions()
        ActivityCompat.requestPermissions(activity, permissions, PERMISSION_REQUEST_CODE)
    }
    
    /**
     * Check if all required permissions are granted
     */
    private fun hasRequiredPermissions(): Boolean {
        val permissions = getRequiredPermissions()
        return permissions.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * Get list of required permissions based on Android version
     */
    private fun getRequiredPermissions(): Array<String> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.POST_NOTIFICATIONS
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        }
    }
    
    /**
     * Convert PeerInfo to JSObject for JavaScript
     */
    private fun peerToJSObject(peer: PeerManager.PeerInfo): JSObject {
        val obj = JSObject()
        obj.put("peerID", peer.peerID)
        obj.put("nickname", peer.nickname ?: "")
        obj.put("lastSeen", peer.lastSeen)
        obj.put("isDirect", peer.isDirect)
        obj.put("nostrNpub", peer.nostrNpub ?: "")
        return obj
    }
    
    /**
     * Convert EcashMessage to JSObject for JavaScript
     */
    private fun ecashMessageToJSObject(message: EcashMessage): JSObject {
        val obj = JSObject()
        obj.put("id", message.id)
        obj.put("sender", message.sender)
        obj.put("senderPeerID", message.senderPeerID)
        obj.put("timestamp", message.timestamp.time)
        obj.put("amount", message.amount)
        obj.put("unit", message.unit)
        obj.put("cashuToken", message.cashuToken)
        obj.put("mint", message.mint)
        obj.put("memo", message.memo ?: "")
        obj.put("claimed", message.claimed)
        obj.put("deliveryStatus", message.deliveryStatus.getDisplayText())
        return obj
    }
    
    private var savedCall: PluginCall? = null
    
    override fun handleOnDestroy() {
        bluetoothService?.destroy()
        super.handleOnDestroy()
    }
}

