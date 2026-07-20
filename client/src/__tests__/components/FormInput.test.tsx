import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { FormInput } from "../../components/shared/FormInput";

describe("FormInput", () => {
  it("renders the label", async () => {
    await render(
      <FormInput label="Product Name" value="" onChangeText={jest.fn()} />,
    );
    expect(screen.getByText("Product Name")).toBeTruthy();
  });

  it("renders the placeholder", async () => {
    await render(
      <FormInput
        label="Name"
        value=""
        onChangeText={jest.fn()}
        placeholder="Enter name"
      />,
    );
    expect(screen.getByPlaceholderText("Enter name")).toBeTruthy();
  });

  it("displays the current value", async () => {
    const { getByPlaceholderText } = await render(
      <FormInput
        label="Name"
        value="Widget"
        onChangeText={jest.fn()}
        placeholder="Name"
      />,
    );
    // The TextInput's value prop should be "Widget"
    const input = screen.getByPlaceholderText("Name");
    expect(input.props.value).toBe("Widget");
  });

  it("calls onChangeText when user types", async () => {
    const onChangeText = jest.fn();
    await render(
      <FormInput
        label="Name"
        value=""
        onChangeText={onChangeText}
        placeholder="Name"
      />,
    );

    await act(() => {
      fireEvent.changeText(screen.getByPlaceholderText("Name"), "New Value");
    });

    expect(onChangeText).toHaveBeenCalledWith("New Value");
    expect(onChangeText).toHaveBeenCalledTimes(1);
  });

  it("shows error message when provided", async () => {
    await render(
      <FormInput
        label="Name"
        value=""
        onChangeText={jest.fn()}
        error="Name is required"
      />,
    );
    expect(screen.getByText("Name is required")).toBeTruthy();
  });

  it("does not show error when not provided", async () => {
    await render(
      <FormInput label="Name" value="" onChangeText={jest.fn()} />,
    );
    expect(screen.queryByText("Name is required")).toBeNull();
  });

  it("shows required asterisk when required is true", async () => {
    await render(
      <FormInput
        label="Name"
        value=""
        onChangeText={jest.fn()}
        required
      />,
    );
    expect(screen.getByText("*")).toBeTruthy();
  });

  it("renders multiline input when multiline is true", async () => {
    await render(
      <FormInput
        label="Description"
        value=""
        onChangeText={jest.fn()}
        multiline
        placeholder="Description"
      />,
    );
    const input = screen.getByPlaceholderText("Description");
    expect(input.props.multiline).toBe(true);
  });

  it("calls onBlur when input loses focus", async () => {
    const onBlur = jest.fn();
    await render(
      <FormInput
        label="Name"
        value=""
        onChangeText={jest.fn()}
        onBlur={onBlur}
        placeholder="Name"
      />,
    );

    await act(() => {
      fireEvent(screen.getByPlaceholderText("Name"), "blur");
    });

    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
