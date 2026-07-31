import React from "react";
import { View, Text } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  FilterToolbar,
  type FilterOption,
  type SortOption,
} from "../../components/shared/FilterToolbar";

interface TestItem {
  id: string;
  name: string;
  category: string;
}

const mockData: TestItem[] = [
  { id: "1", name: "Banana", category: "Fruit" },
  { id: "2", name: "Apple", category: "Fruit" },
  { id: "3", name: "Carrot", category: "Vegetable" },
];

const filterOptions: FilterOption<TestItem>[] = [
  {
    key: "fruit",
    label: "Fruit",
    predicate: (item) => item.category === "Fruit",
  },
  {
    key: "vegetable",
    label: "Vegetable",
    predicate: (item) => item.category === "Vegetable",
  },
];

const sortOptions: SortOption<TestItem>[] = [
  {
    key: "name_asc",
    label: "Name (A-Z)",
    compare: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: "name_desc",
    label: "Name (Z-A)",
    compare: (a, b) => b.name.localeCompare(a.name),
  },
];

describe("FilterToolbar", () => {
  it("renders search placeholder and initial data", async () => {
    await render(
      <BottomSheetModalProvider>
        <FilterToolbar
          data={mockData}
          searchPlaceholder="Search items..."
          searchKeys={["name", "category"]}
        >
          {(filtered) => (
            <View testID="results">
              {filtered.map((item) => (
                <Text key={item.id}>{item.name}</Text>
              ))}
            </View>
          )}
        </FilterToolbar>
      </BottomSheetModalProvider>,
    );

    expect(screen.getByPlaceholderText("Search items...")).toBeTruthy();
    expect(screen.getByText("Banana")).toBeTruthy();
    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.getByText("Carrot")).toBeTruthy();
  });

  it("filters items by search text query", async () => {
    await render(
      <BottomSheetModalProvider>
        <FilterToolbar
          data={mockData}
          searchPlaceholder="Search items..."
          searchKeys={["name"]}
        >
          {(filtered) => (
            <View testID="results">
              {filtered.map((item) => (
                <Text key={item.id}>{item.name}</Text>
              ))}
            </View>
          )}
        </FilterToolbar>
      </BottomSheetModalProvider>,
    );

    await act(() => {
      fireEvent.changeText(
        screen.getByPlaceholderText("Search items..."),
        "App",
      );
    });

    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.queryByText("Banana")).toBeNull();
    expect(screen.queryByText("Carrot")).toBeNull();
  });

  it("does not display badge dot when filter is 'All' and sort is default", async () => {
    await render(
      <BottomSheetModalProvider>
        <FilterToolbar
          data={mockData}
          searchKeys={["name"]}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        >
          {(filtered) => (
            <View>
              {filtered.map((i) => (
                <Text key={i.id}>{i.name}</Text>
              ))}
            </View>
          )}
        </FilterToolbar>
      </BottomSheetModalProvider>,
    );

    expect(screen.queryByTestId("filter-badge-dot")).toBeNull();
  });

  it("toggles filter pill back to 'All' when re-selected", async () => {
    await render(
      <BottomSheetModalProvider>
        <FilterToolbar
          data={mockData}
          searchKeys={["name"]}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        >
          {(filtered) => (
            <View testID="results">
              {filtered.map((item) => (
                <Text key={item.id}>{item.name}</Text>
              ))}
            </View>
          )}
        </FilterToolbar>
      </BottomSheetModalProvider>,
    );

    // Open filter sheet modal
    await act(() => {
      fireEvent.press(screen.getByTestId("filter-funnel-button"));
    });

    // Select Fruit filter
    await act(() => {
      fireEvent.press(screen.getByText("Fruit"));
    });

    // Verify filter badge dot is now visible
    expect(screen.getByTestId("filter-badge-dot")).toBeTruthy();

    // Re-select Fruit filter (should shift filter back to 'All')
    await act(() => {
      fireEvent.press(screen.getByText("Fruit"));
    });

    // Verify filter badge dot is hidden again
    expect(screen.queryByTestId("filter-badge-dot")).toBeNull();
  });

  it("deselects active sort option when re-selected", async () => {
    await render(
      <BottomSheetModalProvider>
        <FilterToolbar
          data={mockData}
          searchKeys={["name"]}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
        >
          {(filtered) => (
            <View testID="results">
              {filtered.map((item) => (
                <Text key={item.id}>{item.name}</Text>
              ))}
            </View>
          )}
        </FilterToolbar>
      </BottomSheetModalProvider>,
    );

    // Open filter sheet modal
    await act(() => {
      fireEvent.press(screen.getByTestId("filter-funnel-button"));
    });

    // Select Name (Z-A) sort option
    await act(() => {
      fireEvent.press(screen.getByText("Name (Z-A)"));
    });

    // Verify badge dot is visible for non-default sort
    expect(screen.getByTestId("filter-badge-dot")).toBeTruthy();

    // Re-select Name (Z-A) sort option (should deselect it)
    await act(() => {
      fireEvent.press(screen.getByText("Name (Z-A)"));
    });

    // Verify badge dot is hidden
    expect(screen.queryByTestId("filter-badge-dot")).toBeNull();
  });
});
