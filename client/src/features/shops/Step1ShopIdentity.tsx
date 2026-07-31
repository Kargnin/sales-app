import { View, TouchableOpacity } from "react-native";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import type { FieldValues } from "react-hook-form";
import { FormInputController, ImageUploader } from "../../components/shared";
import { Text } from "../../components/ui/text";
import { Ionicons } from "@expo/vector-icons";

interface Step1ShopIdentityProps {
  onDataChange: (data: Record<string, any>) => void;
  fieldErrors: Record<string, string>;
  initialData: Record<string, any>;
}

export function Step1ShopIdentity({
  onDataChange,
  fieldErrors,
  initialData,
}: Step1ShopIdentityProps) {
  const { control } = useFormContext<FieldValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additionalOwners",
  });

  return (
    <View className="gap-6 py-4">
      {/* Step Heading */}
      <View className="items-center text-center gap-1.5 mb-2">
        <Text
          variant="caption"
          color="ash"
          className="tracking-widest uppercase"
        >
          Step 1 of 2
        </Text>
        <Text variant="heading" color="charcoal" className="text-2xl font-bold">
          Shop Identity
        </Text>
        <Text variant="body" color="ash" className="text-center">
          Let's set up your storefront. Add a photo and your shop's name.
        </Text>
      </View>

      {/* Shop Photo Upload Area */}
      <View className="gap-2">
        <Text variant="label-medium" color="charcoal">
          Shop Storefront Photo
        </Text>
        <Controller
          name="imageUrl"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ImageUploader
              imageUri={(value as string) ?? null}
              onImageSelected={onChange}
              onImageRemoved={() => onChange(null)}
            />
          )}
        />
      </View>

      {/* Shop Name Input */}
      <FormInputController
        name="name"
        control={control}
        label="Shop Name"
        placeholder="Enter your shop name"
        icon={<Ionicons name="storefront-outline" size={20} color="#848281" />}
        required
      />

      {/* Primary Owner Section */}
      <View className="gap-4 pt-4 border-t border-stone-border">
        <View className="gap-1">
          <Text variant="heading-sm" color="charcoal">
            Primary Owner
          </Text>
          <Text variant="caption" color="ash">
            Provide the details for the main account holder.
          </Text>
        </View>

        {/* Owner Full Name */}
        <FormInputController
          name="ownerName"
          control={control}
          label="Full Name"
          placeholder="e.g. Jane Doe"
          icon={<Ionicons name="person-outline" size={20} color="#848281" />}
          required
        />

        {/* Phone Number Input */}
        <FormInputController
          name="phone"
          control={control}
          label="Phone Number"
          placeholder="10-digit mobile number (e.g. 9876543210)"
          keyboardType="number-pad"
          icon={<Ionicons name="call-outline" size={20} color="#848281" />}
          required
        />
      </View>

      {/* Additional Owners / Co-Owners Section */}
      <View className="gap-4 pt-2">
        {fields.map((fieldItem, index) => (
          <View
            key={fieldItem.id}
            className="gap-3 p-3.5 bg-surface border border-stone-border rounded-lg relative"
          >
            <View className="flex-row items-center justify-between">
              <Text
                variant="label-medium"
                color="charcoal"
                className="font-semibold text-xs"
              >
                Additional Owner #{index + 1}
              </Text>
              <TouchableOpacity
                onPress={() => remove(index)}
                className="p-1 rounded-full hover:bg-stone-border"
                accessibilityRole="button"
                accessibilityLabel={`Remove owner ${index + 1}`}
              >
                <Ionicons name="trash-outline" size={16} color="#ff2b3a" />
              </TouchableOpacity>
            </View>
            <FormInputController
              name={`additionalOwners.${index}.name`}
              control={control}
              placeholder="Co-owner Full Name"
              icon={
                <Ionicons name="person-outline" size={18} color="#848281" />
              }
            />
            <FormInputController
              name={`additionalOwners.${index}.phone`}
              control={control}
              placeholder="Co-owner Phone Number"
              keyboardType="number-pad"
              icon={<Ionicons name="call-outline" size={18} color="#848281" />}
            />
          </View>
        ))}

        {/* Add Owner Button (Matching Stitch Step 1 design) */}
        <TouchableOpacity
          onPress={() => append({ name: "", phone: "" })}
          className="flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg border border-stone-border bg-surface hover:bg-surface-recessed active:opacity-90 transition-all"
          accessibilityRole="button"
          accessibilityLabel="Add another owner"
        >
          <Ionicons name="add-outline" size={20} color="#343433" />
          <Text
            variant="label-medium"
            color="charcoal"
            className="font-semibold text-sm"
          >
            Add Owner
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
