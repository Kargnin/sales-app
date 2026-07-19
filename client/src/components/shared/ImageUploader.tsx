import { useCallback, useState } from "react";
import { View, TouchableOpacity, Image, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Text } from "../ui/text";
import { Button } from "../ui/button";

interface ImageUploaderProps {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onImageRemoved: () => void;
}

export function ImageUploader({
  imageUri,
  onImageSelected,
  onImageRemoved,
}: ImageUploaderProps) {
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const handleLaunchCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your camera to take a photo. You can grant this in your device settings.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
        setShowOptionsModal(false);
      }
    } catch {
      Alert.alert("Error", "Something went wrong while opening the camera. Please try again.");
    }
  }, [onImageSelected]);

  const handleLaunchLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photo library to select an image. You can grant this in your device settings.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
        setShowOptionsModal(false);
      }
    } catch {
      Alert.alert("Error", "Something went wrong while selecting the image. Please try again.");
    }
  }, [onImageSelected]);

  const handlePress = useCallback(() => {
    setShowOptionsModal(true);
  }, []);

  const handleRemove = useCallback(() => {
    onImageRemoved();
  }, [onImageRemoved]);

  return (
    <>
      {imageUri ? (
        <View className="relative rounded-lg overflow-hidden bg-surface">
          {/* Image preview */}
          <Image
            source={{ uri: imageUri }}
            className="w-full h-60 rounded-lg"
            resizeMode="cover"
            accessibilityLabel="Selected image preview"
          />

          {/* Remove button overlay */}
          <TouchableOpacity
            onPress={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-midnight/70 items-center justify-center"
            accessibilityLabel="Remove image"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          className="h-44 border-2 border-dashed border-stone-border rounded-lg bg-surface items-center justify-center gap-2"
          accessibilityLabel="Tap to upload image"
          accessibilityRole="button"
        >
          <View className="w-12 h-12 rounded-full bg-mascot-peach items-center justify-center">
            <Ionicons name="camera-outline" size={22} color="#343433" />
          </View>
          <Text variant="body" color="charcoal">
            Tap to Upload Image
          </Text>
          <Text variant="caption" color="ash">
            JPEG, PNG up to 5MB
          </Text>
        </TouchableOpacity>
      )}

      {/* ---- Choice Modal ---- */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View className="flex-1 bg-midnight/40 items-center justify-center px-4">
          <View className="bg-canvas border border-stone-border rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl">
            <Text variant="heading-sm" color="charcoal" className="text-center mt-1">
              Upload Image
            </Text>
            <Text variant="body" color="graphite" className="text-center leading-5 mb-2">
              Would you like to take a photo using your camera or choose an existing photo?
            </Text>

            <View className="gap-3">
              <Button variant="primary" onPress={handleLaunchCamera}>
                Take Photo
              </Button>
              <Button variant="secondary" onPress={handleLaunchLibrary}>
                Choose from Library
              </Button>
              <TouchableOpacity
                onPress={() => setShowOptionsModal(false)}
                className="items-center py-2 mt-1"
                accessibilityLabel="Cancel image upload"
                accessibilityRole="button"
              >
                <Text variant="label-medium" color="ash">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
