import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { FormSelect } from "../../components/shared/FormSelect";

const sampleOptions = [
  { label: "Option A", value: "a" },
  { label: "Option B", value: "b" },
  { label: "Option C", value: "c" },
];

describe("FormSelect", () => {
  it("renders the label", async () => {
    await render(
      <FormSelect
        label="Category"
        value=""
        onChange={jest.fn()}
        options={sampleOptions}
      />,
    );
    expect(screen.getByText("Category")).toBeTruthy();
  });

  it("renders the placeholder when no value is selected", async () => {
    await render(
      <FormSelect
        label="Category"
        value=""
        onChange={jest.fn()}
        options={sampleOptions}
        placeholder="Choose..."
      />,
    );
    expect(screen.getByText("Choose...")).toBeTruthy();
  });

  it("renders the selected option label when a value is selected", async () => {
    await render(
      <FormSelect
        label="Category"
        value="b"
        onChange={jest.fn()}
        options={sampleOptions}
        placeholder="Choose..."
      />,
    );
    expect(screen.getByText("Option B")).toBeTruthy();
  });

  it("opens the bottom sheet when the trigger is pressed", async () => {
    const onChange = jest.fn();
    await render(
      <FormSelect
        label="SelectCategory"
        value=""
        onChange={onChange}
        options={sampleOptions}
      />,
    );

    // Press the select trigger
    await act(() => {
      fireEvent.press(screen.getByLabelText("SelectCategory"));
    });

    // The mocked bottom sheet should show the options
    expect(screen.getByText("Option A")).toBeTruthy();
    expect(screen.getByText("Option B")).toBeTruthy();
    expect(screen.getByText("Option C")).toBeTruthy();
  });

  it("calls onChange with the selected value", async () => {
    const onChange = jest.fn();
    await render(
      <FormSelect
        label="Category"
        value=""
        onChange={onChange}
        options={sampleOptions}
      />,
    );

    // Open the sheet
    await act(() => {
      fireEvent.press(screen.getByLabelText("Category"));
    });

    // Select an option
    await act(() => {
      fireEvent.press(screen.getByText("Option A"));
    });

    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("shows error message when provided", async () => {
    await render(
      <FormSelect
        label="Category"
        value=""
        onChange={jest.fn()}
        options={sampleOptions}
        error="Category is required"
      />,
    );
    expect(screen.getByText("Category is required")).toBeTruthy();
  });

  it("shows required asterisk when required is true", async () => {
    await render(
      <FormSelect
        label="Category"
        value=""
        onChange={jest.fn()}
        options={sampleOptions}
        required
      />,
    );
    expect(screen.getByText("*")).toBeTruthy();
  });

  it("shows 'No options available' when options list is empty", async () => {
    await render(
      <FormSelect
        label="Category"
        value=""
        onChange={jest.fn()}
        options={[]}
      />,
    );

    // Open the sheet
    await act(() => {
      fireEvent.press(screen.getByLabelText("Category"));
    });

    expect(screen.getByText("No options available")).toBeTruthy();
  });
});
