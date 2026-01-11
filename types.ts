export function sliceUntilChar(mainString: string, stopChar: string): string {
  const stopIndex = mainString.indexOf(stopChar);

  // Check if the character was found
  if (stopIndex !== -1) {
    // Slice from the start of the string (index 0) up to the stop index
    return mainString.slice(0, stopIndex);
  } else {
    // If the character is not found, you can return the original string
    // or handle the error as appropriate for your application.
    return mainString;
  }
}
