package me.cashu.wallet;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "onCreate: Registering BluetoothEcash plugin");
        try {
            registerPlugin(BluetoothEcashPlugin.class);
            Log.i(TAG, "onCreate: BluetoothEcash plugin registered successfully");
        } catch (Exception e) {
            Log.e(TAG, "onCreate: Failed to register BluetoothEcash plugin", e);
        }
        super.onCreate(savedInstanceState);
    }
}
