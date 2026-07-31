import { Controller } from "react-hook-form";
import type {
  Control,
  FieldValues,
  Path,
  RegisterOptions,
} from "react-hook-form";
import type { KeyboardTypeOptions } from "react-native";
import { FormInput } from "./FormInput";

interface FormInputControllerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  required?: boolean;
  maxLength?: number;
  editable?: boolean;
  icon?: React.ReactNode;
  rules?: Omit<
    RegisterOptions<T, Path<T>>,
    "valueAsNumber" | "valueAsDate" | "setValueAs" | "disabled"
  >;
}

/**
 * Wraps {@link FormInput} with react-hook-form's {@link Controller}
 * so it integrates seamlessly with `useForm` / `FormProvider`.
 */
export function FormInputController<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  multiline,
  keyboardType,
  required,
  maxLength,
  editable,
  icon,
  rules,
}: FormInputControllerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <FormInput
          label={label}
          value={value ?? ""}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          multiline={multiline}
          keyboardType={keyboardType}
          required={required}
          maxLength={maxLength}
          editable={editable}
          icon={icon}
          error={error?.message}
        />
      )}
    />
  );
}
