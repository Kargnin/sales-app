import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function AdminLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shops">
        <NativeTabs.Trigger.Icon sf="storefront.fill" md="storefront" />
        <NativeTabs.Trigger.Label>Shops</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" md="inventory_2" />
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="team">
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="groups" />
        <NativeTabs.Trigger.Label>Team</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf="ellipsis.circle.fill" md="more_horiz" />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
