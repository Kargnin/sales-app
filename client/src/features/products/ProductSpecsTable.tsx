import { View } from "react-native";
import { Card } from "../../components/ui/card";
import { Text } from "../../components/ui/text";

interface SpecRow {
  label: string;
  value: string | null | undefined;
}

interface ProductSpecsTableProps {
  specs: SpecRow[];
}

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;

  return (
    <View className="flex-row items-center py-3 border-b border-stone-border">
      <Text variant="body" color="ash" className="flex-[2]">
        {label}
      </Text>
      <Text variant="body" color="charcoal" className="flex-[3]">
        {value}
      </Text>
    </View>
  );
}

export function ProductSpecsTable({ specs }: ProductSpecsTableProps) {
  const visibleSpecs = specs.filter((s) => s.value);

  if (visibleSpecs.length === 0) return null;

  return (
    <Card className="p-0 px-5">
      {visibleSpecs.map((spec, index) => (
        <SpecRow key={spec.label} label={spec.label} value={spec.value} />
      ))}
    </Card>
  );
}
