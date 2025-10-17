import { defineStore } from "pinia";

export const useCameraStore = defineStore("camera", {
  state: () => ({
    camera: {
      data: null,
      show: false,
      camera: "auto",
    },
    hasCamera: false,
    cameraPermission: "prompt",
  }),
  actions: {
    closeCamera: function () {
      this.camera.show = false;
    },
    showCamera: function () {
      this.camera.show = true;
    },
    async checkCameraPermission() {
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName });
          this.cameraPermission = permission.state;
          this.hasCamera = permission.state === "granted";
        } else {
          // Fallback for browsers without permissions API
          this.hasCamera = true;
        }
      } catch (error) {
        console.warn("Could not check camera permission:", error);
        this.hasCamera = true; // Assume camera is available
      }
    },
    async requestCameraPermission() {
      try {
        // Try to get user media to trigger permission request
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
        this.hasCamera = true;
        this.cameraPermission = "granted";
        return true;
      } catch (error) {
        console.error("Camera permission denied:", error);
        this.hasCamera = false;
        this.cameraPermission = "denied";
        return false;
      }
    },
  },
});
