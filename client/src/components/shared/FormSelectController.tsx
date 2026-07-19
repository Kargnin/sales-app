import { Controller } from "react-hook-form";
import type { Control, FieldValues, Path, RegisterOptions } from "react-hook-form";
import { FormSelect } from "./FormSelect";

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectControllerProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  rules?: Omit<
    RegisterOptions<T, Path<T>>,
    "valueAsNumber" | "valueAsDate" | "setValueAs" | "disabled"
  >;
}

/**
 * Wraps {@link FormSelect} with react-hook-form's {@link Controller}
 * so it integrates seamlessly with `useForm` / `FormProvider`.
 */
export function FormSelectController<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
  required,
  rules,
}: FormSelectControllerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FormSelect
          label={label}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          options={options}
          placeholder={placeholder}
          error={error?.message}
          required={required}
        />
      )}
    />
  );
}
